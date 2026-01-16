from datetime import date
from .models import Pet, PetEvent  # [FIX] Импортируем новую модель

def calculate_age(birth_date):
    if not birth_date:
        return "Неизвестен"
    today = date.today()
    years = today.year - birth_date.year - ((today.month, today.day) < (birth_date.month, birth_date.day))
    if years < 1:
        months = (today.year - birth_date.year) * 12 + today.month - birth_date.month
        return f"{months} мес."
    return f"{years} лет"

def build_pet_profile_prompt(pet_id):
    try:
        pet = Pet.objects.get(id=pet_id)
    except Pet.DoesNotExist:
        return None

    categories = ", ".join([c.name for c in pet.categories.all()])
    age = calculate_age(pet.birth_date)
    gender = "Самец (Boy)" if pet.gender == 'M' else "Самка (Girl)"
    
    # === ТЕГИ (Логика кастрации осталась прежней) ===
    tags_list = [t.name.lower() for t in pet.tags.all()]
    is_neutered = any(term in tags_list for term in ['neutered', 'spayed', 'кастрирован', 'стерилизован', 'стерилизована'])
    
    reproductive_status = "КАСТРИРОВАН/СТЕРИЛИЗОВАН" if is_neutered else "НЕ КАСТРИРОВАН (INTACT) - Возможен половой инстинкт!"

    # === АТРИБУТЫ (Логика прежняя) ===
    attributes_list = []
    for pa in pet.attributes.all():
        attributes_list.append(f"{pa.attribute.name}: {pa.value} {pa.attribute.unit or ''}")
    attributes_str = "; ".join(attributes_list) if attributes_list else "Нет данных"

    # === ИСТОРИЯ (РЕФАКТОРИНГ) ===
    # 1. Используем PetEvent
    # 2. Фильтруем по category внутри event_type
    last_events = PetEvent.objects.filter(
        pet=pet,
        event_type__category__in=['medical', 'reproduction', 'surgery', 'parasite'] # Выбираем важные категории для AI
    ).select_related('event_type').order_by('-date')[:5] # select_related для оптимизации запросов

    history_str = ""
    if last_events.exists():
        for event in last_events:
            date_str = event.date.strftime('%d.%m.%Y')
            # [FIX] Берем имя из связанной модели EventType
            type_name = event.event_type.name 
            history_str += f"- {date_str} [{type_name}]: {event.title}. {event.description or ''}\n"
    else:
        history_str = "История чиста (нет записей)."

    profile_text = f"""
=== ПАЦИЕНТ ===
Имя: {pet.name}
Вид: {categories}
Пол: {gender}
Возраст: {age}
Репродуктивный статус: {reproductive_status} (Это критически важно для анализа поведения!)

=== ФИЗИОЛОГИЯ ===
{attributes_str}

=== ОСОБЕННОСТИ ===
Теги: {", ".join(tags_list)}

=== АНАМНЕЗ ===
{history_str}
    """
    return profile_text.strip()