from django.core.management.base import BaseCommand
from django.db import transaction
from pets.models import Category, Tag, Attribute

class Command(BaseCommand):
    help = 'Ultra-Heavy: Наполнение БД для ветеринарии и фермерского хозяйства (RU + EN)'

    def handle(self, *args, **kwargs):
        self.stdout.write("--- Запуск мега-инициализации данных (Домашние + Ферма) ---")

        with transaction.atomic():
            # === 1. РАСШИРЕННЫЕ АТРИБУТЫ (Attributes) ===
            attributes_data = [
                # Общие и идентификация
                ("weight", "Вес", "Weight", "кг"),
                ("height", "Высота в холке", "Height at withers", "см"),
                ("chip_number", "Номер чипа", "Microchip number", ""),
                ("tag_number", "Номер бирки / Тавро", "Ear Tag / Brand number", ""),
                ("pedigree_number", "Номер родословной", "Pedigree number", ""),
                
                # Профессиональные/Фермерские
                ("milk_yield", "Удой (суточный)", "Daily milk yield", "л"),
                ("fat_content", "Жирность молока", "Milk fat content", "%"),
                ("wool_quality", "Качество шерсти", "Wool quality", ""),
                ("coat_type", "Тип шерсти/волосяного покрова", "Coat type", ""),
                ("bite_type", "Прикус", "Bite type", ""),
                ("slaughter_weight", "Убойный вес", "Slaughter weight", "кг"),
            ]

            attrs = {}
            for slug, ru, en, unit in attributes_data:
                attr, _ = Attribute.objects.update_or_create(
                    slug=slug,
                    defaults={'name_ru': ru, 'name_en': en, 'unit': unit}
                )
                attrs[slug] = attr

            # === 2. ФЕРМЕРСКИЕ И СПЕЦИАЛЬНЫЕ ТЕГИ (Tags) ===
            tags_data = [
                ("neutered", "Кастрирован / Холощен", "Castrated", "M"),
                ("spayed", "Стерилизована", "Spayed", "F"),
                ("pregnant", "Супоросность / Стельность", "Pregnant", "F"),
                ("milking", "Дойная", "Milking", "F"),
                ("dry_period", "В запуске", "Dry period", "F"),
                ("breeding_stock", "Племенное ядро", "Breeding stock", None),
                ("vaccinated", "Вакцинирован", "Vaccinated", None),
                ("fattening", "На откорме", "On fattening", None),
                ("working_animal", "Рабочее животное", "Working animal", None),
                ("show_class", "Шоу-класс", "Show class", None),
            ]

            for slug, ru, en, gender in tags_data:
                Tag.objects.update_or_create(
                    slug=slug,
                    defaults={'name_ru': ru, 'name_en': en, 'target_gender': gender}
                )

            # === 3. ИЕРАРХИЯ ВИДОВ И ПОРОД (Копытные + Домашние) ===
            species_structure = [
                # --- ЛОШАДИ ---
                ("horses", "Лошади", "Horses", ["weight", "height", "chip_number", "tag_number", "pedigree_number"], {
                    "arabian": ("Арабская чистокровная", "Arabian Horse"),
                    "thoroughbred": ("Английская чистокровная", "Thoroughbred"),
                    "friesian": ("Фризская", "Friesian"),
                    "orlov-trotter": ("Орловский рысак", "Orlov Trotter"),
                    "shire": ("Шайр", "Shire"),
                }),
                # --- КРС (Коровы) ---
                ("cattle", "КРС", "Cattle", ["weight", "tag_number", "milk_yield", "fat_content", "pedigree_number"], {
                    "holstein": ("Голштинская", "Holstein"),
                    "jersey": ("Джерсейская", "Jersey"),
                    "hereford": ("Герефордская", "Hereford"),
                    "angus": ("Абердин-ангусская", "Aberdeen Angus"),
                    "simmental": ("Симментальская", "Simmental"),
                }),
                # --- СВИНЬИ ---
                ("pigs", "Свиньи", "Pigs", ["weight", "tag_number", "slaughter_weight"], {
                    "large-white": ("Крупная белая", "Large White"),
                    "duroc": ("Дюрок", "Duroc"),
                    "landrace": ("Ландрас", "Landrace"),
                    "vietnamese": ("Вьетнамская вислобрюхая", "Vietnamese Pot-bellied"),
                }),
                # --- КОЗЫ ---
                ("goats", "Козы", "Goats", ["weight", "tag_number", "milk_yield", "wool_quality"], {
                    "saanen": ("Зааненская", "Saanen"),
                    "nubian": ("Англо-нубийская", "Anglo-Nubian"),
                    "alpine": ("Альпийская", "Alpine"),
                    "boer": ("Бурская (мясная)", "Boer"),
                    "zane": ("Оренбургская (пуховая)", "Orenburg Goat"),
                }),
                # --- СОБАКИ (для полноты картины) ---
                ("dogs", "Собаки", "Dogs", ["weight", "height", "chip_number", "coat_type", "bite_type"], {
                    "central-asian-shepherd": ("Среднеазиатская овчарка (Алабай)", "Central Asian Shepherd"),
                    "border-collie": ("Бордер-колли (пастушья)", "Border Collie"),
                }),
            ]

            for sp_slug, sp_ru, sp_en, sp_attrs, breeds in species_structure:
                parent_cat, _ = Category.objects.update_or_create(
                    slug=sp_slug,
                    defaults={'name_ru': sp_ru, 'name_en': sp_en, 'parent': None}
                )
                
                for a_slug in sp_attrs:
                    if a_slug in attrs:
                        parent_cat.attributes.add(attrs[a_slug])

                self.stdout.write(f"Вид: {sp_ru}")

                for b_slug, (b_ru, b_en) in breeds.items():
                    full_b_slug = f"{sp_slug}-{b_slug}"
                    breed_cat, _ = Category.objects.update_or_create(
                        slug=full_b_slug,
                        defaults={'name_ru': b_ru, 'name_en': b_en, 'parent': parent_cat}
                    )
                    breed_cat.attributes.set(parent_cat.attributes.all())
                    self.stdout.write(f"  └─ Порода: {b_ru}")

        self.stdout.write(self.style.SUCCESS('--- База PetVet готова к работе на фермах! ---'))