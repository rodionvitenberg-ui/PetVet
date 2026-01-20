from rest_framework import serializers
from django.contrib.auth import get_user_model
from rest_framework.validators import UniqueValidator
from django.contrib.auth.password_validation import validate_password
from rest_framework.exceptions import AuthenticationFailed
from django.utils.crypto import get_random_string 
from .models import User, UserContact, VetVerificationRequest
# Импорты для Google
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests
from django.conf import settings

User = get_user_model()

class UserContactSerializer(serializers.ModelSerializer):
    type_display = serializers.CharField(source='get_type_display', read_only=True)
    
    class Meta:
        model = UserContact
        fields = ['id', 'type', 'type_display', 'value', 'label']

class UserSerializer(serializers.ModelSerializer):
    role = serializers.SerializerMethodField()
    password = serializers.CharField(write_only=True, required=False, validators=[validate_password])
    
    # [FIX] Добавили явное определение поля contacts
    contacts = UserContactSerializer(many=True, read_only=True)

    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name', 
            'is_veterinarian', 'role',
            'phone', 'work_phone', 'telegram', 'about', 
            'contacts', # Поле включено в список
            'city', 'clinic_name', 'avatar',
            'is_verified', 'password'
        ]
        read_only_fields = ['id', 'email', 'username', 'is_verified']

    def get_role(self, obj):
        return "vet" if obj.is_veterinarian else "owner"
    
    def update(self, instance, validated_data):
        password = validated_data.pop('password', None)
        if password:
            instance.set_password(password)
        
        return super().update(instance, validated_data)


class GoogleAuthSerializer(serializers.Serializer):
    token = serializers.CharField(required=True)

    def validate(self, attrs):
        token = attrs.get('token')
        
        try:
            CLIENT_ID = getattr(settings, 'GOOGLE_CLIENT_ID', None) 
            id_info = id_token.verify_oauth2_token(
                token, 
                google_requests.Request(), 
                audience=CLIENT_ID
            )
        except ValueError as e:
            raise AuthenticationFailed(f'Неверный токен Google: {e}')

        email = id_info.get('email')
        if not email:
            raise AuthenticationFailed('Google не предоставил email')

        try:
            user = User.objects.get(email=email)
            is_new = False
        except User.DoesNotExist:
            username_base = email.split('@')[0]
            counter = 1
            username = username_base
            while User.objects.filter(username=username).exists():
                username = f"{username_base}{counter}"
                counter += 1
            
            random_password = get_random_string(length=32)
            
            user = User.objects.create_user(
                username=username,
                email=email,
                password=random_password, 
                first_name=id_info.get('given_name', ''),
                last_name=id_info.get('family_name', ''),
                is_veterinarian=False
            )
            is_new = True
        
        attrs['user'] = user
        attrs['is_new'] = is_new
        return attrs


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(
        write_only=True, 
        required=True, 
        validators=[validate_password],
        style={'input_type': 'password'}
    )
    
    class Meta:
        model = User
        fields = ('id', 'username', 'email', 'password', 'first_name', 'last_name')
        extra_kwargs = {
            'email': {'required': True},
            'first_name': {'required': False},
            'last_name': {'required': False},
        }

    def create(self, validated_data):
        # Создаем пользователя, но делаем его неактивным
        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data['email'],
            password=validated_data['password'],
            first_name=validated_data.get('first_name', ''),
            last_name=validated_data.get('last_name', ''),
            # ВАЖНО:
            is_active=False,       # Нельзя войти до подтверждения
            is_veterinarian=False  # Все начинают как обычные юзеры
        )
        return user
    
class PublicProfileSerializer(serializers.ModelSerializer):
    name = serializers.SerializerMethodField()
    contacts = UserContactSerializer(many=True, read_only=True) 

    class Meta:
        model = User
        fields = [
            'id', 'name', 'email', 
            'contacts', 
            'clinic_name', 'city', 'avatar', 'about',
            'is_veterinarian', 'is_verified'
        ]
    
    def get_name(self, obj):
        name = f"{obj.first_name} {obj.last_name}".strip()
        return name if name else obj.username
    
class VetVerificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = VetVerificationRequest
        fields = ['id', 'document_image', 'status', 'rejection_reason', 'created_at']
        read_only_fields = ['status', 'rejection_reason', 'created_at']