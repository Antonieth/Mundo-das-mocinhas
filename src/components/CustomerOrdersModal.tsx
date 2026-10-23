import React, { useState, useEffect } from 'react';
import { X, Package, Eye, Clock, CheckCircle2, AlertCircle, Search } from 'lucide-react';
import { Order } from '../types.js';
import { formatKz } from '../utils/pricing.js';
import { ORDER_STATUS_MAP } from '../utils/orderStatus.js';
import { useAuth } from '../context/AuthContext.js';

interface CustomerOrdersModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectOrder: (order: Order) => void;
  initialTrackingMode?: boolean;
}

export const CustomerOrdersModal: React.FC<CustomerOrdersModalProps> = ({
  isOpen,
  onClose,
  onSelectOrder,
  initialTrackingMode = false,
}) => {
  const { token, isAuthenticated } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [trackingNumber, setTrackingNumber] = useState('');
  const [searchedOrder, setSearchedOrder] = useState<Order | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !token) return;
    setLoading(true);
    fetch('/api/orders', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then((res) => res.json())
      .then((data) => {
        setLoading(false);
        if (data.orders) setOrders(data.orders);
      })
      .catch((err) => {
        setLoading(false);
        console.error('Error loading orders:', err);
      });
  }, [isOpen, token]);

  if (!isOpen) return null;

  const handleSearchOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setSearchError(null);
    setSearchedOrder(null);
    if (!trackingNumber.trim()) return;

    try {
      const res = await fetch(`/api/orders/${trackingNumber.trim()}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await res.json();
      if (!res.ok) {
        setSearchError(data.error || 'Encomenda não encontrada com esse código.');
      } else {
        setSearchedOrder(data.order);
      }
    } catch (err: any) {
      setSearchError('Erro ao consultar encomenda.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="relative bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-pink-100 overflow-hidden animate-in fade-in zoom-in-95 duration-200 my-4 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-pink-500 to-rose-500 text-white flex items-center justify-between shrink-0">
          <div>
            <div className="text-[11px] font-semibold text-pink-100 uppercase tracking-wider flex items-center gap-1.5">
              <span>Área do Cliente</span>
              <span>•</span>
              <span>O Mundo das Mocinhas</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-serif font-bold">
              {initialTrackingMode ? 'Acompanhar Encomenda' : 'Minhas Encomendas'}
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

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
          {/* Quick Tracking Search Box */}
          <div className="bg-pink-50/50 p-4 rounded-2xl border border-pink-100">
            <h4 className="text-xs font-bold text-zinc-900 mb-2">
              Pesquisar por Código da Encomenda (ex: MDM-2026-XXXX)
            </h4>
            <form onSubmit={handleSearchOrder} className="flex gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Introduza o número da encomenda"
                  value={trackingNumber}
                  onChange={(e) => setTrackingNumber(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-pink-200 bg-white focus:outline-hidden focus:ring-2 focus:ring-pink-500"
                />
              </div>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-pink-500 hover:bg-pink-600 text-white text-xs font-bold transition-all shadow-xs"
              >
                Buscar
              </button>
            </form>

            {searchError && (
              <p className="text-xs text-rose-600 font-medium mt-2 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" />
                {searchError}
              </p>
            )}

            {searchedOrder && (
              <div className="mt-3 p-3 bg-white rounded-xl border border-pink-200 flex items-center justify-between">
                <div>
                  <span className="font-mono text-xs font-bold text-zinc-900">
                    {searchedOrder.orderNumber}
                  </span>
                  <p className="text-[11px] text-zinc-500">
                    {ORDER_STATUS_MAP[searchedOrder.status]?.label || searchedOrder.status} • {formatKz(searchedOrder.total)}
                  </p>
                </div>
                <button
                  onClick={() => {
                    onClose();
                    onSelectOrder(searchedOrder);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-pink-50 text-pink-700 hover:bg-pink-100 font-bold text-xs flex items-center gap-1"
                >
                  <Eye className="w-3.5 h-3.5" />
                  Ver Detalhes
                </button>
              </div>
            )}
          </div>

          {/* Orders List */}
          {isAuthenticated ? (
            <div>
              <h3 className="text-xs font-bold text-zinc-700 uppercase tracking-wider mb-3">
                Histórico de Encomendas
              </h3>

              {loading ? (
                <div className="text-center py-8 text-zinc-400 text-xs">A carregar encomendas...</div>
              ) : orders.length === 0 ? (
                <div className="text-center py-8 bg-zinc-50 rounded-2xl border border-zinc-100 text-zinc-500">
                  <Package className="w-10 h-10 mx-auto text-zinc-300 mb-2" />
                  <p className="text-xs font-medium">Ainda não realizou nenhuma encomenda.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {orders.map((order) => {
                    const statusMeta = ORDER_STATUS_MAP[order.status] || ORDER_STATUS_MAP.aguardando_pagamento;
                    return (
                      <div
                        key={order.id}
                        onClick={() => {
                          onClose();
                          onSelectOrder(order);
                        }}
                        className="p-4 rounded-2xl border border-pink-100 hover:border-pink-300 bg-white hover:bg-pink-50/20 transition-all cursor-pointer shadow-xs flex items-center justify-between gap-3"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-xs text-zinc-900">
                              {order.orderNumber}
                            </span>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${statusMeta.badgeBg} ${statusMeta.badgeText}`}>
                              {statusMeta.label}
                            </span>
                          </div>

                          <div className="text-xs text-zinc-500 mt-1 flex flex-wrap gap-x-3 gap-y-1">
                            <span>{new Date(order.createdAt).toLocaleDateString('pt-AO')}</span>
                            <span>•</span>
                            <span>{order.destinationProvince}</span>
                            <span>•</span>
                            <span>{order.carrierName}</span>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <div className="text-sm font-bold text-zinc-900 font-serif">
                            {formatKz(order.total)}
                          </div>
                          <span className="text-[11px] text-pink-600 font-semibold hover:underline flex items-center justify-end gap-1 mt-1">
                            <Eye className="w-3 h-3" />
                            Acompanhar
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-6 text-zinc-500 text-xs">
              Inicie sessão na sua conta para consultar o seu histórico pessoal de encomendas.
            </div>
          )}
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
