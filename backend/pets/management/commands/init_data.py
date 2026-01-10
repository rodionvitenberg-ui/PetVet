from django.core.management.base import BaseCommand
from pets.models import Category, Tag, Attribute

class Command(BaseCommand):
    help = 'Наполняет БД видами, породами, тегами и атрибутами (RU + EN)'

    def handle(self, *args, **kwargs):
        self.stdout.write("Начинаем наполнение базы данных...")

        # === 1. АТРИБУТЫ ===
        attributes_data = [
            ("weight", "Вес", "Weight", "kg/кг"),
            ("height", "Рост в холке", "Height", "cm/см"),
            ("chest_girth", "Окружность груди", "Chest girth", "cm/см"),
            ("chip_number", "Номер чипа", "Microchip #", ""),
            ("tattoo_number", "Номер клейма", "Tattoo #", ""),
            ("color", "Окрас", "Color", ""),
            ("blood_type", "Группа крови", "Blood Type", ""),
        ]
        
        created_attrs = {}
        for slug, name_ru, name_en, unit in attributes_data:
            attr, _ = Attribute.objects.update_or_create(
                slug=slug,
                defaults={'name_ru': name_ru, 'name_en': name_en, 'unit': unit}
            )
            created_attrs[slug] = attr

        # === 2. ТЕГИ ===
        tags_data = [
            ("spayed", "Стерилизована", "Spayed", "F"),
            ("neutered", "Кастрирован", "Neutered", "M"),
            ("allergic", "Аллергик", "Allergic", None),
            ("chipped", "Чипирован", "Microchipped", None),
            ("vaccinated", "Вакцинирован", "Vaccinated", None),
            ("friendly", "Дружелюбный", "Friendly", None),
            ("aggressive", "Агрессивен", "Aggressive", None),
            ("breeding", "В разведении", "Breeding", None),
            ("for_sale", "Продается", "For Sale", None),
        ]

        created_tags = {}
        for slug, name_ru, name_en, gender in tags_data:
            tag, _ = Tag.objects.update_or_create(
                slug=slug,
                defaults={'name_ru': name_ru, 'name_en': name_en, 'target_gender': gender}
            )
            created_tags[slug] = tag

        # === 3. ВИДЫ И ПОРОДЫ (Иерархия) ===
        # Структура: (slug_вида, ru, en, [список_пород])
        species_structure = [
            ("dogs", "Собаки", "Dogs", [
                ("corgi", "Корги", "Corgi"),
                ("shepherd", "Овчарка", "Shepherd"),
                ("labrador", "Лабрадор", "Labrador"),
                ("poodle", "Пудель", "Poodle"),
                ("bulldog", "Бульдог", "Bulldog"),
                ("terrier", "Терьер", "Terrier"),
                ("husky", "Хаски", "Husky"),
                ("mongrel_dog", "Дворняга / Метис", "Mixed Breed"),
            ]),
            ("cats", "Кошки", "Cats", [
                ("mainecoon", "Мейн-кун", "Maine Coon"),
                ("british", "Британская", "British Shorthair"),
                ("sphynx", "Сфинкс", "Sphynx"),
                ("bengal", "Бенгальская", "Bengal"),
                ("persian", "Персидская", "Persian"),
                ("siberian", "Сибирская", "Siberian"),
                ("mongrel_cat", "Домус (Беспородная)", "Domestic Cat"),
            ]),
            ("rodents", "Грызуны", "Rodents", [
                ("hamster", "Хомяк", "Hamster"),
                ("guineapig", "Морская свинка", "Guinea Pig"),
                ("chinchilla", "Шиншилла", "Chinchilla"),
                ("rat", "Крыса", "Rat"),
            ]),
            ("birds", "Птицы", "Birds", [
                ("parrot", "Попугай", "Parrot"),
                ("canary", "Канарейка", "Canary"),
            ]),
        ]

        for species_slug, sp_ru, sp_en, breeds in species_structure:
            # 1. Создаем родителя (Вид)
            parent_cat, _ = Category.objects.update_or_create(
                slug=species_slug,
                defaults={'name_ru': sp_ru, 'name_en': sp_en, 'parent': None}
            )
            self.stdout.write(f"Вид: {sp_ru}")
            
            # Привязываем общие атрибуты к Виду
            parent_cat.attributes.add(created_attrs['weight'])
            parent_cat.attributes.add(created_attrs['color'])
            if species_slug == 'dogs':
                parent_cat.attributes.add(created_attrs['height'])
                parent_cat.attributes.add(created_attrs['tattoo_number'])
            
            # 2. Создаем детей (Породы)
            for breed_slug, br_ru, br_en in breeds:
                full_breed_slug = f"{species_slug}-{breed_slug}" # Чтобы слаг был уникальным (на всякий)
                breed_cat, created = Category.objects.update_or_create(
                    slug=full_breed_slug,
                    defaults={
                        'name_ru': br_ru, 
                        'name_en': br_en,
                        'parent': parent_cat # <--- ВОТ ОНА, СВЯЗЬ
                    }
                )
                
                # Породы наследуют атрибуты родителя?
                # В Django M2M не наследуется автоматически.
                # Хорошая практика: при создании питомца фронтенд смотрит атрибуты выбранной категории.
                # Можно продублировать атрибуты породам, но проще брать их от родителя в логике.
                # Для админки добавим и породам:
                breed_cat.attributes.set(parent_cat.attributes.all())
                
                if created:
                    self.stdout.write(f"  └─ Порода: {br_ru}")

        self.stdout.write(self.style.SUCCESS('База данных успешно наполнена породами! 🐕🐈'))