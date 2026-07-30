'use client';

import React from 'react';
import { FileText, ImageIcon, Edit2, Trash2, FileDown } from 'lucide-react';
import { PDFDownloadLink } from '@react-pdf/renderer';
import { PetPassportDocument } from '@/components/pdf/PetPassportDocument';
import { PetDetail, PetTag } from '@/types/pet';
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
    <div className="p-3 bg-gray-50 rounded-xl border border-gray-100 flex items-center gap-3 hover:border-blue-100 transition-colors">
      <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm shrink-0 overflow-hidden p-2 text-gray-600">
        {icon}
      </div>
      <div className="overflow-hidden">
        <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider truncate mb-0.5">{label}</p>
        <p className="font-bold text-gray-900 truncate text-sm">{value}</p>
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
            <span key={tag.id || index} className="px-3 py-1.5 bg-gray-50 rounded-lg text-xs font-bold text-gray-700 flex items-center gap-2 border border-gray-100 shadow-sm">
              {tag.icon && <img src={getMediaUrl(tag.icon)!} className="w-4 h-4 object-contain" alt="" />}
              {tag.name}
            </span>
          ))}
        </div>
      )}

      {pet.description && (
        <div className="bg-gray-50 p-4 rounded-xl text-sm text-gray-700 leading-relaxed border border-gray-100">
          {pet.description}
        </div>
      )}

      <div>
        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Character</h3>
        <div className="grid grid-cols-2 gap-3">
          {pet.attributes?.map((attr, idx) => (
            <InfoCard
              key={idx}
              icon={attr.attribute.icon ? <img src={getMediaUrl(attr.attribute.icon)!} className="w-5 h-5 object-contain" alt="" /> : <FileText size={18} className="text-gray-400" />}
              label={attr.attribute.name}
              value={attr.value}
            />
          ))}
        </div>
      </div>

      {(pet.mother_info || pet.father_info) && (
        <div className="pt-4 border-t border-gray-100">
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Parents</h3>
          <div className="grid grid-cols-2 gap-3">
            {pet.mother_info ? (
              <div onClick={() => onParentClick(pet.mother_info!.id)} className="flex items-center gap-3 p-3 bg-pink-50/50 hover:bg-pink-50 rounded-2xl border border-pink-100 cursor-pointer transition-colors group">
                <div className="w-10 h-10 rounded-full bg-pink-100 flex items-center justify-center shrink-0 border border-pink-200 overflow-hidden">
                  {pet.mother_info.image ? <img src={getMediaUrl(pet.mother_info.image)!} className="w-full h-full object-cover" alt="" /> : <span className="text-pink-500 font-bold text-lg">♀</span>}
                </div>
                <div className="overflow-hidden">
                  <p className="text-[10px] text-pink-400 font-bold uppercase truncate">Mother</p>
                  <p className="font-bold text-gray-800 text-sm truncate group-hover:text-pink-700 transition-colors">{pet.mother_info.name}</p>
                </div>
              </div>
            ) : (
              <div className="p-3 text-xs text-gray-400 bg-gray-50 rounded-xl border border-dashed border-gray-200">Mother not specified</div>
            )}
            {pet.father_info ? (
              <div onClick={() => onParentClick(pet.father_info!.id)} className="flex items-center gap-3 p-3 bg-blue-50/50 hover:bg-blue-50 rounded-2xl border border-blue-100 cursor-pointer transition-colors group">
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center shrink-0 border border-blue-200 overflow-hidden">
                  {pet.father_info.image ? <img src={getMediaUrl(pet.father_info.image)!} className="w-full h-full object-cover" alt="" /> : <span className="text-blue-500 font-bold text-lg">♂</span>}
                </div>
                <div className="overflow-hidden">
                  <p className="text-[10px] text-blue-400 font-bold uppercase truncate">Father</p>
                  <p className="font-bold text-gray-800 text-sm truncate group-hover:text-blue-700 transition-colors">{pet.father_info.name}</p>
                </div>
              </div>
            ) : (
              <div className="p-3 text-xs text-gray-400 bg-gray-50 rounded-xl border border-dashed border-gray-200">Father not specified</div>
            )}
          </div>
        </div>
      )}

      <div className="mt-8 border-t border-gray-100 space-y-2">
        <button onClick={onOpenGallery} className="cursor-pointer w-full py-3 bg-white border border-gray-300 text-gray-700 rounded-xl font-bold text-sm hover:bg-gray-50 transition-colors flex items-center justify-center gap-2">
          <ImageIcon size={18} /> Update Gallery
        </button>
        <button onClick={onOpenEdit} className="cursor-pointer w-full py-3 bg-white border border-gray-300 text-gray-700 rounded-xl font-bold text-sm hover:bg-gray-50 transition-colors flex items-center justify-center gap-2">
          <Edit2 size={18} /> Edit Profile
        </button>
        {isClient && pet && (
          <PDFDownloadLink
            document={<PetPassportDocument pet={pet} t={t} locale={locale} />}
            fileName={`Passport_${pet.name}.pdf`}
            className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 shadow-lg shadow-blue-200"
          >
            {({ loading }) => loading ? 'Generating document...' : <><FileDown size={18} /> DOWNLOAD PDF PASSPORT ({locale.toUpperCase()})</>}
          </PDFDownloadLink>
        )}
        {canDelete && (
          <button onClick={onOpenDelete} className="cursor-pointer w-full py-3 bg-red-50 text-red-600 rounded-xl font-bold text-sm hover:bg-red-100 transition-colors flex items-center justify-center gap-2">
            <Trash2 size={18} /> DELETE PET PROFILE
          </button>
        )}
      </div>
    </div>
  );
}