import React, { useState, useEffect } from 'react';
import {
  X,
  Upload,
  CheckCircle2,
  AlertCircle,
  Clock,
  FileText,
  CreditCard,
  Copy,
  Check,
  Truck,
  RotateCcw,
} from 'lucide-react';
import { Order, StorePaymentSettings } from '../types.js';
import { formatKz } from '../utils/pricing.js';
import { ORDER_STATUS_MAP, ORDER_TIMELINE_STEPS } from '../utils/orderStatus.js';
import { useAuth } from '../context/AuthContext.js';

interface PaymentReceiptModalProps {
  order: Order | null;
  isOpen: boolean;
  onClose: () => void;
  onOrderUpdated: (updatedOrder: Order) => void;
}

export const PaymentReceiptModal: React.FC<PaymentReceiptModalProps> = ({
  order,
  isOpen,
  onClose,
  onOrderUpdated,
}) => {
  const { token } = useAuth();
  const [paymentSettings, setPaymentSettings] = useState<StorePaymentSettings | null>(null);

  // File Upload State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    fetch('/api/settings/payment')
      .then((res) => res.json())
      .then((data) => {
        if (data.paymentSettings) setPaymentSettings(data.paymentSettings);
      })
      .catch((err) => console.error('Failed to load payment settings:', err));
  }, [isOpen]);

  if (!isOpen || !order) return null;

  const currentStatusMeta = ORDER_STATUS_MAP[order.status] || ORDER_STATUS_MAP.aguardando_pagamento;

  const handleCopy = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUploadError(null);
    setUploadSuccess(false);
    const file = e.target.files?.[0];
    if (!file) return;

    // Check size limit: 10MB
    if (file.size > 10 * 1024 * 1024) {
      setUploadError('O ficheiro é demasiado grande. O limite máximo é 10 MB.');
      return;
    }

    // Check mime type
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg', 'application/pdf'];
    if (!validTypes.includes(file.type.toLowerCase())) {
      setUploadError('Formato inválido. Por favor anexe uma imagem (JPG, PNG, WEBP) ou documento PDF.');
      return;
    }

    setSelectedFile(file);

    // Read as Base64 data URL
    const reader = new FileReader();
    reader.onload = () => {
      setFilePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleUploadSubmit = async () => {
    if (!filePreview || !selectedFile) {
      setUploadError('Por favor seleccione o ficheiro do comprovativo.');
      return;
    }

    setUploading(true);
    setUploadError(null);
    try {
      const res = await fetch(`/api/orders/${order.id}/receipt`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          receiptData: filePreview,
          receiptFilename: selectedFile.name,
          receiptMimeType: selectedFile.type,
        }),
      });

      const data = await res.json();
      setUploading(false);

      if (!res.ok) {
        setUploadError(data.error || 'Erro ao carregar o comprovativo.');
        return;
      }

      setUploadSuccess(true);
      setSelectedFile(null);
      setFilePreview(null);
      onOrderUpdated(data.order);
    } catch (err: any) {
      setUploading(false);
      setUploadError(err.message || 'Erro de conexão.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="relative bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-pink-100 overflow-hidden animate-in fade-in zoom-in-95 duration-200 my-4 max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-pink-500 via-rose-500 to-pink-600 text-white flex items-center justify-between shrink-0">
          <div>
            <div className="text-[11px] font-semibold text-pink-100 uppercase tracking-wider flex items-center gap-1.5">
              <span>Encomenda Registada</span>
              <span>•</span>
              <span className="font-mono">{order.orderNumber}</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-serif font-bold">
              Pagamento & Acompanhamento
            </h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center transition-colors"
            aria-label="Fechar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
          {/* Status Alert Badge */}
          <div
            className={`p-4 rounded-2xl border flex items-start gap-3 ${currentStatusMeta.badgeBg}`}
          >
            <div className="mt-0.5">
              {order.status === 'pagamento_confirmado' || order.status === 'entregue' ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              ) : order.status === 'pagamento_rejeitado' ? (
                <AlertCircle className="w-5 h-5 text-rose-600" />
              ) : (
                <Clock className="w-5 h-5 text-amber-600 animate-pulse" />
              )}
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <h3 className={`text-sm font-bold ${currentStatusMeta.badgeText}`}>
                  {currentStatusMeta.label}
                </h3>
                <span className="text-[10px] text-zinc-500">
                  {new Date(order.updatedAt || order.createdAt).toLocaleDateString('pt-AO')}
                </span>
              </div>
              <p className="text-xs text-zinc-600 mt-0.5">{currentStatusMeta.description}</p>
              {order.receiptRejectionReason && (
                <div className="mt-2 p-2 bg-rose-100/70 border border-rose-300 rounded-lg text-xs text-rose-800 font-medium">
                  Motivo da equipa: {order.receiptRejectionReason}
                </div>
              )}
            </div>
          </div>

          {/* Amount to pay */}
          <div className="bg-pink-50/50 p-4 rounded-2xl border border-pink-100 flex items-center justify-between">
            <div>
              <span className="text-xs text-zinc-500 font-medium">Total a Pagar</span>
              <div className="text-2xl font-extrabold text-pink-600 font-serif">
                {formatKz(order.total)}
              </div>
            </div>
            <div className="text-right text-xs text-zinc-600">
              <div>
                Província: <span className="font-bold">{order.destinationProvince}</span>
              </div>
              <div>
                Transportadora: <span className="font-bold">{order.carrierName}</span>
              </div>
              {order.carrierTrackingCode && (
                <div className="mt-1 inline-block bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded-full font-mono text-[11px] font-bold">
                  Guia / Rastreio: {order.carrierTrackingCode}
                </div>
              )}
            </div>
          </div>

          {/* Bank Instructions (Multicaixa / IBAN) */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-pink-200 shadow-xs space-y-3">
            <div className="flex items-center gap-2 text-zinc-900 font-bold text-xs uppercase tracking-wide">
              <CreditCard className="w-4 h-4 text-pink-600" />
              <span>Dados para Pagamento Bancário</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-pink-50/40 rounded-xl border border-pink-100">
                <span className="text-[10px] text-zinc-500 font-semibold block">Banco:</span>
                <span className="font-bold text-zinc-900">{paymentSettings?.bankName || 'Banco BAI / BFA'}</span>
              </div>

              <div className="p-3 bg-pink-50/40 rounded-xl border border-pink-100">
                <span className="text-[10px] text-zinc-500 font-semibold block">Titular da Conta:</span>
                <span className="font-bold text-zinc-900 truncate block">
                  {paymentSettings?.accountHolder || 'O Mundo das Mocinhas'}
                </span>
              </div>

              <div className="sm:col-span-2 p-3 bg-pink-50/40 rounded-xl border border-pink-100 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-zinc-500 font-semibold block">IBAN Oficial:</span>
                  <span className="font-mono font-bold text-zinc-900 text-xs sm:text-sm">
                    {paymentSettings?.iban || 'AO06.0000.0000.0000.0000.0000.0'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopy(paymentSettings?.iban || '', 'iban')}
                  className="px-2.5 py-1 text-xs rounded-lg bg-pink-100 text-pink-700 hover:bg-pink-200 font-semibold flex items-center gap-1 transition-colors"
                >
                  {copiedField === 'iban' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedField === 'iban' ? 'Copiado' : 'Copiar'}</span>
                </button>
              </div>

              <div className="sm:col-span-2 p-3 bg-pink-50/40 rounded-xl border border-pink-100 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-zinc-500 font-semibold block">
                    Multicaixa Express (Telemóvel):
                  </span>
                  <span className="font-mono font-bold text-zinc-900 text-xs sm:text-sm">
                    {paymentSettings?.multicaixaExpressPhone || '+244 923 888 777'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopy(paymentSettings?.multicaixaExpressPhone || '', 'phone')}
                  className="px-2.5 py-1 text-xs rounded-lg bg-pink-100 text-pink-700 hover:bg-pink-200 font-semibold flex items-center gap-1 transition-colors"
                >
                  {copiedField === 'phone' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedField === 'phone' ? 'Copiado' : 'Copiar'}</span>
                </button>
              </div>
            </div>

            <p className="text-[11px] text-zinc-500 italic">
              {paymentSettings?.paymentInstructions ||
                'Após efectuar o pagamento, anexe o comprovativo abaixo directamente no site.'}
            </p>
          </div>

          {/* Receipt Upload Box */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl border-2 border-dashed border-pink-300 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Upload className="w-4 h-4 text-pink-600" />
                <h4 className="text-xs font-bold text-zinc-900 uppercase tracking-wide">
                  Anexar Comprovativo de Pagamento
                </h4>
              </div>
              {order.receiptUploadedAt && (
                <span className="text-[10px] text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full font-bold">
                  Comprovativo Anexado
                </span>
              )}
            </div>

            {order.receiptData && !filePreview && (
              <div className="p-3 bg-pink-50/60 rounded-xl border border-pink-200 flex items-center justify-between">
                <div className="flex items-center gap-2 truncate">
                  <FileText className="w-5 h-5 text-pink-600 shrink-0" />
                  <div className="truncate">
                    <p className="text-xs font-bold text-zinc-800 truncate">
                      {order.receiptFilename || 'Comprovativo enviado'}
                    </p>
                    <p className="text-[10px] text-zinc-500">
                      Enviado a {new Date(order.receiptUploadedAt!).toLocaleString('pt-AO')}
                    </p>
                  </div>
                </div>
                <span className="text-xs font-bold text-pink-600">Em conferência</span>
              </div>
            )}

            {uploadError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{uploadError}</span>
              </div>
            )}

            {uploadSuccess && (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Comprovativo enviado com sucesso! Aguarde a verificação da equipa.</span>
              </div>
            )}

            {/* File Input */}
            <div>
              <label className="block text-xs font-medium text-zinc-700 mb-2">
                Seleccione uma foto nítida do talão de transferência ou documento PDF (máx. 10MB):
              </label>
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp,application/pdf"
                onChange={handleFileChange}
                className="w-full text-xs text-zinc-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-pink-100 file:text-pink-700 hover:file:bg-pink-200 cursor-pointer"
              />
            </div>

            {/* Thumbnail Preview */}
            {filePreview && (
              <div className="p-3 bg-pink-50/40 rounded-xl border border-pink-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-zinc-700">Pré-visualização do Comprovativo:</span>
                  <button
                    onClick={() => {
                      setFilePreview(null);
                      setSelectedFile(null);
                    }}
                    className="text-xs text-rose-600 hover:underline"
                  >
                    Remover
                  </button>
                </div>
                {selectedFile?.type.includes('pdf') ? (
                  <div className="p-4 bg-white rounded-lg border flex items-center gap-2 text-xs text-zinc-700">
                    <FileText className="w-6 h-6 text-rose-500" />
                    <span>Documento PDF: {selectedFile.name}</span>
                  </div>
                ) : (
                  <img
                    src={filePreview}
                    alt="Pré-visualização do Comprovativo"
                    className="max-h-56 rounded-lg object-contain mx-auto border border-zinc-200"
                  />
                )}

                <button
                  onClick={handleUploadSubmit}
                  disabled={uploading}
                  className="w-full py-3 rounded-xl bg-pink-500 hover:bg-pink-600 active:scale-95 text-white font-bold text-xs tracking-wide shadow-md shadow-pink-200 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                >
                  <Upload className="w-4 h-4" />
                  <span>{uploading ? 'A enviar comprovativo...' : 'Enviar Comprovativo Agora'}</span>
                </button>
              </div>
            )}
          </div>

          {/* Visual Tracking Timeline (Section 8) */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-pink-100 space-y-4">
            <h4 className="text-xs font-bold text-zinc-900 uppercase tracking-wide flex items-center gap-2">
              <Truck className="w-4 h-4 text-pink-600" />
              <span>Linha do Tempo da Encomenda</span>
            </h4>

            <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-pink-200">
              {order.statusHistory?.map((hist, idx) => (
                <div key={hist.id || idx} className="relative">
                  <div className="absolute -left-6 top-0.5 w-5 h-5 rounded-full bg-pink-500 text-white flex items-center justify-center ring-4 ring-white shadow-xs">
                    <Check className="w-3 h-3" />
                  </div>
                  <div>
                    <div className="flex items-baseline justify-between">
                      <span className="text-xs font-bold text-zinc-900">{hist.title}</span>
                      <span className="text-[10px] text-zinc-400">
                        {new Date(hist.timestamp).toLocaleTimeString('pt-AO', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}{' '}
                        • {new Date(hist.timestamp).toLocaleDateString('pt-AO')}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-500 mt-0.5">{hist.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-pink-100 bg-zinc-50 shrink-0 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-bold"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
