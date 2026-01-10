from rest_framework import generics, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import get_user_model
from .serializers import (
    UserRegistrationSerializer, 
    UserSerializer, 
    GoogleAuthSerializer
)

User = get_user_model()

# --- ОБНОВЛЕННЫЙ КЛАСС (Был APIView, стал RetrieveUpdateAPIView) ---
class UserMeView(generics.RetrieveUpdateAPIView):
    """
    Возвращает данные текущего пользователя (GET).
    Позволяет обновить профиль (PATCH) - например, выбрать роль после Google входа.
    """
    permission_classes = [IsAuthenticated]
    serializer_class = UserSerializer
    parser_classes = (MultiPartParser, FormParser, JSONParser)

    def get_object(self):
        return self.request.user
    
    def perform_update(self, serializer):
        # Если фронтенд прислал role="vet", нам нужно переключить флаг is_veterinarian
        # Т.к. role нет в модели, ловим это из request.data
        if 'role' in self.request.data:
            role = self.request.data['role']
            instance = serializer.instance
            if role == 'vet':
                instance.is_veterinarian = True
            elif role == 'owner':
                instance.is_veterinarian = False
            # Сохраняем это изменение
            instance.save()
            
        serializer.save()


# --- НОВЫЙ КЛАСС ДЛЯ GOOGLE ---
class GoogleLoginView(APIView):
    permission_classes = (AllowAny,)

    def post(self, request):
        serializer = GoogleAuthSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        user = serializer.validated_data['user']
        is_new = serializer.validated_data['is_new']
        
        # Генерируем токены
        refresh = RefreshToken.for_user(user)
        refresh['is_veterinarian'] = user.is_veterinarian

        return Response({
            "user": {
                "id": user.id,
                "email": user.email,
                "username": user.username,
                "first_name": user.first_name,
                "last_name": user.last_name,
                "role": "vet" if user.is_veterinarian else "owner",
                "is_verified": user.is_verified
            },
            "tokens": {
                "refresh": str(refresh),
                "access": str(refresh.access_token),
            },
            "is_new_user": is_new  # Флаг для фронтенда: если True -> редирект на выбор роли
        }, status=status.HTTP_200_OK)


# --- СТАРЫЙ КЛАСС (БЕЗ ИЗМЕНЕНИЙ, просто для контекста) ---
class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    permission_classes = (AllowAny,)
    serializer_class = UserRegistrationSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        refresh = RefreshToken.for_user(user)
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