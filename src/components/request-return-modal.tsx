'use client';

import { useState, useRef, useId, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { X, Upload, FileText } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { useFocusTrap } from '@/hooks/use-focus-trap';

interface RequestReturnModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderId: string;
  orderNumber: string;
  items: Array<{
    id: string;
    productId: string;
    name: string;
    quantity: number;
    price: number;
  }>;
  onSuccess?: () => void;
}

const reasons = [
  { value: 'DEFECTIVE', label: 'Produto com defeito' },
  { value: 'WRONG_PRODUCT', label: 'Produto errado enviado' },
  { value: 'NOT_AS_DESCRIBED', label: 'Produto diferente do anunciado' },
  { value: 'DAMAGED_SHIPPING', label: 'Danificado no transporte' },
  { value: 'CHANGED_MIND', label: 'Arrependimento (7 dias)' },
  { value: 'SIZE_ISSUE', label: 'Tamanho/medidas incorretas' },
  { value: 'OTHER', label: 'Outro motivo' },
];

export function RequestReturnModal({
  isOpen,
  onClose,
  orderId,
  orderNumber,
  items,
  onSuccess,
}: RequestReturnModalProps) {
  const titleId = useId();
  const trapRef = useFocusTrap(isOpen);

  useEffect(() => {
    if (!isOpen) return;
    const handle = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handle);
    return () => document.removeEventListener('keydown', handle);
  }, [isOpen, onClose]);

  const [step, setStep] = useState(1);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [reason, setReason] = useState('');
  const [reasonDetails, setReasonDetails] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = async (file: File) => {
    try {
      // Usar FormData para upload de arquivo
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', 'image');

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error('Erro ao fazer upload');

      const data = await response.json();
      setImageUrl(data.url);
      setImageFile(file);
      toast.success('Imagem enviada com sucesso');
    } catch (error) {
      console.error('[IMAGE_UPLOAD]', error);
      toast.error('Erro ao fazer upload da imagem');
    }
  };

  const handleVideoUpload = async (file: File) => {
    try {
      // Usar FormData para upload de arquivo
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', 'video');

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error('Erro ao fazer upload');

      const data = await response.json();
      setVideoUrl(data.url);
      setVideoFile(file);
      toast.success('Vídeo enviado com sucesso');
    } catch (error) {
      console.error('[VIDEO_UPLOAD]', error);
      toast.error('Erro ao fazer upload do vídeo');
    }
  };

  const handleSubmit = async () => {
    if (selectedItems.length === 0) {
      toast.error('Selecione pelo menos um item');
      return;
    }

    if (!reason) {
      toast.error('Selecione um motivo');
      return;
    }

    if (!imageUrl && !videoUrl) {
      toast.error('É obrigatório enviar uma foto ou vídeo mostrando o problema');
      return;
    }

    try {
      setLoading(true);

      const payload = {
        orderId,
        reason,
        reasonDetails,
        items: selectedItems.map(itemId => {
          const item = items.find(i => i.id === itemId);
          return {
            orderItemId: itemId,
            productId: item?.productId || '',
            quantity: item?.quantity || 1,
          };
        }),
        imageUrl,
        videoUrl,
      };

      const response = await fetch('/api/returns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Erro ao criar devolução');
      }

      toast.success('Devolução solicitada com sucesso!');
      onClose();
      setStep(1);
      setSelectedItems([]);
      setReason('');
      setReasonDetails('');
      setImageUrl('');
      setVideoUrl('');
      setImageFile(null);
      setVideoFile(null);
      onSuccess?.();
    } catch (error) {
      console.error('[REQUEST_RETURN]', error);
      toast.error(error instanceof Error ? error.message : 'Erro ao solicitar devolução');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={onClose}
          aria-hidden="true"
        >
          <motion.div
            ref={trapRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-white rounded-lg max-w-2xl w-full max-h-96 overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white">
              <h2 id={titleId} className="text-2xl font-bold">Solicitar Devolução</h2>
              <button onClick={onClose} aria-label="Fechar" className="text-gray-400 hover:text-gray-600">
                <X className="h-6 w-6" aria-hidden="true" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {step === 1 ? (
                // Selecionar itens
                <>
                  <div>
                    <h3 className="text-lg font-semibold mb-4">Selecione os itens para devolver</h3>
                    <div className="space-y-2">
                      {items.map(item => (
                        <label
                          key={item.id}
                          className="flex items-center p-3 border border-gray-300 rounded-lg hover:bg-gray-50 cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={selectedItems.includes(item.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedItems([...selectedItems, item.id]);
                              } else {
                                setSelectedItems(selectedItems.filter(id => id !== item.id));
                              }
                            }}
                            className="mr-3"
                          />
                          <div className="flex-1">
                            <p className="font-medium text-gray-900">{item.name}</p>
                            <p className="text-sm text-gray-600">
                              Quantidade: {item.quantity} | R$ {(item.price * item.quantity).toFixed(2)}
                            </p>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <Button variant="outline" onClick={onClose} className="flex-1">
                      Cancelar
                    </Button>
                    <Button
                      onClick={() => setStep(2)}
                      disabled={selectedItems.length === 0}
                      className="flex-1"
                    >
                      Próximo
                    </Button>
                  </div>
                </>
              ) : step === 2 ? (
                // Informações sobre a devolução
                <>
                  <div>
                    <Label htmlFor="reason" className="text-base font-semibold mb-2 block">
                      Motivo da Devolução *
                    </Label>
                    <select
                      id="reason"
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    >
                      <option value="">Selecione um motivo...</option>
                      {reasons.map(r => (
                        <option key={r.value} value={r.value}>
                          {r.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <Label htmlFor="details" className="text-base font-semibold mb-2 block">
                      Detalhes Adicionais
                    </Label>
                    <textarea
                      id="details"
                      value={reasonDetails}
                      onChange={(e) => setReasonDetails(e.target.value)}
                      placeholder="Descreva o problema em detalhes..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                      rows={3}
                    />
                  </div>

                  <div className="flex gap-3">
                    <Button variant="outline" onClick={() => setStep(1)} className="flex-1">
                      Voltar
                    </Button>
                    <Button onClick={() => setStep(3)} className="flex-1">
                      Próximo
                    </Button>
                  </div>
                </>
              ) : (
                // Enviar mídia
                <>
                  <div>
                    <Label className="text-base font-semibold mb-3 block">
                      Envie imagem e/ou vídeo do produto (obrigatório)
                    </Label>
                    <p className="text-sm text-gray-600 mb-4">
                      Para prosseguir com a devolução, você precisa enviar uma foto ou vídeo mostrando o defeito ou motivo da devolução.
                    </p>

                    {/* Imagem */}
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Imagem do Produto
                      </label>
                      {imageUrl ? (
                        <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                          <p className="text-sm text-green-700">✓ Imagem enviada com sucesso</p>
                          <button
                            onClick={() => {
                              setImageUrl('');
                              setImageFile(null);
                            }}
                            className="text-red-600 hover:text-red-700"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-primary-500 transition-colors">
                          <button
                            type="button"
                            onClick={() => imageInputRef.current?.click()}
                            className="w-full"
                          >
                            <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                            <p className="text-sm font-medium text-gray-900">Clique para enviar imagem</p>
                            <p className="text-xs text-gray-500">PNG, JPG até 5MB</p>
                          </button>
                          <input
                            ref={imageInputRef}
                            type="file"
                            accept="image/*"
                            onChange={(e) => {
                              if (e.target.files?.[0]) {
                                handleImageUpload(e.target.files[0]);
                              }
                            }}
                            className="hidden"
                          />
                        </div>
                      )}
                    </div>

                    {/* Vídeo */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Vídeo do Produto
                      </label>
                      {videoUrl ? (
                        <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                          <p className="text-sm text-green-700">✓ Vídeo enviado com sucesso</p>
                          <button
                            onClick={() => {
                              setVideoUrl('');
                              setVideoFile(null);
                            }}
                            className="text-red-600 hover:text-red-700"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-primary-500 transition-colors">
                          <button
                            type="button"
                            onClick={() => videoInputRef.current?.click()}
                            className="w-full"
                          >
                            <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                            <p className="text-sm font-medium text-gray-900">Clique para enviar vídeo</p>
                            <p className="text-xs text-gray-500">MP4, WebM até 50MB</p>
                          </button>
                          <input
                            ref={videoInputRef}
                            type="file"
                            accept="video/*"
                            onChange={(e) => {
                              if (e.target.files?.[0]) {
                                handleVideoUpload(e.target.files[0]);
                              }
                            }}
                            className="hidden"
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <Button variant="outline" onClick={() => setStep(2)} disabled={loading} className="flex-1">
                      Voltar
                    </Button>
                    <Button onClick={handleSubmit} disabled={loading} className="flex-1">
                      {loading ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Enviando...
                        </>
                      ) : (
                        <>
                          <FileText className="h-4 w-4 mr-2" />
                          Solicitar Devolução
                        </>
                      )}
                    </Button>
                  </div>
                </>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
