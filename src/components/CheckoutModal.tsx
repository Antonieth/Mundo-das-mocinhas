import React, { useState, useEffect } from 'react';
import { X, Truck, ShieldCheck, MapPin, User, Phone, AlertCircle, ArrowRight, Check } from 'lucide-react';
import { useCart } from '../context/CartContext.js';
import { useAuth } from '../context/AuthContext.js';
import { ShippingCarrier, ShippingDestination, Order } from '../types.js';
import { formatKz } from '../utils/pricing.js';

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOrderCreated: (order: Order) => void;
}

export const CheckoutModal: React.FC<CheckoutModalProps> = ({
  isOpen,
  onClose,
  onOrderCreated,
}) => {
  const { items, subtotal, clearCart } = useCart();
  const { user, token } = useAuth();

  const [destinations, setDestinations] = useState<ShippingDestination[]>([]);
  const [carriers, setCarriers] = useState<ShippingCarrier[]>([]);

  // Form State
  const [customerName, setCustomerName] = useState(user?.name || '');
  const [customerPhone, setCustomerPhone] = useState(user?.phone || '');
  const [province, setProvince] = useState('Luanda');
  const [municipality, setMunicipality] = useState('');
  const [carrierId, setCarrierId] = useState('carrier-real-express');
  const [customCarrierName, setCustomCarrierName] = useState('');
  const [pickupInstructions, setPickupInstructions] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      if (!customerName) setCustomerName(user.name);
      if (!customerPhone) setCustomerPhone(user.phone);
    }
  }, [user]);

  useEffect(() => {
    if (!isOpen) return;
    // Fetch carriers and destinations
    fetch('/api/shipping/carriers')
      .then((res) => res.json())
      .then((data) => {
        if (data.carriers) setCarriers(data.carriers);
      })
      .catch((err) => console.error('Failed to load carriers:', err));

    fetch('/api/shipping/destinations')
      .then((res) => res.json())
      .then((data) => {
        if (data.destinations) {
          setDestinations(data.destinations);
          // Set initial municipality if not set
          const initialDest = data.destinations.find((d: any) => d.province === 'Luanda');
          if (initialDest?.municipalities?.length) {
            setMunicipality(initialDest.municipalities[0]);
          }
        }
      })
      .catch((err) => console.error('Failed to load destinations:', err));
  }, [isOpen]);

  if (!isOpen) return null;

  const currentDestination = destinations.find((d) => d.province === province);
  const municipalities = currentDestination?.municipalities || [];
  const shippingFee = currentDestination ? currentDestination.baselineFee : 0;
  const total = subtotal + shippingFee;

  const selectedCarrier = carriers.find((c) => c.id === carrierId);
  const isOtherCarrier = carrierId === 'carrier-other' || selectedCarrier?.isCustomCarrier;

  const handleProvinceChange = (newProvince: string) => {
    setProvince(newProvince);
    const dest = destinations.find((d) => d.province === newProvince);
    if (dest?.municipalities?.length) {
      setMunicipality(dest.municipalities[0]);
    } else {
      setMunicipality('');
    }
  };

  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!customerName.trim() || !customerPhone.trim()) {
      setError('Por favor indique o seu nome e telefone para a entrega.');
      return;
    }

    if (!province) {
      setError('Por favor seleccione a província de destino em Angola.');
      return;
    }

    if (isOtherCarrier && !customCarrierName.trim()) {
      setError('Por favor digite o nome da transportadora pretendida no campo obrigatório.');
      return;
    }

    const cartPayload = items.map((i) => ({
      productId: i.product.id,
      quantity: i.quantity,
    }));

    setLoading(true);
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          cartItems: cartPayload,
          destinationProvince: province,
          destinationMunicipality: municipality,
          carrierId,
          carrierName: isOtherCarrier ? customCarrierName.trim() : (selectedCarrier?.name || 'Transportadora'),
          customCarrierName: isOtherCarrier ? customCarrierName.trim() : undefined,
          pickupInstructions,
          customerName,
          customerPhone,
        }),
      });

      const data = await res.json();
      setLoading(false);

      if (!res.ok) {
        setError(data.error || 'Erro ao submeter a encomenda.');
        return;
      }

      // Success: clear cart and redirect to Payment Receipt view
      clearCart();
      onClose();
      onOrderCreated(data.order);
    } catch (err: any) {
      setLoading(false);
      setError(err.message || 'Erro de conexão com o servidor.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="relative bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-pink-100 overflow-hidden animate-in fade-in zoom-in-95 duration-200 my-4 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-pink-500 to-rose-500 text-white flex items-center justify-between shrink-0">
          <div>
            <div className="text-[11px] font-semibold text-pink-100 uppercase tracking-wider flex items-center gap-1.5">
              <span>Checkout Oficial</span>
              <span>•</span>
              <span>Angola 🇦🇴</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-serif font-bold">Finalizar Encomenda</h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center transition-colors"
            aria-label="Fechar checkout"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
          {error && (
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          <form id="checkout-form" onSubmit={handleSubmitOrder} className="space-y-6">
            {/* Step 1: Customer Contact info */}
            <div className="bg-pink-50/40 p-4 rounded-2xl border border-pink-100 space-y-3">
              <div className="flex items-center gap-2 text-zinc-900 font-bold text-xs uppercase tracking-wide">
                <User className="w-4 h-4 text-pink-600" />
                <span>1. Dados de Identificação do Cliente</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">
                    Nome Completo *
                  </label>
                  <input
                    type="text"
                    required
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-pink-200 focus:outline-hidden focus:ring-2 focus:ring-pink-500 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">
                    Telefone para Notificações *
                  </label>
                  <input
                    type="tel"
                    required
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-pink-200 focus:outline-hidden focus:ring-2 focus:ring-pink-500 bg-white"
                  />
                </div>
              </div>
            </div>

            {/* Step 2: Destination & Carrier in Angola (NO RESIDENTIAL ADDRESS REQUIRED) */}
            <div className="bg-pink-50/40 p-4 rounded-2xl border border-pink-100 space-y-4">
              <div className="flex items-center gap-2 text-zinc-900 font-bold text-xs uppercase tracking-wide">
                <Truck className="w-4 h-4 text-pink-600" />
                <span>2. Destino & Transportadora em Angola</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">
                    Província de Destino *
                  </label>
                  <select
                    value={province}
                    onChange={(e) => handleProvinceChange(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-pink-200 focus:outline-hidden focus:ring-2 focus:ring-pink-500 bg-white font-medium"
                  >
                    {destinations.map((d) => (
                      <option key={d.province} value={d.province}>
                        {d.province} {d.baselineFee ? `(${formatKz(d.baselineFee)})` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">
                    Município
                  </label>
                  {municipalities.length > 0 ? (
                    <select
                      value={municipality}
                      onChange={(e) => setMunicipality(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-pink-200 focus:outline-hidden focus:ring-2 focus:ring-pink-500 bg-white"
                    >
                      {municipalities.map((m) => (
                        <option key={m} value={m}>
                          {m}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      placeholder="Indique o município"
                      value={municipality}
                      onChange={(e) => setMunicipality(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-pink-200 focus:outline-hidden focus:ring-2 focus:ring-pink-500 bg-white"
                    />
                  )}
                </div>
              </div>

              {/* Carrier Selection */}
              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-2">
                  Escolha da Transportadora *
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {carriers.map((carrier) => {
                    const isSelected = carrierId === carrier.id;
                    return (
                      <label
                        key={carrier.id}
                        className={`flex items-start gap-2.5 p-3 rounded-xl border cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-pink-100/70 border-pink-500 shadow-xs'
                            : 'bg-white border-pink-200 hover:border-pink-300'
                        }`}
                      >
                        <input
                          type="radio"
                          name="carrier"
                          value={carrier.id}
                          checked={isSelected}
                          onChange={() => setCarrierId(carrier.id)}
                          className="mt-0.5 text-pink-600 focus:ring-pink-500"
                        />
                        <div className="text-xs">
                          <div className="font-bold text-zinc-900">{carrier.name}</div>
                          <div className="text-[11px] text-zinc-500">{carrier.note}</div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Conditional text input for "Outra transportadora" (Rule 6) */}
              {isOtherCarrier && (
                <div className="p-3 bg-white rounded-xl border-2 border-pink-400 animate-in fade-in">
                  <label className="block text-xs font-bold text-pink-700 mb-1">
                    Nome da Outra Transportadora Pretendida * (Obrigatório)
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Turiangola, Transportes Muxima, Cargo Express..."
                    value={customCarrierName}
                    onChange={(e) => setCustomCarrierName(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-pink-300 focus:outline-hidden focus:ring-2 focus:ring-pink-500"
                  />
                  <p className="text-[10px] text-zinc-500 mt-1">
                    A loja confirmará a disponibilidade de rota e entrega para a transportadora indicada.
                  </p>
                </div>
              )}

              {/* Pickup point or optional delivery instructions */}
              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">
                  Ponto de Recolha / Instruções de Entrega (Opcional)
                </label>
                <input
                  type="text"
                  placeholder="Ex: Terminal central de encomendas, ao lado do mercado ou recolha por procurador"
                  value={pickupInstructions}
                  onChange={(e) => setPickupInstructions(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-pink-200 focus:outline-hidden focus:ring-2 focus:ring-pink-500 bg-white"
                />
              </div>
            </div>

            {/* Step 3: Order Summary before confirmation */}
            <div className="bg-white p-4 rounded-2xl border border-pink-200 shadow-xs space-y-3">
              <h4 className="text-xs font-bold text-zinc-900 uppercase tracking-wider">
                Resumo da Compra
              </h4>

              <div className="divide-y divide-pink-50 max-h-36 overflow-y-auto">
                {items.map((item) => (
                  <div key={item.product.id} className="py-2 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 truncate pr-2">
                      <span className="font-bold text-pink-600">{item.quantity}x</span>
                      <span className="truncate text-zinc-800">{item.product.name}</span>
                    </div>
                    <span className="font-bold text-zinc-900 font-serif shrink-0">
                      {formatKz(item.product.price * item.quantity)}
                    </span>
                  </div>
                ))}
              </div>

              <div className="pt-2 border-t border-pink-100 space-y-1.5 text-xs">
                <div className="flex justify-between text-zinc-600">
                  <span>Subtotal:</span>
                  <span className="font-bold font-serif">{formatKz(subtotal)}</span>
                </div>
                <div className="flex justify-between text-zinc-600">
                  <span>Custo de Envio ({province}):</span>
                  <span className="font-bold font-serif">
                    {shippingFee > 0 ? formatKz(shippingFee) : 'A confirmar pela loja'}
                  </span>
                </div>
                <div className="flex justify-between text-zinc-900 pt-2 border-t border-pink-100 font-bold text-sm">
                  <span>Total a Pagar:</span>
                  <span className="text-lg font-extrabold text-pink-600 font-serif">
                    {formatKz(total)}
                  </span>
                </div>
              </div>
            </div>

            <div className="p-3 bg-pink-50/80 rounded-xl text-[11px] text-zinc-600 flex items-start gap-2 border border-pink-100">
              <ShieldCheck className="w-4 h-4 text-pink-600 shrink-0 mt-0.5" />
              <span>
                Ao confirmar, a sua encomenda será criada e você poderá efectuar o pagamento por Multicaixa Express ou Transferência e anexar o comprovativo directamente na tela seguinte!
              </span>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 border-t border-pink-100 bg-white shrink-0 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-zinc-200 text-xs font-semibold text-zinc-600 hover:bg-zinc-50"
          >
            Voltar
          </button>

          <button
            form="checkout-form"
            type="submit"
            disabled={loading}
            className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 active:scale-95 text-white font-bold text-xs tracking-wide shadow-md shadow-pink-200 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
          >
            {loading ? (
              <span>A processar encomenda...</span>
            ) : (
              <>
                <span>Confirmar Encomenda • {formatKz(total)}</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
