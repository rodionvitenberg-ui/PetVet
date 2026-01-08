from rest_framework import serializers
from django.contrib.auth import get_user_model
from rest_framework.validators import UniqueValidator
from django.contrib.auth.password_validation import validate_password

User = get_user_model()

# --- ЭТОТ КЛАСС МЫ ДОБАВИЛИ ---
class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        # Оставляем только те поля, которые ЖЕЛЕЗНО есть у любого юзера Django
        # Если у тебя кастомная модель, добавь остальные поля позже по одному
        fields = ['id', 'username', 'email', 'first_name', 'last_name']

# --- СТАРЫЙ КОД ОСТАВЛЯЕМ БЕЗ ИЗМЕНЕНИЙ ---
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