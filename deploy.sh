#!/bin/bash

echo "🚀 Отправка файлов на сервер..."
rsync -avz -e "ssh -i ~/.ssh/id_petvet" \
    --exclude 'node_modules' \
    --exclude '.next' \
    --exclude 'venv' \
    --exclude '__pycache__' \
    --exclude '.git' \
    --exclude '.idea' \
    ./ petvet@193.180.213.143:/home/petvet/project

echo "✅ Файлы отправлены!"