from modeltranslation.translator import register, TranslationOptions
from .models import Category, Attribute, Tag, EventType
# Для каждой модели создаем класс настроек
# Указываем только те поля, которые требуют перевода (обычно название и описание)

@register(Category)
class CategoryTranslationOptions(TranslationOptions):
    fields = ('name',) 
    # Если есть description, добавь: fields = ('name', 'description')

@register(Attribute)
class AttributeTranslationOptions(TranslationOptions):
    fields = ('name',)
    # Поле 'unit' (ед. измерения) тоже можно перевести, если нужно:
    # fields = ('name', 'unit')

@register(Tag)
class TagTranslationOptions(TranslationOptions):
    fields = ('name',)

@register(EventType)
class EventTypeTranslationOptions(TranslationOptions):
    fields = ('name',) # Мы переводим только название. Иконки и слаги общие.