import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
// [ВАЖНО] AttributeType теперь включает attr_type и options,
// поэтому хук автоматически научится работать с новыми полями.
import { 
  PetDetail, PetPayload, Category, PetTag, AttributeType 
} from '@/types/pet'; 

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

export type PetFormMode = 'create_own' | 'create_patient' | 'edit';

interface UsePetFormProps {
  mode: PetFormMode;
  initialData?: PetDetail | null;
  onSuccess?: (data?: any) => void;
}

export const usePetForm = ({ mode, initialData, onSuccess }: UsePetFormProps) => {
  const router = useRouter();

  // === UI STATES ===
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // === DICTIONARIES ===
  // Здесь хранятся определения атрибутов, которые приходят с бэкенда.
  // Благодаря обновленному AttributeType, здесь уже будут лежать attr_type и options.
  const [dictionaries, setDictionaries] = useState({
    categories: [] as Category[],
    tags: [] as PetTag[],
    attributes: [] as AttributeType[],
  });

  // === FORM DATA ===
  const initialFormState = {
    name: '',
    gender: '' as 'M' | 'F' | '',
    birth_date: '',
    description: '',
    
    selectedCategoryId: null as number | null,
    selectedBreedId: null as number | null,
    
    tagSlugs: [] as string[],
    // EAV-хранилище: ключ (slug) -> значение (строка).
    // Даже для Checkbox ("true"/"false") или Number ("10.5") храним строку.
    attributeValues: {} as Record<string, string>,
    
    motherId: null as number | null,
    fatherId: null as number | null,

    is_public: false,
    tempOwnerName: '',
    tempOwnerPhone: '',
  };

  const [formData, setFormData] = useState(initialFormState);
  const [files, setFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);

  // === RESET FUNCTION ===
  const reset = () => {
    setStep(1);
    setFormData(initialFormState);
    setFiles([]);
    setPreviewUrls(prev => {
        prev.forEach(url => URL.revokeObjectURL(url));
        return [];
    });
    setError(null);
    setIsSubmitting(false);
  };

  // === CUSTOM DATA CREATION ===
  const createCustomTag = async (name: string) => {
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`${API_URL}/api/tags/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ name })
      });

      if (res.ok) {
        const newTag: PetTag = await res.json();
        setDictionaries(prev => ({ ...prev, tags: [...prev.tags, newTag] }));
        toggleTag(newTag.slug);
      }
    } catch (e) {
      console.error("Ошибка создания тега", e);
    }
  };

  const createCustomAttribute = async (name: string, unit: string = '') => {
    try {
      const token = localStorage.getItem('access_token');
      // При создании атрибута фронтендом, бэкенд выставит attr_type='text' по умолчанию.
      // Если вы захотите дать юзеру выбор типа, нужно будет добавить поле attr_type в body.
      const res = await fetch(`${API_URL}/api/attributes/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ name, unit })
      });

      if (res.ok) {
        const newAttr: AttributeType = await res.json();
        // Добавляем новый атрибут в словарь, чтобы он сразу появился в форме
        setDictionaries(prev => ({ ...prev, attributes: [...prev.attributes, newAttr] }));
      }
    } catch (e) {
      console.error("Ошибка создания атрибута", e);
    }
  };

  // === FETCH DATA ===
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const catRes = await fetch(`${API_URL}/api/categories/`);
        const cats: Category[] = await catRes.json();
        
        setDictionaries(prev => ({ ...prev, categories: cats }));

        if (mode === 'edit' && initialData) {
          mapInitialDataToForm(initialData, cats);
        }

      } catch (err) {
        console.error(err);
        setError('Ошибка загрузки справочников');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [mode, initialData]);

  const fetchCategoryDetails = async (categoryId: number) => {
    try {
      const [tagsRes, attrsRes] = await Promise.all([
        fetch(`${API_URL}/api/categories/${categoryId}/tags/`),
        fetch(`${API_URL}/api/categories/${categoryId}/attributes/`)
      ]);
      
      if (tagsRes.ok && attrsRes.ok) {
        const tagsData: PetTag[] = await tagsRes.json();
        const attrsData: AttributeType[] = await attrsRes.json();

        // Здесь attrsData уже содержит attr_type и options, благодаря вашему сериализатору.
        setDictionaries(prev => ({
          ...prev,
          tags: tagsData,
          attributes: attrsData
        }));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const mapInitialDataToForm = (pet: PetDetail, allCats: Category[]) => {
    const parentCat = pet.categories?.find(c => !c.parent);
    const breedCat = pet.categories?.find(c => c.parent);

    const attrMap: Record<string, string> = {};
    // Заполняем значения. Typescript не ругается, так как value всегда string.
    pet.attributes?.forEach(pa => {
      attrMap[pa.attribute.slug] = pa.value;
    });

    setFormData({
      name: pet.name,
      gender: pet.gender,
      birth_date: pet.birth_date || '',
      description: pet.description || '',
      
      selectedCategoryId: parentCat ? parentCat.id : null,
      selectedBreedId: breedCat ? breedCat.id : null,
      
      tagSlugs: pet.tags?.map(t => t.slug) || [],
      attributeValues: attrMap,
      
      motherId: pet.mother?.id || null,
      fatherId: pet.father?.id || null,
      
      is_public: pet.is_public,
      tempOwnerName: pet.temp_owner_name || '',
      tempOwnerPhone: pet.temp_owner_phone || '',
    });
    
    if (parentCat) {
       fetchCategoryDetails(parentCat.id);
    }
  };

  // === HANDLERS ===
  const updateField = (field: keyof typeof formData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError(null);
  };

  const handleCategorySelect = (id: number) => {
    if (formData.selectedCategoryId !== id) {
      updateField('selectedCategoryId', id);
      updateField('selectedBreedId', null);
      fetchCategoryDetails(id);
    }
  };

  const toggleTag = (slug: string) => {
    setFormData(prev => {
      const exists = prev.tagSlugs.includes(slug);
      return {
        ...prev,
        tagSlugs: exists 
          ? prev.tagSlugs.filter(s => s !== slug) 
          : [...prev.tagSlugs, slug]
      };
    });
  };

  const setAttributeValue = (slug: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      attributeValues: { ...prev.attributeValues, [slug]: value }
    }));
  };

  // === FILES ===
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      const validFiles = newFiles.filter(f => f.size <= 5 * 1024 * 1024);
      
      if (files.length + validFiles.length > 5) {
        setError("Максимум 5 фотографий");
        return;
      }

      setFiles(prev => [...prev, ...validFiles]);
      setPreviewUrls(prev => [...prev, ...validFiles.map(f => URL.createObjectURL(f))]);
    }
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
    URL.revokeObjectURL(previewUrls[index]);
    setPreviewUrls(prev => prev.filter((_, i) => i !== index));
  };

  // === NAVIGATION ===
  const validateStep = (currentStep: number): boolean => {
    if (currentStep === 1) {
      if (!formData.name) { setError('Введите кличку'); return false; }
      if (!formData.gender) { setError('Выберите пол'); return false; }
      if (!formData.selectedCategoryId) { setError('Выберите вид животного'); return false; }
      
      if (mode === 'create_patient' && !formData.tempOwnerPhone) {
        setError('Телефон владельца обязателен'); return false;
      }
    }
    // Шаг 2 (Атрибуты) валидируем только если нужно. Сейчас они опциональны.
    return true;
  };

  const nextStep = () => {
    if (validateStep(step)) {
      setStep(prev => prev + 1);
      setError(null);
    }
  };

  const prevStep = () => {
    if (step > 1) setStep(prev => prev - 1);
  };

  // === SUBMIT ===
  const submit = async () => {
    setIsSubmitting(true);
    setError(null);

    const token = localStorage.getItem('access_token');
    
    const categoriesToSend = [];
    if (formData.selectedCategoryId) categoriesToSend.push(formData.selectedCategoryId);
    if (formData.selectedBreedId) categoriesToSend.push(formData.selectedBreedId);

    // Сборка атрибутов для отправки.
    // Фильтруем пустые значения, чтобы не слать мусор.
    // Если тип checkbox ("true"/"false"), они не пустые, поэтому пройдут.
    // Если тип number ("0"), он не пустой (строка "0"), поэтому пройдет.
    const attributesPayload = Object.entries(formData.attributeValues)
      .filter(([_, val]) => val.trim() !== '') 
      .map(([slug, val]) => ({ attribute_slug: slug, value: val }));

    const payload: PetPayload = {
      name: formData.name,
      gender: formData.gender as 'M' | 'F',
      birth_date: formData.birth_date || null,
      description: formData.description,
      is_public: formData.is_public,
      
      categories: categoriesToSend,
      tags: formData.tagSlugs,
      attributes: attributesPayload,
      
      mother: formData.motherId,
      father: formData.fatherId,
      
      temp_owner_name: mode === 'create_patient' ? formData.tempOwnerName : undefined,
      temp_owner_phone: mode === 'create_patient' ? formData.tempOwnerPhone : undefined,
    };

    try {
      const url = mode === 'edit' && initialData 
        ? `${API_URL}/api/pets/${initialData.id}/` 
        : `${API_URL}/api/pets/`;
      
      const method = mode === 'edit' ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errData = await res.json();
        // Красивый вывод ошибок
        const msg = Object.values(errData).flat().join(', ');
        throw new Error(msg || 'Ошибка сохранения');
      }

      const responseData = await res.json();
      const petId = responseData.id;

      // Upload Images
      if (files.length > 0) {
        for (const file of files) {
          const formDataImg = new FormData();
          formDataImg.append('image', file);
          if (file === files[0] && mode !== 'edit') { 
             formDataImg.append('is_main', 'true');
          }

          await fetch(`${API_URL}/api/pets/${petId}/upload_image/`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` },
            body: formDataImg
          });
        }
      }

      if (onSuccess) onSuccess(responseData);

    } catch (err: any) {
      setError(err.message || 'Произошла ошибка');
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    step,
    formData,
    dictionaries,
    files,
    previewUrls,
    isLoading,
    isSubmitting,
    error,
    createCustomTag,
    createCustomAttribute,
    reset,

    updateField,
    handleCategorySelect,
    toggleTag,
    setAttributeValue,
    handleFileChange,
    removeFile,
    
    nextStep,
    prevStep,
    submit
  };
};