from django.urls import path
from .views import (
    AIConsultView,
    SystemPromptListView,
    AIChatSessionCreateView,
    AIChatSessionListView,
    AIChatMessageListView,
    AIChatSessionDeleteView,
    AIChatStreamView,
)

urlpatterns = [
    # Legacy
    path('consult/', AIConsultView.as_view(), name='ai-consult'),

    # Prompts
    path('prompts/', SystemPromptListView.as_view(), name='ai-prompts-list'),

    # Sessions — list and create
    path('sessions/', AIChatSessionCreateView.as_view(), name='ai-session-create'),
    path('sessions/list/', AIChatSessionListView.as_view(), name='ai-sessions-list'),

    # Session detail
    path('sessions/<int:session_id>/', AIChatSessionDeleteView.as_view(), name='ai-session-delete'),
    path('sessions/<int:session_id>/messages/', AIChatMessageListView.as_view(), name='ai-session-messages'),
    path('sessions/<int:session_id>/stream/', AIChatStreamView.as_view(), name='ai-session-stream'),
]
