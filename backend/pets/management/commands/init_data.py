from django.core.management.base import BaseCommand
from pets.models import Category, Tag, Attribute
from django.db import transaction

class Command(BaseCommand):
    help = 'Профессиональное наполнение БД: 100+ пород, специфические атрибуты и смарт-теги'

    def handle(self, *args, **kwargs):
        self.stdout.write("--- Запуск масштабной инициализации PetVet ---")

        with transaction.atomic():
            # 1. АТРИБУТЫ (Профессиональные и медицинские)
            # Формат: (slug, name, unit)
            attributes_data = [
                # Общие
                ("weight", "Вес", "кг"),
                ("height", "Высота в холке", "см"),
                ("chip_number", "Номер чипа", ""),
                ("blood_type", "Группа крови", ""),
                # Экстерьер и разведение
                ("coat_type", "Тип шерсти", ""),
                ("eye_color", "Цвет глаз", ""),
                ("pedigree_number", "Номер родословной", ""),
                ("breeder_prefix", "Заводская приставка", ""),
                ("bite_type", "Прикус", ""),
                # Специфические
                ("wing_span", "Размах крыльев", "см"),
                ("shell_diameter", "Диаметр панциря", "см"),
                ("activity_level", "Уровень активности", "1-10"),
            ]

            attrs = {}
            for slug, name, unit in attributes_data:
                attr, _ = Attribute.objects.update_or_create(
                    slug=slug, 
                    defaults={'name': name, 'unit': unit}
                )
                attrs[slug] = attr

            # 2. ТЕГИ (Смарт-фильтры с учетом пола)
            # Формат: (slug, name, target_gender)
            tags_data = [
                ("neutered", "Кастрирован", "M"),
                ("spayed", "Стерилизована", "F"),
                ("pregnant", "Беременна", "F"),
                ("cryptorchid", "Крипторх", "M"),
                ("hypoallergenic", "Гипоаллергенный", None),
                ("aggressive", "Агрессивен к сородичам", None),
                ("vaccinated", "Вакцинирован", None),
                ("breeding_allowed", "Допуск к разведению", None),
                ("champion", "Чемпион", None),
                ("special_needs", "Особый уход / Инвалид", None),
            ]

            created_tags = {}
            for slug, name, gender in tags_data:
                tag, _ = Tag.objects.update_or_create(
                    slug=slug, 
                    defaults={'name': name, 'target_gender': gender}
                )
                created_tags[slug] = tag

            # 3. СТРУКТУРА ВИДОВ И ПОРОД
            # (slug_вида, имя_вида, [атрибуты], {порода_слаг: порода_имя})
            species_map = [
                ("dogs", "Собаки", ["weight", "height", "chip_number", "coat_type", "bite_type", "pedigree_number"], {
                    "labrador": "Лабрадор ретривер", "germanshepherd": "Немецкая овчарка",
                    "goldendetriever": "Золотистый ретривер", "frenchbulldog": "Французский бульдог",
                    "beagle": "Бигль", "poodle": "Пудель", "rottweiler": "Ротвейлер",
                    "yorkshire": "Йоркширский терьер", "dachshund": "Такса", "boxer": "Боксер",
                    "corgi": "Вельш-корги пемброк", "husky": "Сибирский хаски", "doberman": "Доберман",
                    "shiba": "Сиба-ину", "jackrussell": "Джек-рассел-терьер", "bordercollie": "Бордер-колли",
                    "cane-corso": "Кане-корсо", "pomeranian": "Померанский шпиц", "akita": "Акита-ину"
                }),
                ("cats", "Кошки", ["weight", "chip_number", "coat_type", "blood_type", "pedigree_number"], {
                    "mainecoon": "Мейн-кун", "british": "Британская короткошерстная",
                    "ragdoll": "Рэгдолл", "persian": "Персидская", "sphynx": "Сфинкс",
                    "siamese": "Сиамская", "bengal": "Бенгальская", "scottishfold": "Шотландская вислоухая",
                    "abyssinian": "Абиссинская", "birman": "Бирманская", "russianblue": "Русская голубая",
                    "devonrex": "Девон-рекс", "oriental": "Ориентальная", "savannah": "Саванна"
                }),
                ("reptiles", "Рептилии", ["weight", "shell_diameter", "activity_level"], {
                    "leopard-gecko": "Пятнистый эублефар", "bearded-dragon": "Бородатая агама",
                    "corn-snake": "Маисовый полоз", "red-eared-slider": "Красноухая черепаха",
                    "iguana": "Зеленая игуана"
                }),
                ("birds", "Птицы", ["wing_span", "activity_level"], {
                    "budgie": "Волнистый попугай", "cockatiel": "Корелла",
                    "african-grey": "Жако", "canary": "Канарейка", "lovebird": "Неразлучник"
                }),
            ]

            for sp_slug, sp_name, sp_attrs, breeds in species_map:
                # Создаем Вид
                parent_cat, _ = Category.objects.update_or_create(
                    slug=sp_slug, 
                    defaults={'name': sp_name, 'parent': None}
                )
                
                # Привязываем разрешенные атрибуты к Виду
                for attr_slug in sp_attrs:
                    parent_cat.attributes.add(attrs[attr_slug])
                
                self.stdout.write(f"Создан вид: {sp_name}")

                # Создаем Породы
                for b_slug, b_name in breeds.items():
                    full_b_slug = f"{sp_slug}-{b_slug}"
                    breed_cat, created = Category.objects.update_or_create(
                        slug=full_b_slug,
                        defaults={'name': b_name, 'parent': parent_cat}
                    )
                    # Наследуем атрибуты вида для удобства админки
                    breed_cat.attributes.set(parent_cat.attributes.all())
                    
                    if created:
                        self.stdout.write(f"  └─ Порода: {b_name}")

        self.stdout.write(self.style.SUCCESS('--- База данных PetVet успешно заряжена! 🚀 ---'))