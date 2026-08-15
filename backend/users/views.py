from rest_framework import generics, status, viewsets, permissions, mixins, views
from rest_framework.views import APIView
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.throttling import ScopedRateThrottle
from rest_framework_simplejwt.tokens import RefreshToken
from .models import UserContact, VetVerificationRequest
from django.contrib.auth import get_user_model
from .serializers import (
    UserSerializer, 
    GoogleAuthSerializer,
    UserContactSerializer, 
    VetVerificationSerializer,
    RegisterSerializer
)

from django.contrib.auth.tokens import default_token_generator
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from django.utils.encoding import force_bytes, force_str
import logging

from django.core.mail import send_mail
from django.conf import settings

logger = logging.getLogger(__name__)
User = get_user_model()

class RegisterView(generics.CreateAPIView):
    """
    Регистрация нового пользователя с отправкой письма активации.
    """
    queryset = User.objects.all()
    permission_classes = (permissions.AllowAny,)
    serializer_class = RegisterSerializer
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'auth'

    def perform_create(self, serializer):
        # Сохраняем пользователя (is_active=False)
        user = serializer.save()
        self.send_activation_email(user)

    def send_activation_email(self, user):
        # Генерируем uid и токен
        uid = urlsafe_base64_encode(force_bytes(user.pk))
        token = default_token_generator.make_token(user)
        
        # Ссылка на ФРОНТЕНД страницу верификации
        # Убедись, что FRONTEND_URL задан в settings.py
        frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:3000')
        activation_link = f"{frontend_url}/verify?uid={uid}&token={token}"
        
        subject = "Активация аккаунта CareYour.Pet"
        message = f"Здравствуйте, {user.username}!\n\nДля активации вашего аккаунта перейдите по ссылке:\n{activation_link}\n\nСсылка действительна 24 часа."
        
        try:
            send_mail(
                subject,
                message,
                settings.DEFAULT_FROM_EMAIL,
                [user.email],
                fail_silently=False,
            )
        except Exception as e:
            # Логируем ошибку, но не роняем регистрацию
            logger.warning("Failed to send activation email to %s: %s", user.email, e)

    def create(self, request, *args, **kwargs):
        # Переопределяем ответ, чтобы не возвращать токены сразу
        super().create(request, *args, **kwargs)
        return Response(
            {"message": "Аккаунт создан. Проверьте email для активации."},
            status=status.HTTP_201_CREATED
        )

class ActivateAccountView(views.APIView):
    """
    Активация аккаунта по ссылке из письма.
    """
    permission_classes = (permissions.AllowAny,)
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'auth'

    def post(self, request):
        uidb64 = request.data.get('uid')
        token = request.data.get('token')

        if not uidb64 or not token:
            return Response({'error': 'Отсутствуют обязательные параметры (uid, token)'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            uid = force_str(urlsafe_base64_decode(uidb64))
            user = User.objects.get(pk=uid)
        except (TypeError, ValueError, OverflowError, User.DoesNotExist):
            return Response({'error': 'Неверная ссылка активации'}, status=status.HTTP_400_BAD_REQUEST)

        if user.is_active:
            return Response({'message': 'Аккаунт уже активирован'}, status=status.HTTP_200_OK)

        if default_token_generator.check_token(user, token):
            user.is_active = True
            user.save()
            return Response({'success': 'Аккаунт успешно активирован! Теперь вы можете войти.'})
        else:
            return Response({'error': 'Ссылка активации устарела или недействительна'}, status=status.HTTP_400_BAD_REQUEST)

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
        # [P0-6] Роль больше нельзя сменить самому через PATCH.
        # is_veterinarian выдаётся ТОЛЬКО через admin / users.signals
        # (approve VetVerificationRequest). Поле "role" из фронта игнорируется.
        serializer.save()


# --- НОВЫЙ КЛАСС ДЛЯ GOOGLE ---
class GoogleLoginView(APIView):
    permission_classes = (AllowAny,)
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'auth'

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


# [I-1] Дубль RegisterView удалён. Единственная реализация — первый класс RegisterView выше.
class UserContactViewSet(viewsets.ModelViewSet):
    serializer_class = UserContactSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        # Пользователь видит и правит только свои контакты
        return UserContact.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

class DemoLoginView(APIView):
    """
    POST /api/auth/demo-login/
    Allows logging in as the demo user (god) without a password.
    Active only when settings.ENABLE_DEMO_LOGIN is True.
    """
    permission_classes = (permissions.AllowAny,)
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'auth'

    def post(self, request):
        if not getattr(settings, 'ENABLE_DEMO_LOGIN', False):
            return Response(
                {"error": "Demo login is disabled."},
                status=status.HTTP_404_NOT_FOUND,
            )

        try:
            user = User.objects.get(username='god')
        except User.DoesNotExist:
            return Response(
                {"error": "Demo user (god) not found. Run seed_production_data first."},
                status=status.HTTP_404_NOT_FOUND
            )

        refresh = RefreshToken.for_user(user)
        refresh['is_veterinarian'] = user.is_veterinarian

        return Response({
            "user": {
                "id": user.id,
                "username": user.username,
                "email": user.email,
                "first_name": user.first_name,
                "last_name": user.last_name,
                "role": "vet" if user.is_veterinarian else "owner",
                "is_verified": user.is_verified,
                "is_veterinarian": user.is_veterinarian,
                "avatar": user.avatar.url if user.avatar else None,
            },
            "tokens": {
                "refresh": str(refresh),
                "access": str(refresh.access_token),
            },
        }, status=status.HTTP_200_OK)


class VerificationViewSet(viewsets.GenericViewSet, mixins.CreateModelMixin, mixins.ListModelMixin):
    serializer_class = VetVerificationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        # Юзер видит только свои заявки
        return VetVerificationRequest.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    # Удобный метод получить последнюю актуальную заявку
    @action(detail=False, methods=['get'])
    def current_status(self, request):
        latest = self.get_queryset().first() # Благодаря ordering=['-created_at'] это последняя
        if latest:
            return Response(self.get_serializer(latest).data)
        return Response(None)