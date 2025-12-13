from rest_framework import serializers
from django.contrib.auth import get_user_model
from rest_framework.validators import UniqueValidator
from django.contrib.auth.password_validation import validate_password

User = get_user_model()

class UserRegistrationSerializer(serializers.ModelSerializer):
    email = serializers.EmailField(
        required=True,
        validators=[UniqueValidator(queryset=User.objects.all())]
    )
    password = serializers.CharField(write_only=True, required=True, validators=[validate_password])
    confirm_password = serializers.CharField(write_only=True, required=True)
    
    # Поле role не сохраняется в БД напрямую, оно нужно для логики
    role = serializers.ChoiceField(choices=['owner', 'vet'], write_only=True)

    class Meta:
        model = User
        fields = [
            'username', 'email', 'password', 'confirm_password', 'role',
            'first_name', 'last_name', 'phone', 'city', 'clinic_name'
        ]

    def validate(self, attrs):
        # 1. Проверка совпадения паролей
        if attrs['password'] != attrs['confirm_password']:
            raise serializers.ValidationError({"password": "Пароли не совпадают"})

        # 2. Логика для Ветеринара
        if attrs.get('role') == 'vet':
            if not attrs.get('clinic_name'):
                raise serializers.ValidationError({"clinic_name": "Для регистрации врача укажите название клиники."})
            if not attrs.get('city'):
                raise serializers.ValidationError({"city": "Для регистрации врача укажите город."})
        
        return attrs

    def create(self, validated_data):
        # Удаляем вспомогательные поля, которых нет в модели User
        validated_data.pop('confirm_password')
        role = validated_data.pop('role')

        # Устанавливаем флаги
        is_vet = (role == 'vet')
        
        # Создаем пользователя через create_user (он хеширует пароль)
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
            is_verified=False # Всегда False при регистрации
        )
        
        return user