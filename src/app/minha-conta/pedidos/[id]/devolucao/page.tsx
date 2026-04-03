'use client';

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { motion } from "framer-motion";
import { ArrowLeft, Package, AlertTriangle, CheckCircle, Upload, X } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import Image from "next/image";

type OrderItem = {
  id: string;
  productId: string;
  quantity: number;
  price: number;
  product: {
    id: string;
    name: string;
    imageUrl?: string;
  };
};

type Order = {
  id: string;
  orderNumber: string;
  status: string;
  total: number;
  createdAt: string;
  deliveredAt?: string;
  items: OrderItem[];
};

const returnReasons = [
  { value: "DEFECTIVE", label: "Produto com defeito" },
  { value: "WRONG_PRODUCT", label: "Produto errado enviado" },
  { value: "NOT_AS_DESCRIBED", label: "Produto diferente do anunciado" },
  { value: "DAMAGED_SHIPPING", label: "Danificado no transporte" },
  { value: "CHANGED_MIND", label: "Arrependimento (7 dias)" },
  { value: "SIZE_ISSUE", label: "Tamanho/medidas incorretas" },
  { value: "OTHER", label: "Outro motivo" },
];

export default function SolicitarDevolucaoPage() {
  const router = useRouter();
  const params = useParams();
  const orderId = params.id as string;
  const { status } = useSession();

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [returnNumber, setReturnNumber] = useState("");

  const [reason, setReason] = useState("");
  const [reasonDetails, setReasonDetails] = useState("");
  const [selectedItems, setSelectedItems] = useState<Record<string, number>>({});

  const [imageUrl, setImageUrl] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [_uploading, setUploading] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  const loadOrder = useCallback(async () => {
    try {
      const response = await fetch(`/api/user/orders/${orderId}`);
      const data = await response.json();

      if (response.ok) {
        setOrder({
          ...data,
          total: parseFloat(String(data.total ?? 0)) || 0,
          items: (data.items ?? []).map((i: any) => ({
            ...i,
            price: parseFloat(String(i.price ?? 0)) || 0,
          })),
        });
        // Pre-selecionar todos os itens
        const items: Record<string, number> = {};
        data.items.forEach((item: OrderItem) => {
          items[item.id] = item.quantity;
        });
        setSelectedItems(items);
      } else {
        toast.error(data.error || "Erro ao carregar pedido");
        router.push("/minha-conta/pedidos");
      }
    } catch (error) {
      console.error("Erro:", error);
      toast.error("Erro ao carregar pedido");
    } finally {
      setLoading(false);
    }
  }, [orderId, router]);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/login");
      return;
    }

    if (status === "authenticated" && orderId) {
      loadOrder();
    }
  }, [status, orderId, router, loadOrder]);

  const handleFileUpload = async (file: File, type: "image" | "video") => {
    try {
      setUploading(true);
      const formData = new FormData();
      formData.append("file", file);
      formData.append("type", type);

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) throw new Error("Erro ao fazer upload");

      const data = await response.json();
      if (type === "image") setImageUrl(data.url);
      else setVideoUrl(data.url);

      toast.success(`${type === "image" ? "Imagem" : "Vídeo"} enviado com sucesso!`);
    } catch (error) {
      console.error("[UPLOAD_ERROR]", error);
      toast.error("Erro ao fazer upload do arquivo");
    } finally {
      setUploading(false);
    }
  };

  const handleQuantityChange = (itemId: string, qty: number, maxQty: number) => {
    if (qty < 0) qty = 0;
    if (qty > maxQty) qty = maxQty;
    setSelectedItems((prev) => ({
      ...prev,
      [itemId]: qty,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!reason) {
      toast.error("Selecione um motivo para a devolução");
      return;
    }

    const itemsToReturn = Object.entries(selectedItems)
      .filter(([_, qty]) => qty > 0)
      .map(([itemId, quantity]) => {
        const item = order?.items.find((i) => i.id === itemId);
        return {
          orderItemId: itemId,
          productId: item?.productId || "",
          quantity,
        };
      });

    if (itemsToReturn.length === 0) {
      toast.error("Selecione pelo menos um item para devolver");
      return;
    }

    if (!imageUrl && !videoUrl) {
      toast.error("É obrigatório enviar uma foto ou vídeo mostrando o defeito ou problema");
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch("/api/returns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId,
          reason,
          reasonDetails,
          items: itemsToReturn,
          imageUrl,
          videoUrl,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(true);
        setReturnNumber(data.return?.returnNumber || "");
        toast.success("Solicitação de devolução criada!");
      } else {
        toast.error(data.error || "Erro ao criar solicitação");
      }
    } catch (error) {
      console.error("Erro:", error);
      toast.error("Erro ao criar solicitação");
    } finally {
      setSubmitting(false);
    }
  };

  if (status === "loading" || loading) {
    return (
      <>
        <Header />
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
        <Footer />
      </>
    );
  }

  if (success) {
    return (
      <>
        <Header />
        <main className="min-h-screen bg-gray-50 py-12">
          <div className="container mx-auto px-4 max-w-lg">
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="bg-white rounded-lg shadow p-8 text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
              <h1 className="text-2xl font-bold mb-2">Solicitação Enviada!</h1>
              <p className="text-gray-600 mb-4">Sua solicitação de devolução foi registrada com sucesso.</p>
              <div className="bg-gray-100 rounded-lg p-4 mb-6">
                <p className="text-sm text-gray-600">Número da solicitação:</p>
                <p className="text-xl font-bold text-primary-600">{returnNumber}</p>
              </div>
              <p className="text-sm text-gray-500 mb-6">Você receberá atualizações sobre o andamento da sua solicitação. Aguarde a análise da nossa equipe.</p>
              <div className="space-y-3">
                <Link href="/minha-conta/devolucoes" className="block">
                  <Button className="w-full">Ver Minhas Devoluções</Button>
                </Link>
                <Link href="/minha-conta/pedidos" className="block">
                  <Button variant="outline" className="w-full">
                    Voltar aos Pedidos
                  </Button>
                </Link>
              </div>
            </motion.div>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  if (!order) {
    return null;
  }

  // Verificar se pode solicitar devolução
  const canReturn = ["SHIPPED", "DELIVERED"].includes(order.status);
  const deliveredDate = order.deliveredAt ? new Date(order.deliveredAt) : null;
  const daysSinceDelivery = deliveredDate ? Math.floor((Date.now() - deliveredDate.getTime()) / (1000 * 60 * 60 * 24)) : 0;

  return (
    <>
      <Header />
      <main className="min-h-screen bg-gray-50 py-12">
        <div className="container mx-auto px-4 max-w-2xl">
          {/* Header */}
          <div className="flex items-center gap-4 mb-8">
            <Link href="/minha-conta/pedidos">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold">Solicitar Devolução</h1>
              <p className="text-gray-600">Pedido {order.orderNumber}</p>
            </div>
          </div>

          {!canReturn ? (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
              <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
              <h2 className="text-lg font-semibold mb-2">Devolução não disponível</h2>
              <p className="text-gray-600">Só é possível solicitar devolução para pedidos que já foram enviados ou entregues.</p>
              <p className="text-sm text-gray-500 mt-2">
                Status atual do pedido: <span className="font-medium">{order.status}</span>
              </p>
            </motion.div>
          ) : (
            <motion.form initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} onSubmit={handleSubmit} className="space-y-6">
              {/* Aviso de prazo */}
              {daysSinceDelivery > 5 && daysSinceDelivery <= 7 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <p className="text-sm text-yellow-800">
                    <AlertTriangle className="h-4 w-4 inline mr-1" />
                    Atenção: O prazo de 7 dias para arrependimento expira em {7 - daysSinceDelivery} dia(s).
                  </p>
                </div>
              )}

              {/* Itens do pedido */}
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold mb-4">Selecione os itens para devolução</h2>
                <div className="space-y-4">
                  {order.items.map((item) => (
                    <div key={item.id} className="flex items-center gap-4 p-3 border rounded-lg">
                      <div className="w-16 h-16 bg-gray-100 rounded flex items-center justify-center overflow-hidden">{item.product.imageUrl ? <Image src={item.product.imageUrl} alt={item.product.name} width={64} height={64} className="object-cover" /> : <Package className="h-8 w-8 text-gray-400" />}</div>
                      <div className="flex-1">
                        <p className="font-medium">{item.product.name}</p>
                        <p className="text-sm text-gray-600">Quantidade no pedido: {item.quantity}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Label className="text-sm">Devolver:</Label>
                        <input type="number" min={0} max={item.quantity} value={selectedItems[item.id] || 0} onChange={(e) => handleQuantityChange(item.id, parseInt(e.target.value) || 0, item.quantity)} className="w-16 px-2 py-1 border rounded text-center" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Motivo */}
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold mb-4">Motivo da devolução *</h2>
                <div className="space-y-2">
                  {returnReasons.map((r) => (
                    <label key={r.value} className={`flex items-center p-3 border rounded-lg cursor-pointer transition-colors ${reason === r.value ? "border-primary-600 bg-primary-50" : "hover:bg-gray-50"}`}>
                      <input type="radio" name="reason" value={r.value} checked={reason === r.value} onChange={(e) => setReason(e.target.value)} className="mr-3" />
                      <span>{r.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Detalhes */}
              <div className="bg-white rounded-lg shadow p-6">
                <Label htmlFor="details" className="text-lg font-semibold mb-4 block">
                  Descreva o problema (opcional)
                </Label>
                <Textarea id="details" value={reasonDetails} onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setReasonDetails(e.target.value)} placeholder="Descreva com mais detalhes o motivo da devolução..." rows={4} />
              </div>

              {/* Anexos */}
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold mb-2">Envie foto ou vídeo (obrigatório)</h2>
                <p className="text-sm text-gray-600 mb-6">Para analisar sua devolução, precisamos de uma imagem ou vídeo que comprove o motivo da solicitação.</p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Foto */}
                  <div className="space-y-2">
                    <Label>Foto do Produto</Label>
                    {imageUrl ? (
                      <div className="relative aspect-video rounded-lg overflow-hidden border border-green-200">
                        <Image src={imageUrl} alt="Preview" fill className="object-cover" />
                        <button type="button" onClick={() => setImageUrl("")} className="absolute top-2 right-2 p-1 bg-red-600 text-white rounded-full hover:bg-red-700 shadow-lg">
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      <div onClick={() => imageInputRef.current?.click()} className="aspect-video border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-primary-500 hover:bg-gray-50 transition-all">
                        <Upload className="h-8 w-8 text-gray-400 mb-2" />
                        <span className="text-sm font-medium">Clique para enviar foto</span>
                        <span className="text-xs text-gray-500">JPG ou PNG até 5MB</span>
                        <input ref={imageInputRef} type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0], "image")} className="hidden" />
                      </div>
                    )}
                  </div>

                  {/* Vídeo */}
                  <div className="space-y-2">
                    <Label>Vídeo do Produto</Label>
                    {videoUrl ? (
                      <div className="relative aspect-video rounded-lg overflow-hidden border border-green-200 flex items-center justify-center bg-metallic-900">
                        <CheckCircle className="h-10 w-10 text-green-500" />
                        <p className="text-white text-xs mt-2 absolute bottom-4">Vídeo carregado</p>
                        <button type="button" onClick={() => setVideoUrl("")} className="absolute top-2 right-2 p-1 bg-red-600 text-white rounded-full hover:bg-red-700 shadow-lg">
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      <div onClick={() => videoInputRef.current?.click()} className="aspect-video border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-primary-500 hover:bg-gray-50 transition-all">
                        <Upload className="h-8 w-8 text-gray-400 mb-2" />
                        <span className="text-sm font-medium">Clique para enviar vídeo</span>
                        <span className="text-xs text-gray-500">MP4 até 50MB</span>
                        <input ref={videoInputRef} type="file" accept="video/*" onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0], "video")} className="hidden" />
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Resumo */}
              <div className="bg-blue-50 rounded-lg p-4">
                <h3 className="font-semibold mb-2">Próximos passos:</h3>
                <ol className="list-decimal list-inside text-sm text-blue-800 space-y-1">
                  <li>Envie esta solicitação</li>
                  <li>Nossa equipe irá analisar seu pedido</li>
                  <li>Se aprovado, enviaremos uma etiqueta de devolução</li>
                  <li>Embale o produto e envie pelos Correios</li>
                  <li>Após recebermos, processaremos o reembolso</li>
                </ol>
              </div>

              {/* Botões */}
              <div className="flex gap-4">
                <Link href="/minha-conta/pedidos" className="flex-1">
                  <Button type="button" variant="outline" className="w-full">
                    Cancelar
                  </Button>
                </Link>
                <Button type="submit" className="flex-1" disabled={submitting}>
                  {submitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Enviando...
                    </>
                  ) : (
                    "Enviar Solicitação"
                  )}
                </Button>
              </div>
            </motion.form>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
