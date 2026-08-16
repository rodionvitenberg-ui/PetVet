'use client';

import React from 'react';
import { FileText, ImageIcon, Edit2, Trash2, FileDown } from 'lucide-react';
import { PDFDownloadLink } from '@react-pdf/renderer';
import { PetPassportDocument } from '@/components/pdf/PetPassportDocument';
import { PetDetail } from '@/types/pet';
import { getMediaUrl } from './PetDetailUtils';
import { useTranslations, useLocale } from 'next-intl';

interface PetInfoTabProps {
  pet: PetDetail;
  isClient: boolean;
  canDelete: boolean;
  onOpenGallery: () => void;
  onOpenEdit: () => void;
  onOpenDelete: () => void;
  onParentClick: (id: number) => void;
  onOwnerClick: () => void;
}

function InfoCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-muted/40 p-3 transition-colors hover:border-primary/30">
      <div className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-card p-2 text-muted-foreground shadow-sm">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="mb-0.5 truncate text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</p>
        <p className="truncate text-sm font-bold text-foreground">{value}</p>
      </div>
    </div>
  );
}

export default function PetInfoTab({ pet, isClient, canDelete, onOpenGallery, onOpenEdit, onOpenDelete, onParentClick, onOwnerClick }: PetInfoTabProps) {
  const t = useTranslations('Passport');
  const locale = useLocale();

  return (
    <div className="space-y-6">
      {pet.tags && pet.tags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {pet.tags.map((tag, index) => (
            <span key={tag.id || index} className="flex items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 py-1.5 text-xs font-bold text-foreground shadow-sm">
              {tag.icon && <img src={getMediaUrl(tag.icon)!} className="h-4 w-4 object-contain" alt="" />}
              {tag.name}
            </span>
          ))}
        </div>
      )}

      {pet.description && (
        <div className="rounded-xl border border-border bg-muted/40 p-4 text-sm leading-relaxed text-foreground">
          {pet.description}
        </div>
      )}

      <div>
        <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">Character</h3>
        <div className="grid grid-cols-2 gap-3">
          {pet.attributes?.map((attr, idx) => (
            <InfoCard
              key={idx}
              icon={attr.attribute.icon ? <img src={getMediaUrl(attr.attribute.icon)!} className="h-5 w-5 object-contain" alt="" /> : <FileText size={18} className="text-muted-foreground" />}
              label={attr.attribute.name}
              value={attr.value}
            />
          ))}
        </div>
      </div>

      {(pet.mother_info || pet.father_info) && (
        <div className="border-t border-border pt-4">
          <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">Parents</h3>
          <div className="grid grid-cols-2 gap-3">
            {pet.mother_info ? (
              <div onClick={() => onParentClick(pet.mother_info!.id)} className="group flex cursor-pointer items-center gap-3 rounded-2xl border border-accent/30 bg-accent/10 p-3 transition-colors hover:bg-accent/15">
                <div className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-accent/30 bg-accent/15">
                  {pet.mother_info.image ? <img src={getMediaUrl(pet.mother_info.image)!} className="h-full w-full object-cover" alt="" /> : <span className="text-lg font-bold text-accent">♀</span>}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-[10px] font-bold uppercase text-accent-foreground">Mother</p>
                  <p className="truncate text-sm font-bold text-foreground transition-colors group-hover:text-accent-foreground">{pet.mother_info.name}</p>
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-border bg-muted/40 p-3 text-xs text-muted-foreground">Mother not specified</div>
            )}
            {pet.father_info ? (
              <div onClick={() => onParentClick(pet.father_info!.id)} className="group flex cursor-pointer items-center gap-3 rounded-2xl border border-primary/30 bg-primary/10 p-3 transition-colors hover:bg-primary/15">
                <div className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-primary/30 bg-primary/15">
                  {pet.father_info.image ? <img src={getMediaUrl(pet.father_info.image)!} className="h-full w-full object-cover" alt="" /> : <span className="text-lg font-bold text-primary">♂</span>}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-[10px] font-bold uppercase text-primary/70">Father</p>
                  <p className="truncate text-sm font-bold text-foreground transition-colors group-hover:text-primary">{pet.father_info.name}</p>
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-border bg-muted/40 p-3 text-xs text-muted-foreground">Father not specified</div>
            )}
          </div>
        </div>
      )}

      <div className="mt-8 space-y-2 border-t border-border pt-4">
        <button onClick={onOpenGallery} className="flex w-full items-center justify-center gap-2 rounded-xl border border-input bg-card py-3 text-sm font-bold text-foreground transition-colors hover:bg-muted">
          <ImageIcon size={18} /> Update Gallery
        </button>
        <button onClick={onOpenEdit} className="flex w-full items-center justify-center gap-2 rounded-xl border border-input bg-card py-3 text-sm font-bold text-foreground transition-colors hover:bg-muted">
          <Edit2 size={18} /> Edit Profile
        </button>
        {isClient && pet && (
          <PDFDownloadLink
            document={<PetPassportDocument pet={pet} t={t} locale={locale} />}
            fileName={`Passport_${pet.name}.pdf`}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground shadow-lg transition-colors hover:bg-primary/90"
          >
            {({ loading }) => loading ? 'Generating document...' : <><FileDown size={18} /> DOWNLOAD PDF PASSPORT ({locale.toUpperCase()})</>}
          </PDFDownloadLink>
        )}
        {canDelete && (
          <button onClick={onOpenDelete} className="flex w-full items-center justify-center gap-2 rounded-xl bg-destructive/10 py-3 text-sm font-bold text-destructive transition-colors hover:bg-destructive/15">
            <Trash2 size={18} /> DELETE PET PROFILE
          </button>
        )}
      </div>
    </div>
  );
}