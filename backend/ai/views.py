import json
from typing import Generator
from django.http import StreamingHttpResponse
from django.shortcuts import get_object_or_404
from django.db.models import Q
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.generics import ListAPIView, DestroyAPIView
from rest_framework import status, permissions
from rest_framework.throttling import ScopedRateThrottle

from pets.models import Pet
from .models import SystemPrompt, AIChatSession, AIChatMessage
from .serializers import (
    SystemPromptSerializer,
    AIChatSessionCreateSerializer,
    AIChatStreamRequestSerializer,
    AIChatSessionSerializer,
    AIChatMessageSerializer,
)
from .services import (
    build_pet_context,
    get_active_prompt,
    build_chat_system_prompt,
    build_chat_messages,
    call_deepseek_chat,
)


# ──────────────────────────────────────────────
# Chat API endpoints
# ──────────────────────────────────────────────

class SystemPromptListView(ListAPIView):
    """GET /api/ai/prompts/ — list available system prompts"""
    queryset = SystemPrompt.objects.all().order_by('-is_default', 'name')
    serializer_class = SystemPromptSerializer
    permission_classes = [permissions.IsAuthenticated]


class _GetUserPetMixin:
    """Mixin to fetch a pet with access check for the current user."""
    def get_user_pet(self, pet_id: int) -> Pet:
        from pets.access import pet_access_q
        user = self.request.user
        return get_object_or_404(
            Pet.objects.filter(pet_access_q(user)).distinct(),
            id=pet_id
        )


