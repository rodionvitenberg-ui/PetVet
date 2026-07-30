import os
import base64
import json
import re
import requests
from datetime import date
from typing import Generator
from django.conf import settings
from pets.models import Pet, PetEvent, PetImage
from .models import SystemPrompt


def encode_image_base64(image_field) -> str | None:
    """
    Given a Django ImageFieldFile, read the file and return a base64 data-URI.
    Returns None if the file doesn't exist or can't be read.
    """
    try:
        if not image_field or not image_field.name:
            return None
        with image_field.open('rb') as f:
            raw = f.read()
            ext = os.path.splitext(image_field.name)[1].lower()
            mime = {
                '.jpg': 'image/jpeg',
                '.jpeg': 'image/jpeg',
                '.png': 'image/png',
                '.gif': 'image/gif',
                '.webp': 'image/webp',
            }.get(ext, 'image/jpeg')
            b64 = base64.b64encode(raw).decode('utf-8')
            return f"data:{mime};base64,{b64}"
    except Exception:
        return None


def build_pet_context(pet: Pet) -> str:
    """
    Build a textual description of the pet for the AI prompt.
    EXCLUDES all personal/confidential data: owner name, phone, email,
    clinic name, temp_owner info, address, etc.
    """
    lines = []
    lines.append("=== PATIENT ===")

    # Basic info (safe to share)
    lines.append(f"Name: {pet.name}")

    species_cat = next((c for c in pet.categories.all() if c.parent is None), None)
    breed_cat = next((c for c in pet.categories.all() if c.parent is not None), None)
    species = species_cat.name if species_cat else "Unknown"
    breed = breed_cat.name if breed_cat else "Unknown"
    lines.append(f"Species: {species}")
    lines.append(f"Breed: {breed}")

    lines.append(f"Sex: {'Male' if pet.gender == 'M' else 'Female'}")

    # Age (safe)
    if pet.birth_date:
        today = date.today()
        years = today.year - pet.birth_date.year - (
            (today.month, today.day) < (pet.birth_date.month, pet.birth_date.day)
        )
        if years == 0:
            months = (today.year - pet.birth_date.year) * 12 + today.month - pet.birth_date.month
            lines.append(f"Age: {months} mo")
        else:
            lines.append(f"Age: {years} yr")
    else:
        lines.append("Age: Unknown")

    # Reproductive / tag info (safe)
    tags_list = [t.name.lower() for t in pet.tags.all()]
    is_neutered = any(term in tags_list for term in ['neutered', 'spayed'])
    rep_status = "NEUTERED/SPAYED" if is_neutered else "INTACT"
    lines.append(f"Reproductive Status: {rep_status}")

    # Traits
    if tags_list:
        lines.append(f"Traits: {', '.join(tags_list)}")

    lines.append("")

    # Attributes (physiology)
    lines.append("=== PHYSIOLOGY ===")
    attr_list = []
    for pa in pet.attributes.all():
        unit = pa.attribute.unit or ''
        attr_list.append(f"{pa.attribute.name}: {pa.value} {unit}".strip())
    lines.append('; '.join(attr_list) if attr_list else "No data")

    lines.append("")

    # Medical history (events - safe)
    lines.append("=== MEDICAL HISTORY ===")
    last_events = PetEvent.objects.filter(
        pet=pet,
        event_type__category__in=['medical', 'reproduction', 'surgery', 'parasite']
    ).select_related('event_type').order_by('-date')[:10]

    if last_events.exists():
        for ev in last_events:
            date_str = ev.date.strftime('%m/%d/%Y')
            type_name = ev.event_type.name
            desc = ev.description or ''
            lines.append(f"- {date_str} [{type_name}]: {ev.title}. {desc}")
    else:
        lines.append("No medical history records.")

    return '\n'.join(lines)


def build_images_list(pet: Pet) -> list[str]:
    """
    Return a list of base64 data-URIs for all PetImages of the pet.
    NOTE: DeepSeek Chat does NOT support images. This function is kept
    for future multimodal models. For now it returns an empty list.
    """
    return []


def _extract_json_from_text(text: str) -> dict | None:
    """
    Try to extract a JSON object from the model's response text.
    DeepSeek may wrap JSON in markdown code blocks or add extra text.
    """
    # Try to find a JSON block inside ```json ... ``` markers
    json_match = re.search(r'```(?:json)?\s*(\{.*?\})\s*```', text, re.DOTALL)
    if json_match:
        try:
            return json.loads(json_match.group(1))
        except json.JSONDecodeError:
            pass

    # Try to parse the entire text as JSON
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass

    # Try to find anything that looks like { ... } with urgency/title/content
    obj_match = re.search(r'(\{(?:[^{}]|(?:\{[^{}]*\}))*\})', text, re.DOTALL)
    if obj_match:
        try:
            candidate = json.loads(obj_match.group(1))
            if 'urgency' in candidate or 'title' in candidate or 'content' in candidate:
                return candidate
        except json.JSONDecodeError:
            pass

    return None


