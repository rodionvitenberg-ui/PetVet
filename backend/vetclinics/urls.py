from django.urls import path
from .views import (
    ClinicListCreateView,
    ClinicDetailView,
    ClinicMemberListView,
    ClinicMemberRemoveView,
    ClinicInviteCreateView,
    ClinicJoinView,
    ExamTemplateListCreateView,
    ExamTemplateDetailView,
)

urlpatterns = [
    path('', ClinicListCreateView.as_view(), name='clinic-list-create'),
    path('<int:pk>/', ClinicDetailView.as_view(), name='clinic-detail'),
    path('<int:clinic_id>/members/', ClinicMemberListView.as_view(), name='clinic-members'),
    path('<int:clinic_id>/members/<int:user_id>/', ClinicMemberRemoveView.as_view(), name='clinic-member-remove'),
    path('<int:clinic_id>/invite/', ClinicInviteCreateView.as_view(), name='clinic-invite'),
    path('join/', ClinicJoinView.as_view(), name='clinic-join'),

    # Exam Templates — nested под клиникой: /clinic/{id}/templates/{pk}/
    path('<int:clinic_id>/templates/', ExamTemplateListCreateView.as_view(), name='clinic-templates'),
    path('<int:clinic_id>/templates/<int:pk>/', ExamTemplateDetailView.as_view(), name='clinic-template-detail'),
]
