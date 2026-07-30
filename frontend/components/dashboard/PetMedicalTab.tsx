'use client';

import React from 'react';
import { Activity, FileText, Plus, Edit2, Paperclip, User, Stethoscope, Trash2 } from 'lucide-react';
import { PetDetail } from '@/types/pet';
import { PetEvent } from '@/types/event';
import { getMediaUrl, formatDateTime } from './PetDetailUtils';
import { useAuth } from '@/components/providers/AuthProvider';

interface PetMedicalTabProps {
  pet: PetDetail;
  currentUser: any;
  onOpenCreateEvent: () => void;
  onOpenEditEvent: (event: PetEvent) => void;
  onVetClick: (vet: any) => void;
}

export default function PetMedicalTab({ pet, currentUser, onOpenCreateEvent, onOpenEditEvent, onVetClick }: PetMedicalTabProps) {
  return (
    <div className="space-y-6">
      <div className="mb-4">
        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Attached Vets</h3>

        {pet.active_vets && pet.active_vets.length > 0 ? (
          <div className="space-y-2">
            {pet.active_vets.map(vet => (
              <div 
                key={vet.id}
                onClick={() => onVetClick(vet)}
                className="p-3 bg-emerald-50 rounded-xl border border-emerald-100 flex items-center gap-3 cursor-pointer hover:bg-emerald-100 transition-colors group"
              >
                <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-emerald-600 shadow-sm border border-emerald-200">
                  {vet.avatar ? (
                    <img src={getMediaUrl(vet.avatar)!} className="w-full h-full rounded-full object-cover" />
                  ) : (
                    <Stethoscope size={18} />
                  )}
                </div>
                <div className="flex-1">
                  <p className="text-[10px] uppercase font-bold text-emerald-600/70 tracking-wider">Treating Veterinarian</p>
                  <p className="font-bold text-gray-900 text-sm">{vet.name}</p>
                  {vet.clinic_name && <p className="text-xs text-gray-500">{vet.clinic_name}</p>}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
            <Stethoscope className="w-8 h-8 text-gray-400 mx-auto mb-2" />
            <p className="text-sm text-gray-500 font-medium">No veterinarians attached</p>
          </div>
        )}
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Event History</h3>
          <button 
            onClick={onOpenCreateEvent}
            className="cursor-pointer text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors"
          >
            <Plus size={14} />
            Add Event
          </button>
        </div>

        {(!pet.recent_events || pet.recent_events.length === 0) ? (
          <div className="text-center py-8 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
            <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <FileText className="w-6 h-6 text-gray-400" />
            </div>
            <p className="text-gray-500 font-medium text-sm">No recent events</p>
          </div>
        ) : (
          <div className="space-y-3">
            {pet.recent_events?.map((event) => (
              <div key={event.id} className="group relative flex items-start gap-4 p-4 rounded-2xl bg-gray-50 border border-gray-100 hover:border-blue-200 hover:shadow-sm transition-all">
                <button 
                  onClick={() => onOpenEditEvent(event)}
                  className="cursor-pointer absolute top-2 right-2 p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all z-10"
                  title="Edit Record"
                >
                  <Edit2 size={14} />
                </button>

                <div className={`shrink-0 w-10 h-10 rounded-full flex items-center justify-center border ${
                  event.status === 'completed' ? 'bg-white border-green-200 text-green-600' :
                  event.status === 'planned' ? 'bg-white border-blue-200 text-blue-500' :
                  'bg-gray-100 border-gray-200 text-gray-400'
                }`}>
                  {event.event_type?.icon ? (
                    <img src={getMediaUrl(event.event_type.icon)!} className="w-5 h-5 object-contain" alt="" />
                  ) : (
                    <Activity size={18} />
                  )}
                </div>

                <div className="flex-1 min-w-0 pr-6">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-bold text-gray-900 truncate pr-2 text-sm">{event.title}</h4>
                      <div className="flex flex-wrap gap-2 text-xs text-gray-500 mt-1 font-medium items-center">
                        <span className="bg-white border border-gray-200 px-1.5 py-0.5 rounded">{event.event_type?.name}</span>
                        {event.created_by_info && (
                          <>
                            <span className="w-1 h-1 rounded-full bg-gray-300" />
                            <span className="flex items-center gap-1">
                              {event.created_by_info.is_vet ? (
                                <><Stethoscope size={12} className="text-blue-500" /><span className="text-blue-600 font-bold">{event.created_by_info.clinic_name || 'Vet'}</span></>
                              ) : (
                                <><User size={12} /><span>Owner</span></>
                              )}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs font-bold text-gray-900">{formatDateTime(event.date)}</p>
                      {event.next_date && <p className="text-[10px] text-blue-600 font-bold mt-0.5">→ {new Date(event.next_date).toLocaleDateString()}</p>}
                    </div>
                  </div>

                  {event.description && (
                    <p className="text-xs text-gray-600 mt-2 line-clamp-2 bg-white p-2 rounded-lg border border-gray-100">{event.description}</p>
                  )}

                  {event.attachments && event.attachments.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-3 pt-2 border-t border-gray-100/50">
                      {event.attachments?.map(att => (
                        <a key={att.id} href={getMediaUrl(att.file)!} target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-1.5 px-2 py-1 bg-gray-50 rounded-md text-[10px] font-bold text-gray-600 hover:bg-blue-50 hover:text-blue-600 transition border border-gray-200">
                          <Paperclip size={12} /> File
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}