import React from 'react';
import { AlertTriangle, X, Loader2, Trash2 } from 'lucide-react';

interface DeleteAccountModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    isLoading: boolean;
}

export default function DeleteAccountModal({ isOpen, onClose, onConfirm, isLoading }: DeleteAccountModalProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-card rounded-2xl max-w-sm w-full p-6 shadow-2xl relative scale-100 animate-in zoom-in-95 duration-200">
                
                <button 
                    onClick={onClose} 
                    disabled={isLoading}
                    className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition focus-ring rounded-lg"
                >
                    <X size={24} />
                </button>

                <div className="flex flex-col items-center text-center">
                    <div className="w-16 h-16 bg-destructive/10 text-destructive rounded-full flex items-center justify-center mb-5">
                        <AlertTriangle size={32} />
                    </div>
                    
                    <h3 className="text-xl font-bold text-foreground mb-2">Delete Account?</h3>
                    
                    <p className="text-muted-foreground text-sm mb-8 leading-relaxed">
                        This action is <b>irreversible</b>. All your data, pet profiles and medical history will be deleted without the possibility of recovery.
                    </p>

                    {/* Кнопки */}
                    <div className="flex flex-col gap-3 w-full">
                        <button 
                            onClick={onConfirm}
                            disabled={isLoading}
                            className="w-full py-3 px-4 rounded-xl font-bold text-destructive-foreground bg-destructive hover:bg-destructive/90 transition flex items-center justify-center gap-2 shadow-lg shadow-destructive/20 disabled:opacity-70 disabled:cursor-not-allowed active:scale-[0.96]"
                        >
                            {isLoading ? <Loader2 size={20} className="animate-spin" /> : <Trash2 size={20} />}
                            Yes, delete
                        </button>
                        
                        <button 
                            onClick={onClose}
                            disabled={isLoading}
                            className="w-full py-3 px-4 rounded-xl font-bold text-foreground bg-muted hover:bg-muted/80 transition active:scale-[0.96]"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}