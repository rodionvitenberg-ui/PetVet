import os
import google.generativeai as genai
from dotenv import load_dotenv

# Загружаем переменные из .env
load_dotenv()

api_key = os.getenv('GEMINI_API_KEY')

if not api_key:
    print("ОШИБКА: Не найден GEMINI_API_KEY в .env")
else:
    genai.configure(api_key=api_key)
    print("=== ДОСТУПНЫЕ МОДЕЛИ ===")
    try:
        for m in genai.list_models():
            if 'generateContent' in m.supported_generation_methods:
                print(f"- {m.name}")
    except Exception as e:
        print(f"Ошибка соединения: {e}")