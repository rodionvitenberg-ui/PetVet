// constants/dictionaries.ts

export interface AttributeOption {
  id?: number;
  value: string;
}

export interface AttributeType {
  id?: number; // Опционально для моков
  slug: string;
  name: string; 
  type: 'text' | 'number' | 'select' | 'date';
  options?: string[]; 
  unit?: string; // Единица измерения (кг, см)
}

export interface PetCategory {
  id: number;
  slug: string;
  name: string;
  icon: string;
  availableAttributes: AttributeType[];
}

export interface PetTag {
  id: number;
  slug: string;
  name: string;
  color: string;
}

// === ТЕГИ (Базовые) ===
export const MOCK_TAGS: PetTag[] = [
  { id: 1, slug: 'sterilized', name: 'Стерилизован', color: '#10B981' }, // Green
  { id: 2, slug: 'vaccinated', name: 'Вакцинирован', color: '#3B82F6' }, // Blue
  { id: 3, slug: 'chipped', name: 'Чипирован', color: '#8B5CF6' },      // Purple
  { id: 4, slug: 'passport', name: 'Есть паспорт', color: '#F59E0B' },   // Orange
  { id: 5, slug: 'exotic', name: 'Требует лицензии', color: '#EF4444' }, // Red
];

// === АТРИБУТЫ (Из твоей "Энциклопедии" init_data.py) ===

// Общие для экстерьера
const ATTR_COAT = { slug: 'coat_type', name: 'Тип шерсти/чешуи', type: 'text' as const };
const ATTR_EYES = { slug: 'eye_color', name: 'Цвет глаз', type: 'text' as const };

// Для птиц
const ATTR_RING = { slug: 'ring_number', name: 'Номер кольца', type: 'text' as const };
const ATTR_WING = { slug: 'wing_span', name: 'Размах крыльев', type: 'number' as const, unit: 'см' };

// Для рептилий
const ATTR_TERRARIUM = { slug: 'terrarium_size', name: 'Размер террариума', type: 'text' as const };
const ATTR_HEATING = { slug: 'heating_type', name: 'Тип обогрева', type: 'text' as const };

// Для сельхоз
const ATTR_TAG = { slug: 'tag_number', name: 'Номер бирки/Тавро', type: 'text' as const };
const ATTR_MILK = { slug: 'milk_volume', name: 'Удой (средний)', type: 'number' as const, unit: 'л' };

// === КАТЕГОРИИ ===

export const MOCK_CATEGORIES: PetCategory[] = [
  {
    id: 1,
    slug: 'cat',
    name: 'Кошка',
    icon: '🐱',
    availableAttributes: [ATTR_COAT, ATTR_EYES]
  },
  {
    id: 2,
    slug: 'dog',
    name: 'Собака',
    icon: '🐶',
    availableAttributes: [
      ATTR_COAT, 
      ATTR_EYES,
      { slug: 'training', name: 'Дрессировка', type: 'text' }
    ]
  },
  {
    id: 3,
    slug: 'rodent',
    name: 'Грызун', // Хомяки, Крысы, Кролики
    icon: '🐹',
    availableAttributes: [ATTR_COAT]
  },
  {
    id: 4,
    slug: 'bird',
    name: 'Птица',
    icon: '🦜',
    availableAttributes: [ATTR_RING, ATTR_WING, ATTR_EYES]
  },
  {
    id: 5,
    slug: 'reptile',
    name: 'Рептилия',
    icon: '🦎',
    availableAttributes: [
      { slug: 'coat_type', name: 'Тип чешуи', type: 'text' }, // Переопределили название для контекста
      ATTR_TERRARIUM,
      ATTR_HEATING
    ]
  },
  {
    id: 6,
    slug: 'horse',
    name: 'Лошадь',
    icon: '🐎',
    availableAttributes: [
      ATTR_TAG,
      { slug: 'height', name: 'Высота в холке', type: 'number', unit: 'см' },
      ATTR_COAT
    ]
  },
  {
    id: 7,
    slug: 'farm',
    name: 'Ферма', // Козы, Овцы, Коровы
    icon: '🐄',
    availableAttributes: [ATTR_TAG, ATTR_MILK, ATTR_COAT]
  },
  {
    id: 8,
    slug: 'aquarium',
    name: 'Аквариум',
    icon: '🐠',
    availableAttributes: [
        { slug: 'water_type', name: 'Тип воды', type: 'select', options: ['Преслая', 'Морская'] }
    ]
  },
  {
    id: 9,
    slug: 'exotic',
    name: 'Экзот', // Пауки, Насекомые
    icon: '🕷️',
    availableAttributes: [ATTR_TERRARIUM]
  }
];