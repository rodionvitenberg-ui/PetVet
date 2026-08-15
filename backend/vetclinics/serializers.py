from rest_framework import serializers
from .models import VetClinic, ClinicMember, ClinicInvite, ExamTemplate


class VetClinicSerializer(serializers.ModelSerializer):
    is_admin = serializers.SerializerMethodField()
    members_count = serializers.SerializerMethodField()

    class Meta:
        model = VetClinic
        fields = [
            'id', 'name', 'address', 'phone', 'email',
            'description', 'is_active', 'is_admin',
            'members_count', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_by', 'is_admin', 'members_count', 'created_at', 'updated_at']

    def get_is_admin(self, obj):
        request = self.context.get('request')
        if request and hasattr(request, 'user'):
            return obj.memberships.filter(
                user=request.user, role=ClinicMember.Role.ADMIN
            ).exists()
        return False

    def get_members_count(self, obj):
        return obj.memberships.count()


class ClinicMemberSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source='user.username', read_only=True)
    first_name = serializers.CharField(source='user.first_name', read_only=True)
    last_name = serializers.CharField(source='user.last_name', read_only=True)
    email = serializers.CharField(source='user.email', read_only=True)
    is_veterinarian = serializers.BooleanField(source='user.is_veterinarian', read_only=True)

    class Meta:
        model = ClinicMember
        fields = [
            'id', 'user', 'username', 'first_name', 'last_name',
            'email', 'is_veterinarian', 'role', 'joined_at'
        ]
        read_only_fields = ['id', 'joined_at', 'clinic']


class ClinicCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = VetClinic
        fields = ['name', 'address', 'phone', 'email', 'description']


class ClinicInviteSerializer(serializers.ModelSerializer):
    class Meta:
        model = ClinicInvite
        fields = ['id', 'token', 'is_used', 'created_at', 'expires_at']
        read_only_fields = ['id', 'token', 'created_at']


class ExamTemplateSerializer(serializers.ModelSerializer):
    class Meta:
        model = ExamTemplate
        fields = ['id', 'clinic', 'name', 'category', 'default_fields', 'is_active', 'created_at', 'updated_at']
        read_only_fields = ['id', 'clinic', 'created_by', 'created_at', 'updated_at']


class ExamTemplateCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = ExamTemplate
        fields = ['name', 'category', 'default_fields', 'is_active']


class JoinClinicSerializer(serializers.Serializer):
    token = serializers.CharField(required=True, max_length=64)
