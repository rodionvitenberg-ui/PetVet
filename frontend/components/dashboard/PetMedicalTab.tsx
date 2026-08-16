'use client';

import React from 'react';
import { Activity, FileText, Plus, Edit2, Paperclip, User, Stethoscope } from 'lucide-react';
import { PetDetail } from '@/types/pet';
import { PetEvent } from '@/types/event';
import { getMediaUrl, formatDateTime } from './PetDetailUtils';

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
        <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">Attached Vets</h3>

        {pet.active_vets && pet.active_vets.length > 0 ? (
          <div className="space-y-2">
            {pet.active_vets.map(vet => (
              <div
                key={vet.id}
                onClick={() => onVetClick(vet)}
                className="group flex cursor-pointer items-center gap-3 rounded-xl border border-success/20 bg-success/5 p-3 transition-colors hover:bg-success/10"
              >
                <div className="flex size-10 items-center justify-center rounded-full border border-success/20 bg-card text-success shadow-sm">
                  {vet.avatar ? (
                    <img src={getMediaUrl(vet.avatar)!} className="h-full w-full rounded-full object-cover" />
                  ) : (
                    <Stethoscope size={18} />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-success/70">Treating Veterinarian</p>
                  <p className="text-sm font-bold text-foreground">{vet.name}</p>
                  {vet.clinic_name && <p className="text-xs text-muted-foreground">{vet.clinic_name}</p>}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-border bg-muted/40 py-8 text-center">
            <Stethoscope className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
            <p className="text-sm font-medium text-muted-foreground">No veterinarians attached</p>
          </div>
        )}
      </div>

      <div>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Event History</h3>
          <button
            onClick={onOpenCreateEvent}
            className="flex items-center gap-1 rounded-lg bg-primary/10 px-3 py-1.5 text-xs font-bold text-primary transition-colors hover:bg-primary/15"
          >
            <Plus size={14} />
            Add Event
          </button>
        </div>

        {(!pet.recent_events || pet.recent_events.length === 0) ? (
          <div className="rounded-2xl border border-dashed border-border bg-muted/40 py-8 text-center">
            <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-full bg-muted">
              <FileText className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium text-muted-foreground">No recent events</p>
          </div>
        ) : (
          <div className="space-y-3">
            {pet.recent_events?.map((event) => (
              <div key={event.id} className="group relative flex items-start gap-4 rounded-2xl border border-border bg-muted/40 p-4 transition-all hover:border-primary/30 hover:shadow-sm">
                <button
                  onClick={() => onOpenEditEvent(event)}
                  className="absolute right-2 top-2 z-10 rounded-lg p-1.5 text-muted-foreground opacity-0 transition-all hover:bg-primary/10 hover:text-primary group-hover:opacity-100"
                  title="Edit Record"
                >
                  <Edit2 size={14} />
                </button>

                <div className={`flex size-10 shrink-0 items-center justify-center rounded-full border ${
                  event.status === 'completed' ? 'border-success/20 bg-card text-success' :
                  event.status === 'planned' ? 'border-primary/20 bg-card text-primary' :
                  'border-border bg-muted text-muted-foreground'
                }`}>
                  {event.event_type?.icon ? (
                    <img src={getMediaUrl(event.event_type.icon)!} className="h-5 w-5 object-contain" alt="" />
                  ) : (
                    <Activity size={18} />
                  )}
                </div>

                <div className="min-w-0 flex-1 pr-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="truncate pr-2 text-sm font-bold text-foreground">{event.title}</h4>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs font-medium text-muted-foreground">
                        <span className="rounded border border-border bg-card px-1.5 py-0.5">{event.event_type?.name}</span>
                        {event.created_by_info && (
                          <>
                            <span className="h-1 w-1 rounded-full bg-border" />
                            <span className="flex items-center gap-1">
                              {event.created_by_info.is_vet ? (
                                <><Stethoscope size={12} className="text-primary" /><span className="font-bold text-primary">{event.created_by_info.clinic_name || 'Vet'}</span></>
                              ) : (
                                <><User size={12} /><span>Owner</span></>
                              )}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-xs font-bold text-foreground">{formatDateTime(event.date)}</p>
                      {event.next_date && <p className="mt-0.5 text-[10px] font-bold text-primary">→ {new Date(event.next_date).toLocaleDateString()}</p>}
                    </div>
                  </div>

                  {event.description && (
                    <p className="mt-2 line-clamp-2 rounded-lg border border-border bg-card p-2 text-xs text-muted-foreground">{event.description}</p>
                  )}

                  {event.attachments && event.attachments.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2 border-t border-border/50 pt-2">
                      {event.attachments?.map(att => (
                        <a key={att.id} href={getMediaUrl(att.file)!} target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-1.5 rounded-md border border-border bg-muted/40 px-2 py-1 text-[10px] font-bold text-muted-foreground transition hover:bg-primary/10 hover:text-primary">
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