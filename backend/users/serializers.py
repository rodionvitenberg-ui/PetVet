from rest_framework import serializers
from django.contrib.auth import get_user_model
from rest_framework.validators import UniqueValidator
from django.contrib.auth.password_validation import validate_password
from rest_framework.exceptions import AuthenticationFailed
from django.utils.crypto import get_random_string # <-- Важный импорт

# Импорты для Google
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests
from django.conf import settings

User = get_user_model()

class UserSerializer(serializers.ModelSerializer):
    role = serializers.SerializerMethodField()
    # Добавляем поле пароля, чтобы его можно было прислать при обновлении (write_only)
    password = serializers.CharField(write_only=True, required=False, validators=[validate_password])

    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name', 
            'is_veterinarian', 'role',  
            'phone', 'city', 'clinic_name', 'avatar',
            'is_verified', 'password' # <-- Добавили password
        ]
        read_only_fields = ['id', 'email', 'username', 'is_verified']

    def get_role(self, obj):
        return "vet" if obj.is_veterinarian else "owner"
    
    def update(self, instance, validated_data):
        # Если прислали пароль — хешируем и сохраняем
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
            
            # ИСПРАВЛЕНИЕ: используем get_random_string вместо make_random_password
            random_password = get_random_string(length=32)
            
            user = User.objects.create_user(
                username=username,
                email=email,
                password=random_password, # Временный пароль, пользователь сменит его на онбординге
                first_name=id_info.get('given_name', ''),
                last_name=id_info.get('family_name', ''),
                is_veterinarian=False
            )
            is_new = True
        
        attrs['user'] = user
        attrs['is_new'] = is_new
        return attrs


class UserRegistrationSerializer(serializers.ModelSerializer):
    email = serializers.EmailField(
        required=True,
        validators=[UniqueValidator(queryset=User.objects.all())]
    )
    password = serializers.CharField(write_only=True, required=True, validators=[validate_password])
    confirm_password = serializers.CharField(write_only=True, required=True)
    
    role = serializers.ChoiceField(choices=['owner', 'vet'], write_only=True)

    class Meta:
        model = User
        fields = [
            'username', 'email', 'password', 'confirm_password', 'role',
            'first_name', 'last_name', 'phone', 'city', 'clinic_name'
        ]

    def validate(self, attrs):
        if attrs['password'] != attrs['confirm_password']:
            raise serializers.ValidationError({"password": "Пароли не совпадают"})

        if attrs.get('role') == 'vet':
            if not attrs.get('clinic_name'):
                raise serializers.ValidationError({"clinic_name": "Для регистрации врача укажите название клиники."})
            if not attrs.get('city'):
                raise serializers.ValidationError({"city": "Для регистрации врача укажите город."})
        
        return attrs

    def create(self, validated_data):
        validated_data.pop('confirm_password')
        role = validated_data.pop('role')
        is_vet = (role == 'vet')
        
        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data['email'],
            password=validated_data['password'],
            first_name=validated_data.get('first_name', ''),
            last_name=validated_data.get('last_name', ''),
            phone=validated_data.get('phone', ''),
            city=validated_data.get('city', ''),
            clinic_name=validated_data.get('clinic_name', ''),
            is_veterinarian=is_vet,
        )
        return user