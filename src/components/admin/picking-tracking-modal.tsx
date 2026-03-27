'use client';

import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface PickingTrackingModalProps {
  orderNumber: string;
  orderId: string;
  trackingCode: string;
  trackingUrl: string;
  isUpdating: boolean;
  onClose: () => void;
  onTrackingCodeChange: (value: string) => void;
  onTrackingUrlChange: (value: string) => void;
  onConfirm: () => void;
}

export function PickingTrackingModal({
  orderNumber,
  orderId,
  trackingCode,
  trackingUrl,
  isUpdating,
  onClose,
  onTrackingCodeChange,
  onTrackingUrlChange,
  onConfirm,
}: PickingTrackingModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden border border-metallic-100">
        <div className="flex items-center justify-between p-4 border-b border-metallic-100">
          <div>
            <p className="text-lg font-semibold text-metallic-900">Marcar como Enviado</p>
            <p className="text-sm text-metallic-600">Pedido {orderNumber}</p>
          </div>
          <button
            className="p-2 rounded-md hover:bg-gray-50 text-metallic-600"
            aria-label="Fechar"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-metallic-700 mb-1">
              Código de Rastreio (opcional)
            </label>
            <Input
              value={trackingCode}
              onChange={(e) => onTrackingCodeChange(e.target.value)}
              placeholder="Ex: BR123456789BR"
            />
            <p className="text-xs text-metallic-500 mt-1">
              Se já gerou etiqueta pelo Melhor Envio, o código será preenchido automaticamente.
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-metallic-700 mb-1">
              URL de Rastreio (opcional)
            </label>
            <Input
              value={trackingUrl}
              onChange={(e) => onTrackingUrlChange(e.target.value)}
              placeholder="Ex: https://rastreamento.correios.com.br/..."
            />
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 p-4 border-t border-metallic-100">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={onConfirm} disabled={isUpdating}>
            {isUpdating ? 'Enviando...' : 'Confirmar Envio'}
          </Button>
        </div>
      </div>
    </div>
  );
}
