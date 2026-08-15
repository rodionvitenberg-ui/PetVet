# === ЕДИНАЯ СУЩНОСТЬ КЛИЕНТА (P-2) ===
# Три места в сериализаторах раньше строили «клиента» по-своему:
#   PetSerializer.get_owner_info        (owner | temp_owner)
#   PetEventSerializer                  (guest_*)
#   InvoiceSerializer.get_client_info   (client | pet.owner | temp_owner | guest)
# Теперь это один резолвер. Сериализаторы зовут resolve_client().

def resolve_client(obj) -> dict:
    """
    Возвращает унифицированный объект клиента из любой модели-источника.

    obj может быть:
    - pets.Pet          → реальный владелец или теневой (temp_owner_name/phone);
    - pets.PetEvent     → guest_*;
    - billing.Invoice   → client (User) или guest_name.

    Ответ всегда: {id, name, phone, email, telegram, avatar, about, is_temporary}.
    """
    # 1. Pet: реальный владелец или теневой владелец
    owner = getattr(obj, 'owner', None)
    if owner is not None:
        return {
            "id": owner.id,
            "name": f"{owner.first_name} {owner.last_name}".strip() or owner.username,
            "email": getattr(owner, 'email', None),
            "phone": getattr(owner, 'phone', None),
            "telegram": getattr(owner, 'telegram', None),
            "avatar": owner.avatar.url if getattr(owner, 'avatar', None) else None,
            "about": getattr(owner, 'about', None),
            "is_temporary": False,
        }

    temp_name = getattr(obj, 'temp_owner_name', None)
    temp_phone = getattr(obj, 'temp_owner_phone', None)
    if temp_name or temp_phone:
        return {
            "id": None,
            "name": temp_name or "Client (No name)",
            "email": None,
            "phone": temp_phone,
            "telegram": None,
            "avatar": None,
            "about": "Profile not yet created",
            "is_temporary": True,
        }

    # 2. PetEvent: гостевые поля
    guest_name = getattr(obj, 'guest_name', None)
    if guest_name:
        return {
            "id": None,
            "name": guest_name,
            "email": None,
            "phone": getattr(obj, 'guest_phone', None),
            "telegram": None,
            "avatar": None,
            "about": None,
            "is_temporary": True,
        }

    # 3. Invoice: client (User)
    client = getattr(obj, 'client', None)
    if client is not None:
        return {
            "id": client.id,
            "name": client.get_full_name() or client.email,
            "email": client.email,
            "phone": getattr(client, 'phone', None),
            "telegram": getattr(client, 'telegram', None),
            "avatar": client.avatar.url if getattr(client, 'avatar', None) else None,
            "about": getattr(client, 'about', None),
            "is_temporary": False,
        }

    # 4. Invoice с петом, у которого теневой владелец
    pet = getattr(obj, 'pet', None)
    if pet is not None:
        result = resolve_client(pet)
        if result.get('id') is not None or pet.temp_owner_name:
            return result

    # 5. Invoice: guest_name — последний вариант
    invoice_guest = getattr(obj, 'guest_name', None)
    if invoice_guest:
        return {
            "id": None,
            "name": invoice_guest,
            "email": None,
            "phone": None,
            "telegram": None,
            "avatar": None,
            "about": None,
            "is_temporary": True,
        }

    return {
        "id": None,
        "name": "Guest",
        "email": None,
        "phone": None,
        "telegram": None,
        "avatar": None,
        "about": None,
        "is_temporary": True,
    }


# (calculate_age удалён — не использовался; возраст считается в PetSerializer.get_age)
