# Используем Python 3.13 (совместим с Django 6.0)
FROM python:3.13-slim

WORKDIR /app

# Переменные для оптимизации Python
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Устанавливаем системные зависимости для сборки (gcc, libpq) и утилиты (netcat)
RUN apt-get update && apt-get install -y \
    build-essential \
    gcc \
    python3-dev \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .    
# Сначала копируем зависимости (для кэширования Docker слоев)
RUN pip install --upgrade pip && \
    pip install --no-cache-dir --default-timeout=100 -r requirements.txt

# Копируем код проекта
COPY . .

# Копируем скрипт entrypoint и даем права на исполнение
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# Точка входа
ENTRYPOINT ["/entrypoint.sh"]