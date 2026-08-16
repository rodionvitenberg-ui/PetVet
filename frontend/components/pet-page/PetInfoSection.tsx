'use client';

import React from 'react';
import { FileText, ImageIcon, Edit2, Trash2, ChevronRight, FileDown } from 'lucide-react';
import { PetDetail } from '@/types/pet';
import { getMediaUrl } from '@/components/dashboard/PetDetailUtils';

interface PetInfoSectionProps {
  pet: PetDetail;
  canDelete: boolean;
  onGalleryOpen: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onParentClick: (parentId: number) => void;
  pdfTrigger?: React.ReactNode;
}

const InfoCard = ({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) => (
  <div className="p-3 bg-muted rounded-xl border border-border flex items-center gap-3 hover:border-primary/30 transition-colors">
    <div className="w-10 h-10 rounded-full bg-card flex items-center justify-center shadow-sm shrink-0 overflow-hidden p-2 text-muted-foreground">
      {icon}
    </div>
    <div className="overflow-hidden">
      <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider truncate mb-0.5">{label}</p>
      <p className="font-bold text-foreground truncate text-sm">{value}</p>
    </div>
  </div>
);

export default function PetInfoSection({ pet, canDelete, onGalleryOpen, onEdit, onDelete, onParentClick, pdfTrigger }: PetInfoSectionProps) {
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
      {pet.tags && pet.tags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {pet.tags.map((tag, index) => (
            <span
              key={tag.id || index}
              className="px-4 py-2 bg-card rounded-xl text-xs font-bold text-foreground flex items-center gap-2 border border-border shadow-sm"
            >
              {tag.icon && <img src={getMediaUrl(tag.icon)!} className="w-5 h-5 object-contain" alt="" />}
              {tag.name}
            </span>
          ))}
        </div>
      )}

      {pet.description && (
        <div className="bg-muted p-6 rounded-2xl text-base text-foreground leading-relaxed border border-border relative">
          <div className="absolute -top-3 left-6 bg-muted px-2 text-xs font-bold text-muted-foreground">О питомце</div>
          {pet.description}
        </div>
      )}

      <div>
        <h3 className="text-sm font-bold text-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
          <FileText size={18} className="text-primary" /> Характеристики
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {pet.attributes?.map((attr, idx) => (
            <InfoCard
              key={idx}
              icon={
                attr.attribute.icon
                  ? <img src={getMediaUrl(attr.attribute.icon)!} className="w-5 h-5 object-contain" alt="" />
                  : <FileText size={18} className="text-muted-foreground" />
              }
              label={attr.attribute.name}
              value={attr.value}
            />
          ))}
        </div>
      </div>

      {/* РОДИТЕЛИ */}
      {(pet.mother_info || pet.father_info) && (
        <div className="pt-6 border-t border-border">
          <h3 className="text-sm font-bold text-foreground uppercase tracking-wider mb-4">Родители</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {pet.mother_info ? (
              <div
                onClick={() => onParentClick(pet.mother_info!.id)}
                className="flex items-center gap-4 p-4 bg-gradient-to-br from-accent/15 to-card hover:to-accent/20 rounded-2xl border border-accent/30 cursor-pointer transition-all hover:shadow-md group"
              >
                <div className="w-14 h-14 rounded-full bg-accent/15 flex items-center justify-center shrink-0 border-2 border-accent/30 overflow-hidden">
                  {pet.mother_info.image ? (
                    <img src={getMediaUrl(pet.mother_info.image)!} className="w-full h-full object-cover" alt="" />
                  ) : (
                    <span className="text-accent font-bold text-xl">♀</span>
                  )}
                </div>
                <div className="overflow-hidden">
                  <p className="text-xs text-accent-foreground font-bold uppercase mb-1">Мама</p>
                  <p className="font-bold text-foreground text-lg truncate group-hover:text-accent-foreground transition-colors">
                    {pet.mother_info.name}
                  </p>
                </div>
                <ChevronRight className="ml-auto text-accent/40 group-hover:text-accent-foreground" />
              </div>
            ) : (
              <div className="p-4 text-sm text-muted-foreground bg-muted rounded-2xl border border-dashed border-border flex items-center justify-center">Мама не указана</div>
            )}

            {pet.father_info ? (
              <div
                onClick={() => onParentClick(pet.father_info!.id)}
                className="flex items-center gap-4 p-4 bg-gradient-to-br from-blue-50 to-white hover:to-blue-50 rounded-2xl border border-primary/15 cursor-pointer transition-all hover:shadow-md group"
              >
                <div className="w-14 h-14 rounded-full bg-primary/15 flex items-center justify-center shrink-0 border-2 border-primary/20 overflow-hidden">
                  {pet.father_info.image ? (
                    <img src={getMediaUrl(pet.father_info.image)!} className="w-full h-full object-cover" alt="" />
                  ) : (
                    <span className="text-primary font-bold text-xl">♂</span>
                  )}
                </div>
                <div className="overflow-hidden">
                  <p className="text-xs text-primary/70 font-bold uppercase mb-1">Папа</p>
                  <p className="font-bold text-foreground text-lg truncate group-hover:text-primary transition-colors">
                    {pet.father_info.name}
                  </p>
                </div>
                <ChevronRight className="ml-auto text-primary/60 group-hover:text-primary/70" />
              </div>
            ) : (
              <div className="p-4 text-sm text-muted-foreground bg-muted rounded-2xl border border-dashed border-border flex items-center justify-center">Папа не указан</div>
            )}
          </div>
        </div>
      )}

      {/* КНОПКИ ДЕЙСТВИЙ */}
      <div className="pt-8 border-t border-border grid grid-cols-1 sm:grid-cols-2 gap-3">
        <button onClick={onGalleryOpen} className="py-3 px-4 bg-card border border-border text-foreground rounded-xl font-bold text-sm hover:bg-muted hover:border-border transition-all flex items-center justify-center gap-2">
          <ImageIcon size={18} /> Галерея
        </button>
        <button onClick={onEdit} className="py-3 px-4 bg-card border border-border text-foreground rounded-xl font-bold text-sm hover:bg-muted hover:border-border transition-all flex items-center justify-center gap-2">
          <Edit2 size={18} /> Редактировать
        </button>

        {pdfTrigger}

        {canDelete && (
          <button onClick={onDelete} className="sm:col-span-2 py-3 px-4 bg-destructive/10 text-destructive rounded-xl font-bold text-sm hover:bg-destructive/15 transition-colors flex items-center justify-center gap-2 mt-2">
            <Trash2 size={18} /> Удалить профиль
          </button>
        )}
      </div>
    </div>
  );
}