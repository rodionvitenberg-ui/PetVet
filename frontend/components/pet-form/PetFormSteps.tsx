'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Check, HelpCircle, Plus, Trash2, UserPlus, Phone, Globe, Lock, Search, X, ChevronDown, Calendar
} from 'lucide-react';
import { Category, PetTag, AttributeType, PetFormData } from '@/types/pet';
import { PetFormMode } from '@/hooks/usePetForm';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

// =========================================================================
// 1. ATTRIBUTE INPUT
// =========================================================================

interface AttributeInputProps {
  attr: AttributeType;
  value: string;
  onChange: (value: string) => void;
}

const AttributeInput = ({ attr, value, onChange }: AttributeInputProps) => {
  const baseClasses = "w-full px-4 py-3 rounded-xl bg-muted focus:bg-card focus:border-primary border border-transparent outline-none transition text-sm font-medium";

  switch (attr.attr_type) {
    case 'select':
      return (
        <div className="relative">
          <select
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className={`${baseClasses} appearance-none cursor-pointer`}
          >
            <option value="">Not specified</option>
            {attr.options?.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" size={16} />
        </div>
      );

    case 'checkbox':
      const isChecked = value === 'true';
      return (
        <button
          type="button"
          onClick={() => onChange(isChecked ? 'false' : 'true')}
          className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition w-full text-left ${
            isChecked
              ? 'bg-primary/10 border-primary text-primary'
              : 'bg-muted border-transparent text-muted-foreground hover:bg-muted'
          }`}
        >
          <div className={`w-5 h-5 rounded border flex items-center justify-center transition flex-shrink-0 ${
            isChecked ? 'bg-primary border-primary' : 'bg-card border-border'
          }`}>
            {isChecked && <Check size={12} className="text-primary-foreground" />}
          </div>
          <span className="text-sm font-medium">
            {isChecked ? 'Yes' : 'No'}
          </span>
        </button>
      );

    case 'date':
      return (
        <div className="relative">
          <input
            type="date"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className={`${baseClasses} appearance-none`}
          />
          {!value && <Calendar className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" size={16} />}
        </div>
      );

    case 'number':
      return (
        <input
          type="number"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="0"
          className={baseClasses}
          step="any"
        />
      );

    case 'text':
    default:
      return (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="—"
          className={baseClasses}
        />
      );
  }
};

// =========================================================================
// 2. PET SEARCH SELECT
// =========================================================================

interface PetSearchSelectProps {
  label: string;
  gender: 'M' | 'F';
  categoryId: number | null;
  value: number | null;
  onChange: (id: number | null) => void;
  placeholder?: string;
}

const PetSearchSelect = ({ label, gender, categoryId, value, onChange, placeholder }: PetSearchSelectProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [options, setOptions] = useState<{ id: number; name: string }[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedName, setSelectedName] = useState('');

  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const fetchPets = async () => {
      setIsLoading(true);
      try {
        const token = localStorage.getItem('access_token');
        const params = new URLSearchParams({
          gender,
          is_active: 'true'
        });
        if (search) params.append('search', search);
        if (categoryId) params.append('category_id', String(categoryId));

        const res = await fetch(`${API_URL}/api/pets/?${params.toString()}`, {
          headers: token ? { 'Authorization': `Bearer ${token}` } : {}
        });

        if (res.ok) {
          const data = await res.json();
          const results = Array.isArray(data) ? data : data.results || [];
          setOptions(results);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setIsLoading(false);
      }
    };
    const debounce = setTimeout(fetchPets, 300);
    return () => clearTimeout(debounce);
  }, [search, isOpen, gender, categoryId]);

  const handleSelect = (pet: { id: number; name: string }) => {
    onChange(pet.id);
    setSelectedName(pet.name);
    setIsOpen(false);
    setSearch('');
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(null);
    setSelectedName('');
    setSearch('');
  };

  const displayValue = selectedName || options.find(o => o.id === value)?.name || (value ? `ID: ${value}` : '');

  return (
    <div className="relative" ref={containerRef}>
      <label className="block text-xs font-bold text-muted-foreground mb-1">{label}</label>
      <div
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center justify-between px-3 py-2.5 border rounded-xl bg-card cursor-pointer transition ${
          isOpen ? 'border-primary ring-2 ring-primary/20' : 'border-border hover:border-primary/40'
        }`}
      >
        <div className="flex items-center gap-2 overflow-hidden">
          <Search size={14} className="text-muted-foreground shrink-0" />
          {value ? (
            <span className="text-sm font-bold text-foreground truncate">
              {displayValue}
            </span>
          ) : (
            <span className="text-sm text-muted-foreground truncate">{placeholder || "Select..."}</span>
          )}
        </div>

        {value ? (
          <button onClick={handleClear} className="p-1 hover:bg-muted rounded-full text-muted-foreground hover:text-destructive">
            <X size={14} />
          </button>
        ) : (
          <ChevronDown size={14} className="text-muted-foreground" />
        )}
      </div>

      {isOpen && (
        <div className="absolute z-10 w-full mt-1 bg-card border border-border rounded-xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95">
          <div className="p-2 border-b border-border">
            <input
              autoFocus
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by name..."
              className="w-full text-sm outline-none px-2 py-1"
            />
          </div>
          <div className="max-h-48 overflow-y-auto custom-scrollbar">
            {isLoading ? (
              <div className="p-4 text-center text-xs text-muted-foreground">Loading...</div>
            ) : options.length > 0 ? (
              options.map(pet => (
                <button
                  key={pet.id}
                  onClick={() => handleSelect(pet)}
                  className="w-full text-left px-4 py-2 text-sm hover:bg-primary/10 text-foreground flex items-center justify-between group"
                >
                  <span>{pet.name}</span>
                  {value === pet.id && <Check size={14} className="text-primary" />}
                </button>
              ))
            ) : (
              <div className="p-4 text-center text-xs text-muted-foreground">No results found</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// =========================================================================
// 3. STEP 1: BASIC INFO
// =========================================================================

interface StepBasicInfoProps {
  data: PetFormData;
  categories: Category[];
  mode: PetFormMode;
  onChange: <K extends keyof PetFormData>(field: K, value: PetFormData[K]) => void;
  onCategorySelect: (id: number) => void;
}

export const StepBasicInfo = ({ data, categories, mode, onChange, onCategorySelect }: StepBasicInfoProps) => {
  return (
    <div className="space-y-6 animate-in slide-in-from-right-4">
      {mode === 'create_patient' && (
        <div className="bg-primary/10 p-4 rounded-2xl border border-primary/15 space-y-3">
          <div className="flex items-center gap-2 text-primary font-bold text-sm">
            <UserPlus size={16} />
            Owner Data
          </div>
          <div className="grid grid-cols-1 gap-3">
            <input
              type="text"
              placeholder="Name (e.g., Anna)"
              value={data.tempOwnerName}
              onChange={e => onChange('tempOwnerName', e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-card border border-primary/15 focus:border-primary/40 outline-none text-sm transition"
            />
            <div className="relative">
              <Phone size={16} className="absolute left-3 top-3 text-muted-foreground" />
              <input
                type="tel"
                placeholder="Phone (required)"
                value={data.tempOwnerPhone}
                onChange={e => onChange('tempOwnerPhone', e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-card border border-primary/15 focus:border-primary/40 outline-none text-sm transition font-medium"
              />
            </div>
          </div>
        </div>
      )}

      <div>
        <label className="block text-sm font-bold text-foreground mb-2">Species</label>
        <div className="grid grid-cols-3 gap-3">
          {categories.filter((c) => !c.parent).map((cat) => {
            const isActive = data.selectedCategoryId === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => onCategorySelect(cat.id)}
                className={`flex flex-col items-center justify-center p-3 rounded-2xl border-2 transition active:scale-95 ${
                  isActive
                    ? 'border-primary bg-primary/10 text-primary shadow-sm'
                    : 'border-border bg-muted hover:border-border'
                }`}
              >
                <div className="mb-1 w-8 h-8 flex items-center justify-center">
                  <HelpCircle className="text-muted-foreground" />
                </div>
                <span className="text-xs font-bold capitalize text-center leading-tight">{cat.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {data.selectedCategoryId && categories.some((c) => c.parent === data.selectedCategoryId) && (
        <div className="animate-in fade-in slide-in-from-top-2">
          <label className="block text-sm font-bold text-foreground mb-2">Breed</label>
          <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
            {categories.filter((c) => c.parent === data.selectedCategoryId).map((breed) => (
              <button
                key={breed.id}
                onClick={() => onChange('selectedBreedId', breed.id)}
                className={`px-3 py-2 text-sm rounded-xl border text-left transition truncate ${
                  data.selectedBreedId === breed.id
                    ? 'border-primary bg-primary/10 text-primary font-bold'
                    : 'border-border bg-card hover:border-border text-foreground'
                }`}
              >
                {breed.name}
              </button>
            ))}

            <button
              onClick={() => onChange('selectedBreedId', null)}
              className={`px-3 py-2 text-sm rounded-xl border transition text-left ${
                !data.selectedBreedId
                  ? 'border-primary bg-primary/10 text-primary font-bold shadow-sm'
                  : 'border-dashed border-border bg-card text-muted-foreground hover:border-primary/50 hover:text-primary'
              }`}
            >
              Other / Don't know
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <label className="block text-sm font-bold text-foreground mb-2">Name</label>
          <input type="text" value={data.name} onChange={e => onChange('name', e.target.value)}
            className="w-full px-4 py-3 rounded-xl bg-muted focus:bg-card border border-transparent focus:border-primary outline-none transition" />
        </div>
        <button onClick={() => onChange('gender', 'M')} className={`py-3 rounded-xl border-2 font-medium transition ${data.gender === 'M' ? 'border-primary bg-primary/10 text-primary' : 'bg-muted border-transparent'}`}>Male</button>
        <button onClick={() => onChange('gender', 'F')} className={`py-3 rounded-xl border-2 font-medium transition ${data.gender === 'F' ? 'border-accent bg-accent/15 text-accent-foreground' : 'bg-muted border-transparent'}`}>Female</button>

        <div className="col-span-2">
          <label className="block text-sm font-bold text-foreground mb-2">Birth Date</label>
          <input type="date" value={data.birth_date} onChange={e => onChange('birth_date', e.target.value)}
            className="w-full px-4 py-3 rounded-xl bg-muted focus:bg-card border border-transparent focus:border-primary outline-none transition" />
        </div>
      </div>

      {mode === 'create_own' && (
        <div className="bg-muted p-4 rounded-2xl border border-border flex items-start gap-3 cursor-pointer" onClick={() => onChange('is_public', !data.is_public)}>
          <div className={`mt-1 w-5 h-5 rounded-md border-2 flex items-center justify-center transition flex-shrink-0 ${data.is_public ? 'bg-primary border-primary' : 'border-border bg-card'}`}>
            {data.is_public && <Check size={14} className="text-primary-foreground" />}
          </div>
          <div>
            <div className="font-bold text-sm text-foreground flex items-center gap-2">
              {data.is_public ? <Globe size={16} className="text-primary" /> : <Lock size={16} className="text-muted-foreground" />}
              {data.is_public ? 'Public Profile' : 'Private Profile'}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Visible in the general feed and search.</p>
          </div>
        </div>
      )}
    </div>
  );
};

// =========================================================================
// 4. STEP 2: DETAILS
// =========================================================================

interface StepDetailsProps {
  data: PetFormData;
  onChange: <K extends keyof PetFormData>(field: K, value: PetFormData[K]) => void;
  onAttributeChange: (slug: string, value: string) => void;
  onTagToggle: (slug: string) => void;
  onCreateTag: (name: string) => void;
  onCreateAttribute: (name: string, unit: string) => void;
  attributes: AttributeType[];
  tags: PetTag[];
}

export const StepDetails = ({
  data, onAttributeChange, onTagToggle,
  attributes, tags,
  onCreateTag, onCreateAttribute,
  onChange
}: StepDetailsProps) => {

  const [isAddingTag, setIsAddingTag] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [isAddingAttr, setIsAddingAttr] = useState(false);
  const [newAttrName, setNewAttrName] = useState('');
  const [newAttrUnit, setNewAttrUnit] = useState('');

  const filteredTags = tags.filter(t => !t.target_gender || t.target_gender === data.gender);

  const handleSaveTag = () => {
    if (newTagName.trim()) {
      onCreateTag(newTagName);
      setNewTagName('');
      setIsAddingTag(false);
    }
  };

  const handleSaveAttr = () => {
    if (newAttrName.trim()) {
      onCreateAttribute(newAttrName, newAttrUnit);
      setNewAttrName('');
      setNewAttrUnit('');
      setIsAddingAttr(false);
    }
  };

  return (
    <div className="space-y-8 animate-in slide-in-from-right-4">
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-foreground">Characteristics</h3>
        <div className="space-y-4">
          {attributes.map(attr => (
            <div key={attr.id}>
              <label className="block text-[10px] font-bold text-muted-foreground mb-1.5 uppercase tracking-wider flex items-center gap-2">
                {attr.name} {attr.unit && <span className="text-muted-foreground normal-case">({attr.unit})</span>}
                {attr.is_custom && <span className="text-[9px] bg-accent/15 text-accent-foreground px-1.5 rounded-full normal-case">Custom</span>}
              </label>

              <AttributeInput
                attr={attr}
                value={data.attributeValues[attr.slug] || ''}
                onChange={(val) => onAttributeChange(attr.slug, val)}
              />
            </div>
          ))}
        </div>

        {isAddingAttr ? (
          <div className="p-3 bg-primary/10 rounded-xl border border-primary/15 flex gap-2 items-center animate-in fade-in zoom-in-95 mt-2">
            <input autoFocus placeholder="Name" value={newAttrName} onChange={e => setNewAttrName(e.target.value)} className="flex-1 px-3 py-2 rounded-lg text-xs border border-primary/20 outline-none" />
            <input placeholder="Unit" value={newAttrUnit} onChange={e => setNewAttrUnit(e.target.value)} className="w-16 px-3 py-2 rounded-lg text-xs border border-primary/20 outline-none" />
            <button onClick={handleSaveAttr} className="p-2 bg-primary text-primary-foreground rounded-lg"><Check size={14} /></button>
            <button onClick={() => setIsAddingAttr(false)} className="p-2 text-muted-foreground hover:bg-card rounded-lg"><X size={14} /></button>
          </div>
        ) : (
          <button onClick={() => setIsAddingAttr(true)} className="w-full py-3 rounded-xl border border-dashed border-border text-muted-foreground text-xs font-bold hover:border-primary/50 hover:text-primary transition flex items-center justify-center gap-2 mt-2">
            <Plus size={14} /> Add Custom Characteristic
          </button>
        )}
      </div>

      <hr className="border-border" />

      <div>
        <h3 className="text-sm font-bold text-foreground mb-3">Features</h3>
        <div className="flex flex-wrap gap-2">
          {filteredTags.map(tag => {
            const isSelected = data.tagSlugs.includes(tag.slug);
            return (
              <button key={tag.id} onClick={() => onTagToggle(tag.slug)}
                className={`px-4 py-2 rounded-full text-xs font-bold border transition flex items-center gap-1 ${
                  isSelected ? 'bg-primary text-primary-foreground border-primary' : 'bg-card border-border hover:border-border text-muted-foreground'
                }`}>
                {isSelected && <Check size={12} />} {tag.name}
              </button>
            );
          })}

          {isAddingTag ? (
            <div className="flex items-center gap-1 animate-in fade-in zoom-in-95">
              <input autoFocus value={newTagName} onChange={e => setNewTagName(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSaveTag()} placeholder="New tag..." className="w-32 px-3 py-2 rounded-full text-xs border border-primary/40 outline-none" />
              <button onClick={handleSaveTag} className="p-1.5 bg-primary text-primary-foreground rounded-full"><Check size={12} /></button>
              <button onClick={() => setIsAddingTag(false)} className="p-1.5 text-muted-foreground hover:text-destructive"><X size={12} /></button>
            </div>
          ) : (
            <button onClick={() => setIsAddingTag(true)} className="px-3 py-2 rounded-full text-xs font-bold border border-dashed border-border text-muted-foreground hover:border-primary/50 hover:text-primary transition flex items-center gap-1">
              <Plus size={12} /> Custom Tag
            </button>
          )}
        </div>
      </div>

      <hr className="border-border" />

      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-foreground">Parents</h3>
          <span className="text-[10px] text-muted-foreground bg-muted px-2 py-1 rounded-lg">Optional</span>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <PetSearchSelect
              label="Mother"
              gender="F"
              categoryId={data.selectedCategoryId}
              value={data.motherId}
              onChange={(id) => onChange('motherId', id)}
              placeholder="Search mother..."
            />
          </div>
          <div>
            <PetSearchSelect
              label="Father"
              gender="M"
              categoryId={data.selectedCategoryId}
              value={data.fatherId}
              onChange={(id) => onChange('fatherId', id)}
              placeholder="Search father..."
            />
          </div>
        </div>

        <p className="text-[10px] text-muted-foreground mt-2 leading-relaxed">
          Search works on your database of animals. Parent must be of the same breed.
        </p>
      </div>
    </div>
  );
};

// =========================================================================
// 5. STEP 3: PHOTOS
// =========================================================================

interface StepPhotosProps {
  files: File[];
  previewUrls: string[];
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemove: (index: number) => void;
}

// ponytail: previewUrls are blob: URLs (URL.createObjectURL) — next/image can't optimize
// them, so a plain <img> is correct here.
export const StepPhotos = ({ files, previewUrls, onFileChange, onRemove }: StepPhotosProps) => {
  return (
    <div className="p-6 grid grid-cols-3 gap-3 animate-in slide-in-from-right-4">
      {previewUrls.map((url, idx) => (
        <div key={idx} className="relative aspect-square rounded-xl overflow-hidden group border border-border">
          <img src={url} className="w-full h-full object-cover" alt="preview" />
          <button onClick={() => onRemove(idx)} className="absolute top-1 right-1 p-1 bg-destructive rounded-full text-destructive-foreground opacity-0 group-hover:opacity-100 transition"><Trash2 size={14} /></button>
        </div>
      ))}
      {files.length < 5 && (
        <label className="aspect-square rounded-xl border-2 border-dashed border-border flex flex-col items-center justify-center cursor-pointer hover:border-primary hover:bg-primary/10 transition text-muted-foreground hover:text-primary">
          <Plus size={24} />
          <input type="file" accept="image/*" multiple className="hidden" onChange={onFileChange} />
        </label>
      )}
    </div>
  );
};