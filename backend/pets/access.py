"""
Единые проверки доступа к питомцу (owner | PetAccess | shadow creator).
"""
from django.db.models import Q

from .models import Pet, PetAccess


def pet_access_q(user, *, write: bool = False) -> Q:
    """Q-фильтр для queryset питомцев, доступных пользователю."""
    q = (
        Q(owner=user)
        | Q(created_by=user, owner__isnull=True)
        | Q(access_grants__user=user, access_grants__is_active=True)
    )
    if write:
        q = (
            Q(owner=user)
            | Q(created_by=user, owner__isnull=True)
            | Q(
                access_grants__user=user,
                access_grants__is_active=True,
                access_grants__access_level='write',
            )
        )
    return q


def user_can_access_pet(user, pet: Pet, *, write: bool = False) -> bool:
    if not user or not user.is_authenticated or pet is None:
        return False
    if pet.owner_id == user.id:
        return True
    if pet.owner_id is None and pet.created_by_id == user.id:
        return True
    grant = PetAccess.objects.filter(pet=pet, user=user, is_active=True).first()
    if not grant:
        return False
    if write:
        return grant.access_level == 'write'
    return True
