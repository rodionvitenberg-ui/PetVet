import uuid
from datetime import datetime, timedelta
from django.shortcuts import get_object_or_404
from django.db import IntegrityError
from rest_framework.views import APIView
from rest_framework.generics import ListCreateAPIView, RetrieveUpdateDestroyAPIView
from rest_framework.response import Response
from rest_framework import status, permissions

from .models import VetClinic, ClinicMember, ClinicInvite, ExamTemplate
from .serializers import (
    VetClinicSerializer, ClinicCreateSerializer,
    ClinicMemberSerializer, ClinicInviteSerializer,
    ExamTemplateSerializer, ExamTemplateCreateSerializer,
    JoinClinicSerializer,
)


class ClinicListCreateView(ListCreateAPIView):
    """GET /api/clinics/ — list user's clinics. POST — create a clinic (vet only)."""
    permission_classes = [permissions.IsAuthenticated]

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return ClinicCreateSerializer
        return VetClinicSerializer

    def get_queryset(self):
        user = self.request.user
        return VetClinic.objects.filter(
            memberships__user=user, is_active=True
        ).distinct().prefetch_related('memberships')

    def perform_create(self, serializer):
        clinic = serializer.save(created_by=self.request.user)
        # Creator becomes admin automatically
        ClinicMember.objects.create(
            clinic=clinic,
            user=self.request.user,
            role=ClinicMember.Role.ADMIN
        )


class ClinicDetailView(RetrieveUpdateDestroyAPIView):
    """GET/PATCH/DELETE /api/clinics/{id}/ — view/edit/delete a clinic."""
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        return VetClinic.objects.filter(
            memberships__user=user, is_active=True
        ).distinct().prefetch_related('memberships')

    def get_serializer_class(self):
        if self.request.method in ('PATCH', 'PUT'):
            return ClinicCreateSerializer
        return VetClinicSerializer

    def check_object_permissions(self, request, obj):
        super().check_object_permissions(request, obj)
        # Only admin can PATCH/DELETE
        if request.method in ('PATCH', 'PUT', 'DELETE'):
            is_admin = obj.memberships.filter(
                user=request.user, role=ClinicMember.Role.ADMIN
            ).exists()
            if not is_admin:
                self.permission_denied(
                    request, message="Only clinic admin can modify the clinic."
                )

    def perform_destroy(self, instance):
        instance.is_active = False
        instance.save()


class ClinicMemberListView(APIView):
    """GET /api/clinics/{id}/members/ — list members of a clinic."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, clinic_id):
        clinic = get_object_or_404(
            VetClinic.objects.filter(memberships__user=request.user, is_active=True),
            id=clinic_id
        )
        members = ClinicMember.objects.filter(clinic=clinic).select_related('user')
        serializer = ClinicMemberSerializer(members, many=True)
        return Response(serializer.data)


class ClinicMemberRemoveView(APIView):
    """DELETE /api/clinics/{id}/members/{user_id}/ — remove a member (admin only)."""
    permission_classes = [permissions.IsAuthenticated]

    def delete(self, request, clinic_id, user_id):
        clinic = get_object_or_404(
            VetClinic.objects.filter(memberships__user=request.user, is_active=True),
            id=clinic_id
        )
        # Check admin
        is_admin = clinic.memberships.filter(
            user=request.user, role=ClinicMember.Role.ADMIN
        ).exists()
        if not is_admin:
            return Response(
                {"error": "Only clinic admin can remove members."},
                status=status.HTTP_403_FORBIDDEN
            )

        # Cannot remove self
        if int(user_id) == request.user.id:
            return Response(
                {"error": "You cannot remove yourself. Transfer admin first or delete the clinic."},
                status=status.HTTP_400_BAD_REQUEST
            )

        membership = get_object_or_404(
            ClinicMember, clinic=clinic, user_id=user_id
        )
        membership.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class ClinicInviteCreateView(APIView):
    """POST /api/clinics/{id}/invite/ — generate an invite link (admin only)."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, clinic_id):
        clinic = get_object_or_404(
            VetClinic.objects.filter(memberships__user=request.user, is_active=True),
            id=clinic_id
        )
        # Check admin
        is_admin = clinic.memberships.filter(
            user=request.user, role=ClinicMember.Role.ADMIN
        ).exists()
        if not is_admin:
            return Response(
                {"error": "Only clinic admin can invite members."},
                status=status.HTTP_403_FORBIDDEN
            )

        invite = ClinicInvite.objects.create(
            clinic=clinic,
            token=uuid.uuid4().hex,
            created_by=request.user,
            expires_at=datetime.now() + timedelta(days=7),
        )

        serializer = ClinicInviteSerializer(invite)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class ExamTemplateListCreateView(ListCreateAPIView):
    """GET /api/clinics/{clinic_id}/templates/ — list/create templates for a clinic."""
    permission_classes = [permissions.IsAuthenticated]

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return ExamTemplateCreateSerializer
        return ExamTemplateSerializer

    def get_queryset(self):
        clinic_id = self.kwargs['clinic_id']
        # Verify user is a member of this clinic
        get_object_or_404(
            VetClinic.objects.filter(memberships__user=self.request.user, is_active=True),
            id=clinic_id
        )
        return ExamTemplate.objects.filter(
            clinic_id=clinic_id, is_active=True
        ).order_by('category', 'name')

    def perform_create(self, serializer):
        clinic_id = self.kwargs['clinic_id']
        clinic = get_object_or_404(
            VetClinic.objects.filter(memberships__user=self.request.user, is_active=True),
            id=clinic_id
        )
        serializer.save(clinic=clinic, created_by=self.request.user)


class ExamTemplateDetailView(RetrieveUpdateDestroyAPIView):
    """GET/PATCH/DELETE /api/clinics/templates/{id}/ — update/delete a template."""
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return ExamTemplate.objects.filter(
            clinic__memberships__user=self.request.user,
            clinic__is_active=True,
            is_active=True
        )

    def get_serializer_class(self):
        if self.request.method in ('PATCH', 'PUT'):
            return ExamTemplateCreateSerializer
        return ExamTemplateSerializer

    def perform_destroy(self, instance):
        instance.is_active = False
        instance.save()


class ClinicJoinView(APIView):
    """POST /api/clinics/join/ — join a clinic using an invite token."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = JoinClinicSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        token = serializer.validated_data['token']
        invite = get_object_or_404(
            ClinicInvite,
            token=token,
            is_used=False,
        )

        if invite.expires_at and invite.expires_at < datetime.now():
            return Response(
                {"error": "This invite has expired."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Check user is a veterinarian
        if not request.user.is_veterinarian:
            return Response(
                {"error": "Only veterinarians can join a clinic."},
                status=status.HTTP_403_FORBIDDEN
            )

        try:
            ClinicMember.objects.create(
                clinic=invite.clinic,
                user=request.user,
                role=ClinicMember.Role.MEMBER,
            )
        except IntegrityError:
            return Response(
                {"error": "You are already a member of this clinic."},
                status=status.HTTP_409_CONFLICT
            )

        invite.is_used = True
        invite.save()

        return Response(
            {"message": f"You've joined {invite.clinic.name}."},
            status=status.HTTP_200_OK,
        )