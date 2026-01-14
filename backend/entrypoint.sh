#!/bin/sh

# Ожидание готовности базы данных
if [ "$DATABASE" = "postgres" ]
then
    echo "Waiting for postgres..."
    while ! nc -z $DB_HOST $DB_PORT; do
      sleep 0.1
    done
    echo "PostgreSQL started"
fi

# 1. Накатываем миграции
echo "Applying database migrations..."
python manage.py migrate

# 2. Собираем статику в папку staticfiles (нужен STATIC_ROOT в settings.py!)
echo "Collecting static files..."
python manage.py collectstatic --noinput

# 3. Запускаем Daphne (ASGI сервер для WebSocket и HTTP)
echo "Starting Daphne server..."
exec "$@"