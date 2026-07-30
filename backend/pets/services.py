from datetime import date
from .models import Pet, PetEvent

def calculate_age(birth_date):
    if not birth_date:
        return "Unknown"
    today = date.today()
    years = today.year - birth_date.year - ((today.month, today.day) < (birth_date.month, birth_date.day))
    if years < 1:
        months = (today.year - birth_date.year) * 12 + today.month - birth_date.month
        return f"{months} mo"
    return f"{years} yr"

def build_pet_profile_prompt(pet_id):
    try:
        pet = Pet.objects.get(id=pet_id)
    except Pet.DoesNotExist:
        return None

    categories = ", ".join([c.name for c in pet.categories.all()])
    age = calculate_age(pet.birth_date)
    gender = "Male" if pet.gender == 'M' else "Female"
    
    # === TAGS ===
    tags_list = [t.name.lower() for t in pet.tags.all()]
    is_neutered = any(term in tags_list for term in ['neutered', 'spayed'])
    
    reproductive_status = "NEUTERED/SPAYED" if is_neutered else "INTACT — Possible sexual instinct!"

    # === ATTRIBUTES ===
    attributes_list = []
    for pa in pet.attributes.all():
        attributes_list.append(f"{pa.attribute.name}: {pa.value} {pa.attribute.unit or ''}")
    attributes_str = "; ".join(attributes_list) if attributes_list else "No data"

    # === MEDICAL HISTORY ===
    last_events = PetEvent.objects.filter(
        pet=pet,
        event_type__category__in=['medical', 'reproduction', 'surgery', 'parasite']
    ).select_related('event_type').order_by('-date')[:5]

    history_str = ""
    if last_events.exists():
        for event in last_events:
            date_str = event.date.strftime('%m/%d/%Y')
            type_name = event.event_type.name 
            history_str += f"- {date_str} [{type_name}]: {event.title}. {event.description or ''}\n"
    else:
        history_str = "No history records."

    profile_text = f"""
=== PATIENT ===
Name: {pet.name}
Species: {categories}
Sex: {gender}
Age: {age}
Reproductive Status: {reproductive_status} (This is critical for behavioral analysis!)

=== PHYSIOLOGY ===
{attributes_str}

=== TRAITS ===
Tags: {", ".join(tags_list)}

=== MEDICAL HISTORY ===
{history_str}
    """
    return profile_text.strip()