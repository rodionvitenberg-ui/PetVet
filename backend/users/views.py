from rest_framework import generics, status
from rest_framework.views import APIView  # <-- Добавлено
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated # <-- Добавлено IsAuthenticated
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import get_user_model
from .serializers import UserRegistrationSerializer, UserSerializer # <-- Добавлен импорт UserSerializer

User = get_user_model()

# --- ЭТОТ КЛАСС МЫ ДОБАВИЛИ ---
class UserMeView(APIView):
    """Возвращает данные текущего авторизованного пользователя"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        # request.user уже содержит пользователя, которого Django определил по токену
        serializer = UserSerializer(request.user)
        return Response(serializer.data)


# --- СТАРЫЙ КОД ОСТАВЛЯЕМ БЕЗ ИЗМЕНЕНИЙ ---
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