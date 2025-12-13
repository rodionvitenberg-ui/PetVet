from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import get_user_model
from .serializers import UserRegistrationSerializer

User = get_user_model()

class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    permission_classes = (AllowAny,) # Разрешаем всем (даже анонимам)
    serializer_class = UserRegistrationSerializer

    def create(self, request, *args, **kwargs):
        # 1. Стандартная валидация через сериализатор
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        # 2. Создание пользователя
        user = serializer.save()

        # 3. Генерация токенов вручную
        refresh = RefreshToken.for_user(user)
        
        # Добавляем кастомные данные в токен (опционально)
        refresh['is_veterinarian'] = user.is_veterinarian

        return Response({
            "user": {
                "username": user.username,
                "email": user.email,
                "role": "vet" if user.is_veterinarian else "owner",
                "id": user.id
            },
            "tokens": {
                "refresh": str(refresh),
                "access": str(refresh.access_token),
            }
        }, status=status.HTTP_201_CREATED)