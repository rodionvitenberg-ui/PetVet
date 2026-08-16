'use client';

import React from 'react';
import { Activity, FileText, ChevronRight, Plus, Edit2, User, Stethoscope, Paperclip } from 'lucide-react';
import { PetDetail, UserProfile } from '@/types/pet';
import { PetEvent } from '@/types/event';
import { getMediaUrl, formatDateTime } from '@/components/dashboard/PetDetailUtils';

interface PetMedicalSectionProps {
  pet: PetDetail;
  onVetClick: (vet: UserProfile) => void;
  onCreateEvent: () => void;
  onEditEvent: (event: PetEvent) => void;
}

export default function PetMedicalSection({ pet, onVetClick, onCreateEvent, onEditEvent }: PetMedicalSectionProps) {
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div>
        <h3 className="text-sm font-bold text-foreground uppercase tracking-wider mb-4">Прикрепление</h3>

        {pet.active_vets && pet.active_vets.length > 0 ? (
          <div className="grid grid-cols-1 gap-3">
            {pet.active_vets.map(vet => (
              <div
                key={vet.id}
                onClick={() => onVetClick(vet)}
                className="p-4 bg-success/10 rounded-2xl border border-success/20 flex items-center gap-4 cursor-pointer hover:bg-success/15 hover:shadow-md transition-all group"
              >
                <div className="w-12 h-12 rounded-full bg-card flex items-center justify-center text-success shadow-sm border border-success/30">
                  {vet.avatar ? (
                    <img src={getMediaUrl(vet.avatar)!} className="w-full h-full rounded-full object-cover" alt="" />
                  ) : (
                    <Stethoscope size={20} />
                  )}
                </div>
                <div className="flex-1">
                  <p className="text-[10px] uppercase font-bold text-success/70 tracking-wider">Лечащий врач</p>
                  <p className="font-bold text-foreground text-base">{vet.name}</p>
                  {vet.clinic_name && <p className="text-xs text-muted-foreground">{vet.clinic_name}</p>}
                </div>
                <ChevronRight className="text-success/50 group-hover:text-success" />
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-muted p-4 rounded-xl border border-dashed border-border text-muted-foreground text-sm flex items-center gap-3">
            <Activity className="text-muted-foreground" size={20} />
            Питомец пока не прикреплен к клинике
          </div>
        )}
      </div>

      <div>
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">История событий</h3>
          <button
            onClick={onCreateEvent}
            className="text-sm font-bold text-white bg-primary hover:bg-primary px-4 py-2 rounded-xl transition-colors shadow-lg shadow-primary/20 flex items-center gap-2"
          >
            <Plus size={18} />
            Добавить
          </button>
        </div>

        {(!pet.recent_events || pet.recent_events.length === 0) ? (
          <div className="text-center py-12 bg-muted rounded-3xl border border-dashed border-border">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
              <FileText className="w-8 h-8 text-muted-foreground" />
            </div>
            <p className="text-foreground font-bold text-lg">Пока нет записей</p>
            <p className="text-muted-foreground text-sm mt-1">Добавьте первую запись о здоровье</p>
          </div>
        ) : (
          <div className="space-y-4">
            {pet.recent_events?.map((event) => (
              <div key={event.id} className="group relative flex items-start gap-4 p-5 rounded-2xl bg-card border border-border shadow-sm hover:border-primary/40 hover:shadow-md transition-all">
                <button
                  onClick={() => onEditEvent(event)}
                  className="absolute top-4 right-4 p-2 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg opacity-0 group-hover:opacity-100 transition-all z-10"
                  title="Редактировать запись"
                >
                  <Edit2 size={16} />
                </button>

                <div className={`shrink-0 w-12 h-12 rounded-2xl flex items-center justify-center border ${
                  event.status === 'completed' ? 'bg-card border-green-200 text-success' :
                  event.status === 'planned' ? 'bg-card border-primary/20 text-primary' :
                  'bg-muted text-muted-foreground'
                }`}>
                  {event.event_type?.icon ? (
                    <img src={getMediaUrl(event.event_type.icon)!} className="w-6 h-6 object-contain" alt="" />
                  ) : (
                    <Activity size={24} />
                  )}
                </div>

                <div className="flex-1 min-w-0 pr-8">
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start mb-2">
                    <div>
                      <h4 className="font-bold text-foreground text-lg leading-tight">
                        {event.title}
                      </h4>

                      <div className="flex flex-wrap gap-2 text-xs text-muted-foreground mt-1.5 font-medium items-center">
                        <span className="bg-muted px-2 py-0.5 rounded text-muted-foreground">{event.event_type?.name}</span>

                        {event.created_by_info && (
                          <>
                            <span className="w-1 h-1 rounded-full bg-muted" />
                            <span className="flex items-center gap-1">
                              {event.created_by_info.is_vet ? (
                                <>
                                  <Stethoscope size={12} className="text-primary" />
                                  <span className="text-primary font-bold">
                                    {event.created_by_info.clinic_name || 'Врач'}
                                  </span>
                                </>
                              ) : (
                                <>
                                  <User size={12} />
                                  <span>Владелец</span>
                                </>
                              )}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="text-left sm:text-right mt-2 sm:mt-0 shrink-0">
                      <p className="text-sm font-bold text-foreground">
                        {formatDateTime(event.date)}
                      </p>
                      {event.next_date && (
                        <p className="text-xs text-primary font-bold mt-0.5">
                          → {new Date(event.next_date).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </div>

                  {event.description && (
                    <p className="text-sm text-muted-foreground mt-3 leading-relaxed bg-muted p-3 rounded-xl border border-border">
                      {event.description}
                    </p>
                  )}

                  {event.attachments && event.attachments.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-4">
                      {event.attachments?.map(att => (
                        <a
                          key={att.id}
                          href={getMediaUrl(att.file)!}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-muted border border-border rounded-lg text-xs font-bold text-foreground hover:bg-primary/10 hover:border-primary/20 hover:text-primary transition"
                        >
                          <Paperclip size={14} />
                          Файл
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