class AIChatSessionCreateView(APIView, _GetUserPetMixin):
    """
    POST /api/ai/sessions/
    Create a new chat session and send the first message.
    Body: { "pet_id": int, "query": string, "system_prompt_id?": int }
    Returns: { "session": {...}, "message": {...} }
    """
    permission_classes = [permissions.IsAuthenticated]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'ai'

    def post(self, request, *args, **kwargs):
        serializer = AIChatSessionCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        pet_id = serializer.validated_data['pet_id']
        query = serializer.validated_data['query']
        prompt_id = serializer.validated_data.get('system_prompt_id')

        pet = self.get_user_pet(pet_id)

        # Get the system prompt
        try:
            prompt = get_active_prompt(prompt_id)
        except ValueError as e:
            return Response(
                {
                    "error": str(e),
                    "code": "system_prompt_missing",
                    "hint": "Run `python manage.py seed_prompts --ensure-default` or create a SystemPrompt in the admin panel and mark it as default.",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Build pet context
        pet_context = build_pet_context(pet)
        system_prompt_text = build_chat_system_prompt(prompt.content, pet_context)

        # Create session
        # Title = first 120 chars of query
        title = query.strip()[:120]
        if len(query.strip()) > 120:
            title += '...'

        session = AIChatSession.objects.create(
            user=request.user,
            pet=pet,
            system_prompt=prompt,
            title=title,
        )

        # Save user message
        user_msg = AIChatMessage.objects.create(
            session=session,
            role=AIChatMessage.Role.USER,
            content=query,
        )

        # Build messages for AI
        messages = build_chat_messages([], system_prompt_text, query)

        try:
            result = call_deepseek_chat(messages, stream=False)
            ai_content = result['content']

            ai_msg = AIChatMessage.objects.create(
                session=session,
                role=AIChatMessage.Role.ASSISTANT,
                content=ai_content,
            )

            # Update session.updated_at
            session.save(update_fields=['updated_at'])

            return Response({
                "session": AIChatSessionSerializer(session, context={'request': request}).data,
                "message": AIChatMessageSerializer(ai_msg, context={'request': request}).data,
            }, status=status.HTTP_201_CREATED)

        except Exception as e:
            # Cleanup on failure
            session.delete()
            return Response(
                {"error": str(e)},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )


class AIChatSessionListView(ListAPIView):
    """GET /api/ai/sessions/ — list user's chat sessions"""
    serializer_class = AIChatSessionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = AIChatSession.objects.filter(
            user=self.request.user,
        ).select_related('pet', 'system_prompt').prefetch_related(
            'pet__categories', 'pet__images', 'messages'
        ).order_by('-updated_at')

        # Optional filter by pet
        pet_id = self.request.query_params.get('pet_id')
        if pet_id:
            qs = qs.filter(pet_id=pet_id)

        return qs


class AIChatMessageListView(ListAPIView):
    """GET /api/ai/sessions/{id}/messages/ — list messages in a session"""
    serializer_class = AIChatMessageSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        session_id = self.kwargs['session_id']
        user = self.request.user

        # Verify ownership
        session = get_object_or_404(
            AIChatSession.objects.filter(user=user),
            id=session_id
        )

        return AIChatMessage.objects.filter(
            session=session
        ).order_by('created_at')


class AIChatSessionDeleteView(DestroyAPIView):
    """DELETE /api/ai/sessions/{id}/ — delete a session + all messages"""
    permission_classes = [permissions.IsAuthenticated]

    # URL использует <int:session_id>, а не <int:pk> — говорим DRF об этом.
    lookup_url_kwarg = 'session_id'

    def get_queryset(self):
        return AIChatSession.objects.filter(user=self.request.user)


# ──────────────────────────────────────────────
# SSE Streaming view
# ──────────────────────────────────────────────

class AIChatStreamView(APIView, _GetUserPetMixin):
    """
    POST /api/ai/sessions/{id}/stream/
    Send a message and stream the AI response via Server-Sent Events.
    Body: { "query": string }
    Returns: text/event-stream
    """
    permission_classes = [permissions.IsAuthenticated]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'ai'

    def post(self, request, session_id, *args, **kwargs):
        serializer = AIChatStreamRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        query = serializer.validated_data['query']

        # Verify session ownership
        session = get_object_or_404(
            AIChatSession.objects.filter(user=request.user),
            id=session_id
        )

        # Build pet context (fresh each time)
        pet_context = build_pet_context(session.pet)

        # Get system prompt text
        if session.system_prompt:
            prompt_text = session.system_prompt.content
        else:
            try:
                prompt = get_active_prompt()
                prompt_text = prompt.content
            except ValueError as e:
                return Response(
                    {"error": str(e)},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        system_prompt_text = build_chat_system_prompt(prompt_text, pet_context)

        # Get existing messages for history
        existing_messages = list(
            session.messages.order_by('created_at')
        )
        messages_for_ai = build_chat_messages(existing_messages, system_prompt_text, query)

        # Save user message
        AIChatMessage.objects.create(
            session=session,
            role=AIChatMessage.Role.USER,
            content=query,
        )

        # Generate SSE response
        def sse_event_stream() -> Generator[str, None, None]:
            full_response = ""
            try:
                token_gen = call_deepseek_chat(messages_for_ai, stream=True)
                for token in token_gen:
                    full_response += token
                    # SSE format: "data: {json}\n\n"
                    event_data = json.dumps({"token": token})
                    yield f"data: {event_data}\n\n"

                # Save the full AI response
                ai_msg = AIChatMessage.objects.create(
                    session=session,
                    role=AIChatMessage.Role.ASSISTANT,
                    content=full_response,
                )
                session.save(update_fields=['updated_at'])

                # Signal completion
                done_data = json.dumps({
                    "done": True,
                    "message_id": ai_msg.id,
                })
                yield f"data: {done_data}\n\n"

            except Exception as e:
                error_data = json.dumps({
                    "error": str(e),
                    "done": True,
                })
                yield f"data: {error_data}\n\n"

        response = StreamingHttpResponse(
            sse_event_stream(),
            content_type='text/event-stream',
            status=200,
        )
        response['Cache-Control'] = 'no-cache'
        response['X-Accel-Buffering'] = 'no'
        response['Connection'] = 'keep-alive'
        return response