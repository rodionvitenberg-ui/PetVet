import json
import requests
from datetime import date
from typing import Generator
from django.conf import settings
from pets.models import Pet, PetEvent
from .models import SystemPrompt


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