def get_active_prompt(prompt_id: int | None = None) -> SystemPrompt | None:
    """
    Return the active SystemPrompt. If prompt_id is given, return that
    specific prompt. Otherwise return the one marked is_default=True.
    Raises ValueError if no prompt exists.
    """
    if prompt_id is not None:
        return SystemPrompt.objects.filter(id=prompt_id).first()

    prompt = SystemPrompt.objects.filter(is_default=True).first()
    if prompt is None:
        # Fallback: return the most recently updated prompt
        prompt = SystemPrompt.objects.order_by('-updated_at').first()
    if prompt is None:
        raise ValueError(
            "No SystemPrompt configured. Create one via admin panel "
            "and mark it as default."
        )
    return prompt


def build_chat_system_prompt(prompt_text: str, pet_context: str) -> str:
    """
    Render the system prompt template by inserting pet_context.
    """
    return prompt_text.replace('{pet_context}', pet_context)


def build_chat_messages(
    session_messages: list,
    system_prompt: str,
    user_query: str
) -> list[dict]:
    """
    Build the messages array for DeepSeek API from session history,
    system prompt, and new user query.
    """
    messages = [
        {"role": "system", "content": system_prompt},
    ]

    # Add existing conversation history
    for msg in session_messages:
        messages.append({
            "role": msg.role,
            "content": msg.content,
        })

    # Add the new user query
    messages.append({"role": "user", "content": user_query})

    return messages


def call_deepseek_chat(
    messages: list[dict],
    stream: bool = False
) -> dict | Generator[str, None, None]:
    """
    Send a chat request to the DeepSeek API.

    If stream=False: returns full response dict {"content": str}
    If stream=True: returns a generator that yields content token strings
    """
    api_key = getattr(settings, 'DEEPSEEK_API_KEY', None)
    model = getattr(settings, 'DEEPSEEK_MODEL', 'deepseek-chat')
    endpoint = 'https://api.deepseek.com/v1/chat/completions'

    if not api_key:
        raise ValueError("DEEPSEEK_API_KEY is not configured")

    payload = {
        "model": model,
        "messages": messages,
        "temperature": 0.3,
        "max_tokens": 2000,
        "stream": stream,
    }

    try:
        resp = requests.post(
            endpoint,
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            },
            json=payload,
            timeout=90 if stream else 60,
            stream=stream,
        )
        resp.raise_for_status()

        if not stream:
            data = resp.json()
            content = data['choices'][0]['message']['content']
            return {"content": content.strip()}
        else:
            # Return a generator for SSE streaming
            def token_generator():
                for line in resp.iter_lines(decode_unicode=True):
                    if line and line.startswith('data: '):
                        data_str = line[6:]  # strip "data: " prefix
                        if data_str == '[DONE]':
                            break
                        try:
                            chunk = json.loads(data_str)
                            delta = chunk.get('choices', [{}])[0].get('delta', {})
                            content = delta.get('content', '')
                            if content:
                                yield content
                        except (json.JSONDecodeError, KeyError, IndexError):
                            continue
            return token_generator()

    except requests.RequestException as e:
        raise RuntimeError(f"DeepSeek API call failed: {e}")


def call_deepseek(system_prompt: str, user_query: str, images: list[str] | None = None) -> dict:
    """
    Send a request to the DeepSeek API and return parsed JSON.
    DeepSeek does NOT support response_format="json_object" (OpenAI-only)
    and does NOT support multimodal images.
    Returns: { "urgency": "low"|"medium"|"high", "title": "...", "content": "..." }
    """
    api_key = getattr(settings, 'DEEPSEEK_API_KEY', None)
    model = getattr(settings, 'DEEPSEEK_MODEL', 'deepseek-chat')
    endpoint = 'https://api.deepseek.com/v1/chat/completions'

    if not api_key:
        raise ValueError("DEEPSEEK_API_KEY is not configured")

    # Build the user message — instruct the model to return only JSON inside the text
    text_payload = (
        f"Analyze the following pet profile and answer the owner's question.\n\n"
        f"{system_prompt}\n\n"
        f"Owner's question: {user_query}\n\n"
        f"IMPORTANT: Reply with ONLY a valid JSON object, no markdown wrapping, "
        f"no explanation, just raw JSON. Format:\n"
        f'{{"urgency": "low"|"medium"|"high", "title": "Short summary (max 100 chars)", '
        f'"content": "Detailed analysis"}}'
    )

    messages = [
        {
            "role": "system",
            "content": "You are a veterinary AI assistant. Always respond with valid JSON only.",
        },
        {
            "role": "user",
            "content": text_payload,
        },
    ]

    payload = {
        "model": model,
        "messages": messages,
        "temperature": 0.3,
        "max_tokens": 2000,
    }

    try:
        resp = requests.post(
            endpoint,
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            },
            json=payload,
            timeout=30,
        )
        resp.raise_for_status()
        data = resp.json()
        content = data['choices'][0]['message']['content']

        # Try to extract JSON from the response text
        parsed = _extract_json_from_text(content)

        if parsed is None:
            # Fallback: return the raw text as content
            return {
                "urgency": "low",
                "title": "AI Analysis",
                "content": content.strip(),
            }

        # Validate and sanitize
        urgency = parsed.get('urgency', 'low')
        if urgency not in ('low', 'medium', 'high'):
            urgency = 'low'

        return {
            "urgency": urgency,
            "title": parsed.get('title', 'AI Analysis')[:200],
            "content": parsed.get('content', 'No analysis available.'),
        }

    except requests.RequestException as e:
        raise RuntimeError(f"DeepSeek API call failed: {e}")