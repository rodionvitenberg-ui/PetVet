from django.core.management.base import BaseCommand
from django.db import transaction
from pets.models import Category, Tag, Attribute, EventType
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

class Command(BaseCommand):
    help = 'ULTIMATE INIT: Энциклопедическое наполнение БД (Домашние, Ферма, Экзоты, Птицы, Насекомые)'

    def handle(self, *args, **kwargs):
        self.stdout.write("--- ЗАПУСК ЭНЦИКЛОПЕДИЧЕСКОЙ ИНИЦИАЛИЗАЦИИ ---")

        with transaction.atomic():
            # ==========================================
            # 1. ГЛОБАЛЬНЫЕ АТРИБУТЫ (Attributes)
            # ==========================================
            attributes_data = [
                # --- Идентификация и Физика ---
                ("weight", "Вес", "Weight", "кг"),
                ("height", "Высота в холке", "Height at withers", "см"),
                ("chip_number", "Номер чипа", "Microchip number", ""),
                ("tag_number", "Номер бирки / Тавро", "Ear Tag / Brand number", ""),
                ("pedigree_number", "Номер родословной", "Pedigree number", ""),
                ("ring_number", "Номер кольца", "Ring number", ""), # Паспорт для птиц

                # --- Экстерьер ---
                ("coat_type", "Тип шерсти / чешуи", "Coat / Scale type", ""),
                ("eye_color", "Цвет глаз", "Eye color", ""),
                ("bite_type", "Прикус", "Bite type", ""),
                ("wing_span", "Размах крыльев", "Wingspan", "см"),
                ("leg_span", "Размах лап", "Leg span", "см"), # Для пауков

                # --- Ферма и Продуктивность ---
                ("milk_yield", "Удой (суточный)", "Daily milk yield", "л"),
                ("fat_content", "Жирность молока", "Milk fat content", "%"),
                ("wool_quality", "Качество шерсти", "Wool quality", ""),
                ("slaughter_weight", "Убойный вес", "Slaughter weight", "кг"),

                # --- Специфика Экзотов ---
                ("morph", "Морфа / Окрас", "Morph / Color variation", ""), # Критично для рептилий
                ("terrarium_type", "Тип террариума", "Terrarium type", ""), # Горизонтальный/Вертикальный
                ("uv_index", "Индекс УФ (потребность)", "UV Index requirement", ""),
                ("cites_status", "Статус CITES", "CITES Status", ""), # Редкость вида

                # --- Психология и Поведение ---
                ("activity_level", "Уровень активности", "Activity level", "1-10"),
                ("trainability", "Обучаемость", "Trainability", "1-10"),
                ("aggression_level", "Уровень агрессии", "Aggression level", "1-10"),
            ]

            attrs = {}
            for slug, ru, en, unit in attributes_data:
                attr, _ = Attribute.objects.update_or_create(
                    slug=slug,
                    defaults={'name_ru': ru, 'name_en': en, 'unit': unit}
                )
                attrs[slug] = attr

            # ==========================================
            # 2. СМАРТ-ТЕГИ (Tags)
            # ==========================================
            tags_data = [
                # Гендерные
                ("neutered", "Кастрирован / Холощен", "Castrated", "M"),
                ("spayed", "Стерилизована", "Spayed", "F"),
                ("pregnant", "Беременность / Стельность", "Pregnant", "F"),
                ("milking", "Дойная", "Milking", "F"),
                ("dry_period", "В запуске", "Dry period", "F"),
                ("cryptorchid", "Крипторх", "Cryptorchid", "M"),
                
                # Медицинские и поведенческие
                ("hypoallergenic", "Гипоаллергенный", "Hypoallergenic", None),
                ("vaccinated", "Вакцинирован", "Vaccinated", None),
                ("champion", "Чемпион", "Champion", None),
                ("special_needs", "Особый уход / Инвалид", "Special needs", None),
                ("aggressive", "Агрессивен к сородичам", "Aggressive to others", None),
                ("venomous", "Ядовит / Токсичен", "Venomous", None), # Для змей/пауков
                ("hibernation", "Требует зимовки", "Requires Hibernation", None),
                ("working_animal", "Рабочее животное", "Working animal", None),
            ]

            for slug, ru, en, gender in tags_data:
                Tag.objects.update_or_create(
                    slug=slug,
                    defaults={'name_ru': ru, 'name_en': en, 'target_gender': gender}
                )

            # ==========================================
            # 3. ЭНЦИКЛОПЕДИЯ ВИДОВ (Species Structure)
            # ==========================================
            species_structure = [
                # --- КОШКИ (Расширенный список) ---
                ("cats", "Кошки", "Cats", ["weight", "chip_number", "coat_type", "pedigree_number", "eye_color"], {
                    # Популярные
                    "mainecoon": ("Мейн-кун", "Maine Coon"),
                    "british": ("Британская короткошерстная", "British Shorthair"),
                    "scottishfold": ("Шотландская вислоухая", "Scottish Fold"),
                    "bengal": ("Бенгальская", "Bengal"),
                    "siamese": ("Сиамская", "Siamese"),
                    "abyssinian": ("Абиссинская", "Abyssinian"),
                    "ragdoll": ("Рэгдолл", "Ragdoll"),
                    "persian": ("Персидская", "Persian"),
                    # Сфинксы
                    "sphynx-canadian": ("Канадский сфинкс", "Canadian Sphynx"),
                    "sphynx-don": ("Донской сфинкс", "Don Sphynx"),
                    "peterbald": ("Петерболд", "Peterbald"),
                    # Русские / Аборигенные
                    "siberian": ("Сибирская", "Siberian"),
                    "neva-masquerade": ("Невская маскарадная", "Neva Masquerade"),
                    "russianblue": ("Русская голубая", "Russian Blue"),
                    "kurilian-bobtail": ("Курильский бобтейл", "Kurilian Bobtail"),
                    # Экзотика
                    "devonrex": ("Девон-рекс", "Devon Rex"),
                    "cornishrex": ("Корниш-рекс", "Cornish Rex"),
                    "oriental": ("Ориентальная", "Oriental"),
                    "savannah": ("Саванна", "Savannah"),
                    "munchkin": ("Манчкин", "Munchkin"),
                    "birman": ("Священная бирма", "Birman"),
                    "chartreux": ("Шартрез", "Chartreux"),
                }),

                # --- СОБАКИ (Базовый набор популярных) ---
                ("dogs", "Собаки", "Dogs", ["weight", "height", "chip_number", "coat_type", "bite_type", "activity_level"], {
                    "germanshepherd": ("Немецкая овчарка", "German Shepherd"),
                    "labrador": ("Лабрадор ретривер", "Labrador Retriever"),
                    "yorkshire": ("Йоркширский терьер", "Yorkshire Terrier"),
                    "jackrussell": ("Джек-рассел-терьер", "Jack Russell Terrier"),
                    "corgi": ("Вельш-корги пемброк", "Welsh Corgi Pembrok"),
                    "pomeranian": ("Померанский шпиц", "Pomeranian"),
                    "frenchbulldog": ("Французский бульдог", "French Bulldog"),
                    "husky": ("Сибирский хаски", "Siberian Husky"),
                    "akita": ("Акита-ину", "Akita Inu"),
                    "shiba": ("Сиба-ину", "Shiba Inu"),
                    "bordercollie": ("Бордер-колли", "Border Collie"),
                    "doberman": ("Доберман", "Doberman"),
                    "cane-corso": ("Кане-корсо", "Cane Corso"),
                    "alabai": ("Среднеазиатская овчарка", "Central Asian Shepherd"),
                    "malinois": ("Малинуа (Бельгийская овчарка)", "Malinois"),
                }),

                # --- РЕПТИЛИИ (Хладнокровные) ---
                ("reptiles", "Рептилии", "Reptiles", ["weight", "morph", "terrarium_type", "uv_index", "cites_status"], {
                    # Ящерицы
                    "leopard-gecko": ("Пятнистый эублефар", "Leopard Gecko"),
                    "bearded-dragon": ("Бородатая агама", "Bearded Dragon"),
                    "crested-gecko": ("Реснитчатый геккон-бананоед", "Crested Gecko"),
                    "chameleon-yemen": ("Йеменский хамелеон", "Veiled Chameleon"),
                    "chameleon-panther": ("Пантеровый хамелеон", "Panther Chameleon"),
                    "iguana-green": ("Зеленая игуана", "Green Iguana"),
                    "blue-tongue-skink": ("Синеязыкий сцинк", "Blue-tongued Skink"),
                    "tokay-gecko": ("Геккон Токи", "Tokay Gecko"),
                    
                    # Змеи
                    "corn-snake": ("Маисовый полоз", "Corn Snake"),
                    "ball-python": ("Королевский питон", "Ball Python"),
                    "boa-constrictor": ("Императорский удав", "Boa Constrictor"),
                    "king-snake": ("Королевская змея", "California Kingsnake"),
                    "milk-snake": ("Молочная змея", "Milk Snake"),
                    "hognose": ("Свиноносый уж", "Hognose Snake"),
                    
                    # Черепахи
                    "red-eared-slider": ("Красноухая черепаха (Водная)", "Red-eared Slider"),
                    "central-asian-tortoise": ("Среднеазиатская черепаха (Сухопутная)", "Central Asian Tortoise"),
                    "sulcata": ("Шпороносная черепаха", "Sulcata Tortoise"),
                }),

                # --- ПТИЦЫ (Пернатые) ---
                ("birds", "Птицы", "Birds", ["wing_span", "ring_number", "cites_status", "activity_level"], {
                    # Мелкие
                    "budgie": ("Волнистый попугай", "Budgie"),
                    "canary": ("Канарейка", "Canary"),
                    "zebra-finch": ("Зебровая амадина", "Zebra Finch"),
                    "lovebird": ("Неразлучник", "Lovebird"),
                    
                    # Средние
                    "cockatiel": ("Корелла", "Cockatiel"),
                    "rosella": ("Розелла", "Rosella"),
                    "ringneck": ("Ожереловый попугай", "Ringneck Parakeet"),
                    "sun-conure": ("Солнечная аратинга", "Sun Conure"),
                    "monk-parakeet": ("Попугай-монах", "Monk Parakeet"),
                    
                    # Крупные
                    "jacot": ("Жако (Серый попугай)", "African Grey"),
                    "macaw": ("Ара", "Macaw"),
                    "cockatoo": ("Какаду", "Cockatoo"),
                    "amazon": ("Амазон", "Amazon Parrot"),
                }),

                # --- АРАХНИДЫ И НАСЕКОМЫЕ ---
                ("arachnids", "Пауки и Насекомые", "Arachnids & Insects", ["leg_span", "terrarium_type", "morph"], {
                    "tarantula": ("Птицеед", "Tarantula"),
                    "scorpion": ("Скорпион", "Scorpion"),
                    "stick-insect": ("Палочник", "Stick Insect"),
                    "hissing-cockroach": ("Мадагаскарский таракан", "Hissing Cockroach"),
                    "praying-mantis": ("Богомол", "Praying Mantis"),
                }),

                # --- ГРЫЗУНЫ ---
                ("rodents", "Грызуны", "Rodents", ["weight", "coat_type"], {
                    "rat": ("Декоративная крыса", "Fancy Rat"),
                    "hamster-syrian": ("Сирийский хомяк", "Syrian Hamster"),
                    "hamster-djungarian": ("Джунгарский хомяк", "Djungarian Hamster"),
                    "guinea-pig": ("Морская свинка", "Guinea Pig"),
                    "chinchilla": ("Шиншилла", "Chinchilla"),
                    "degu": ("Дегу", "Degu"),
                    "rabbit": ("Кролик декоративный", "Rabbit"),
                }),

                # --- ФЕРМА: КРС ---
                ("cattle", "КРС (Коровы)", "Cattle", ["weight", "tag_number", "milk_yield", "fat_content"], {
                    "holstein": ("Голштинская", "Holstein"),
                    "jersey": ("Джерсейская", "Jersey"),
                    "hereford": ("Герефордская", "Hereford"),
                    "angus": ("Абердин-ангусская", "Aberdeen Angus"),
                    "simmental": ("Симментальская", "Simmental"),
                }),

                # --- ФЕРМА: ЛОШАДИ ---
                ("horses", "Лошади", "Horses", ["height", "weight", "tag_number", "pedigree_number"], {
                    "arabian": ("Арабская чистокровная", "Arabian"),
                    "thoroughbred": ("Английская чистокровная", "Thoroughbred"),
                    "friesian": ("Фризская", "Friesian"),
                    "orlov-trotter": ("Орловский рысак", "Orlov Trotter"),
                    "akhal-teke": ("Ахалтекинская", "Akhal-Teke"),
                }),

                # --- ФЕРМА: КОЗЫ И ОВЦЫ ---
                ("goats", "Козы и Овцы", "Goats & Sheep", ["weight", "tag_number", "milk_yield", "wool_quality"], {
                    "nubian": ("Англо-нубийская коза", "Anglo-Nubian"),
                    "saanen": ("Зааненская коза", "Saanen"),
                    "alpine": ("Альпийская коза", "Alpine"),
                    "merino": ("Меринос (овца)", "Merino Sheep"),
                    "romanov": ("Романовская (овца)", "Romanov Sheep"),
                }),

                # --- ФЕРМА: СВИНЬИ ---
                ("pigs", "Свиньи", "Pigs", ["weight", "tag_number", "slaughter_weight"], {
                    "large-white": ("Крупная белая", "Large White"),
                    "duroc": ("Дюрок", "Duroc"),
                    "vietnamese": ("Вьетнамская вислобрюхая", "Vietnamese Pot-bellied"),
                }),
            ]

            # --- Генерация категорий ---
            for sp_slug, sp_ru, sp_en, sp_attrs, breeds in species_structure:
                parent_cat, _ = Category.objects.update_or_create(
                    slug=sp_slug,
                    defaults={'name_ru': sp_ru, 'name_en': sp_en, 'parent': None}
                )
                
                # Привязка атрибутов к категории
                for a_slug in sp_attrs:
                    if a_slug in attrs:
                        parent_cat.attributes.add(attrs[a_slug])

                # Генерация пород (подкатегорий)
                for b_slug, (b_ru, b_en) in breeds.items():
                    full_b_slug = f"{sp_slug}-{b_slug}"
                    breed_cat, _ = Category.objects.update_or_create(
                        slug=full_b_slug,
                        defaults={'name_ru': b_ru, 'name_en': b_en, 'parent': parent_cat}
                    )
                    # Наследуем атрибуты от родителя
                    breed_cat.attributes.set(parent_cat.attributes.all())

            # ==========================================
            # 4. ТИПЫ СОБЫТИЙ (Event Types)
            # ==========================================
            event_types_data = [
                # --- МЕДИЦИНА ---
                {
                    "slug": "vaccine",
                    "cat": "medical",
                    "icon": "💉",
                    "ru": "Вакцинация",
                    "en": "Vaccination",
                    "schema": {"fields": [{"name": "drug_name", "label": "Препарат / Вакцина", "type": "text"}, {"name": "batch", "label": "Серия", "type": "text"}]}
                },
                {
                    "slug": "parasite",
                    "cat": "medical",
                    "icon": "💊",
                    "ru": "Обработка от паразитов",
                    "en": "Deworming / Parasite control",
                    "schema": {"fields": [{"name": "drug_name", "label": "Препарат", "type": "text"}]}
                },
                {
                    "slug": "checkup",
                    "cat": "medical",
                    "icon": "🩺",
                    "ru": "Осмотр врача",
                    "en": "Veterinary Checkup",
                    "schema": {}
                },
                {
                    "slug": "dental",
                    "cat": "medical",
                    "icon": "🦷",
                    "ru": "Стоматология / Зубы",
                    "en": "Dental Care",
                    "schema": {"fields": [{"name": "procedure", "label": "Процедура", "type": "text"}]}
                },
                
                # --- РЕПРОДУКЦИЯ ---
                {
                    "slug": "estrus",
                    "cat": "reproduction",
                    "icon": "🩸",
                    "ru": "Течка / Охота",
                    "en": "Estrus / Heat",
                    "schema": {}
                },
                {
                    "slug": "mating",
                    "cat": "reproduction",
                    "icon": "💞",
                    "ru": "Вязка / Случка",
                    "en": "Mating / Breeding",
                    "schema": {"fields": [{"name": "partner", "label": "Партнер", "type": "text"}]}
                },
                {
                    "slug": "ultrasound",
                    "cat": "reproduction",
                    "icon": "🖥️",
                    "ru": "УЗИ (Беременность)",
                    "en": "Ultrasound",
                    "schema": {"fields": [{"name": "result", "label": "Результат", "type": "select", "options": ["Беременна", "Нет"]}, {"name": "count", "label": "Кол-во", "type": "number"}]}
                },
                {
                    "slug": "birth",
                    "cat": "reproduction",
                    "icon": "🐣",
                    "ru": "Роды / Отел",
                    "en": "Birth",
                    "schema": {"fields": [{"name": "count", "label": "Живых", "type": "number"}]}
                },

                # --- УХОД И ФЕРМА ---
                {
                    "slug": "hoof_trimming",
                    "cat": "care",
                    "icon": "🦶",
                    "ru": "Расчистка копыт / Когтей",
                    "en": "Hoof / Claw Trimming",
                    "schema": {}
                },
                {
                    "slug": "shearing",
                    "cat": "care",
                    "icon": "✂️",
                    "ru": "Стрижка / Груминг",
                    "en": "Grooming / Shearing",
                    "schema": {"fields": [{"name": "weight", "label": "Настриг (кг)", "type": "number"}]}
                },
                {
                    "slug": "milking_test",
                    "cat": "care",
                    "icon": "🥛",
                    "ru": "Контрольная дойка",
                    "en": "Control Milking",
                    "schema": {"fields": [{"name": "volume", "label": "Объем (л)", "type": "number"}, {"name": "fat", "label": "Жирность (%)", "type": "number"}]}
                },
                {
                    "slug": "molting",
                    "cat": "care",
                    "icon": "🐍",
                    "ru": "Линька",
                    "en": "Molting / Shedding",
                    "schema": {"fields": [{"name": "quality", "label": "Качество (Цельный чулок?)", "type": "checkbox"}]}
                },

                # --- ВЫСТАВКИ ---
                {
                    "slug": "show",
                    "cat": "show",
                    "icon": "🏆",
                    "ru": "Выставка",
                    "en": "Show",
                    "schema": {"fields": [{"name": "judge", "label": "Судья", "type": "text"}, {"name": "rank", "label": "Титул", "type": "text"}]}
                },
            ]

            for et in event_types_data:
                EventType.objects.update_or_create(
                    slug=et['slug'],
                    defaults={
                        'name_ru': et['ru'],
                        'name_en': et['en'],
                        'category': et['cat'],
                        'icon': et.get('icon'),
                        'default_schema': et.get('schema', {}),
                        'is_universal': True
                    }
                )

        self.stdout.write(self.style.SUCCESS('--- PETVET ENCYCLOPEDIA LOADED SUCCESSFULLY 🚀 ---'))