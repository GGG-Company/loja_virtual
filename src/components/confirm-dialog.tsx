'use client';

import { useEffect, useId } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useFocusTrap } from '@/hooks/use-focus-trap';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  variant?: 'danger' | 'warning';
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  onConfirm,
  onCancel,
  variant = 'danger',
}: ConfirmDialogProps) {
  const titleId = useId();
  const descId = useId();
  const trapRef = useFocusTrap(open);

  // Fechar com Escape
  useEffect(() => {
    if (!open) return;
    const handle = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancel(); };
    document.addEventListener('keydown', handle);
    return () => document.removeEventListener('keydown', handle);
  }, [open, onCancel]);

  return (
    <AnimatePresence>
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          // Bloqueia leitores de tela fora do modal
          aria-hidden={!open}
        >
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={onCancel}
            aria-hidden="true"
          />

          {/* Dialog */}
          <motion.div
            ref={trapRef}
            role="alertdialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={descId}
            initial={{ opacity: 0, scale: 0.92, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 16 }}
            transition={{ type: 'spring', stiffness: 340, damping: 26 }}
            className="relative bg-white rounded-sm shadow-2xl border-t-4 border-[#CC1020] p-6 max-w-sm w-full mx-4"
          >
            <div className="flex items-start gap-4 mb-5">
              <div
                className={`flex-shrink-0 w-10 h-10 rounded-sm flex items-center justify-center ${
                  variant === 'danger' ? 'bg-red-50' : 'bg-amber-50'
                }`}
                aria-hidden="true"
              >
                <AlertTriangle
                  className={`h-5 w-5 ${
                    variant === 'danger' ? 'text-[#CC1020]' : 'text-amber-600'
                  }`}
                />
              </div>
              <div>
                <h3
                  id={titleId}
                  className="font-display text-base font-bold text-[#1A1A1A] uppercase"
                >
                  {title}
                </h3>
                <p
                  id={descId}
                  className="text-sm text-gray-600 mt-1 leading-relaxed"
                >
                  {description}
                </p>
              </div>
            </div>

            <div className="flex gap-3 justify-end">
              <Button variant="outline" size="sm" onClick={onCancel}>
                {cancelLabel}
              </Button>
              <Button
                size="sm"
                onClick={onConfirm}
                className={
                  variant === 'danger'
                    ? 'bg-[#CC1020] hover:bg-[#a80816] text-white border-0'
                    : ''
                }
              >
                {confirmLabel}
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
