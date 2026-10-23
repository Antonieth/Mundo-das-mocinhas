import React from 'react';
import { X, Trash2, ShoppingBag, ArrowRight, ShieldCheck } from 'lucide-react';
import { useCart } from '../context/CartContext.js';
import { useAuth } from '../context/AuthContext.js';
import { formatKz } from '../utils/pricing.js';

interface CartDrawerProps {
  onProceedToCheckout: () => void;
  onRequireAuth: () => void;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({
  onProceedToCheckout,
  onRequireAuth,
}) => {
  const { items, isCartOpen, closeCart, updateQuantity, removeFromCart, subtotal, itemCount } = useCart();
  const { isAuthenticated } = useAuth();

  if (!isCartOpen) return null;

  const handleCheckoutClick = () => {
    closeCart();
    if (isAuthenticated) {
      onProceedToCheckout();
    } else {
      onRequireAuth();
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/60 backdrop-blur-xs flex justify-end">
      <div className="relative w-full max-w-md bg-white h-full shadow-2xl border-l border-pink-100 flex flex-col animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-pink-100 flex items-center justify-between bg-pink-50/40">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-pink-600" />
            <h2 className="font-serif font-bold text-lg text-zinc-900">Meu Carrinho</h2>
            <span className="text-xs bg-pink-200 text-pink-800 font-bold px-2 py-0.5 rounded-full">
              {itemCount} {itemCount === 1 ? 'item' : 'itens'}
            </span>
          </div>
          <button
            onClick={closeCart}
            className="w-8 h-8 rounded-full bg-white hover:bg-zinc-100 text-zinc-500 hover:text-zinc-800 flex items-center justify-center border border-pink-100 transition-colors"
            aria-label="Fechar carrinho"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content list */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {items.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-zinc-500">
              <div className="w-16 h-16 rounded-full bg-pink-50 border border-pink-100 flex items-center justify-center text-pink-400 mb-4">
                <ShoppingBag className="w-8 h-8" />
              </div>
              <h3 className="font-serif font-bold text-zinc-800 text-base mb-1">
                O seu carrinho está vazio
              </h3>
              <p className="text-xs text-zinc-500 max-w-xs mb-6">
                Descubra os produtos mais queridos das Mocinhas e adicione ao seu carrinho.
              </p>
              <button
                onClick={closeCart}
                className="px-5 py-2.5 rounded-full bg-pink-500 hover:bg-pink-600 text-white text-xs font-bold transition-all shadow-sm"
              >
                Explorar Produtos
              </button>
            </div>
          ) : (
            items.map((item) => (
              <div
                key={item.product.id}
                className="flex items-center gap-3 p-3 rounded-2xl border border-pink-100 bg-pink-50/20 hover:bg-pink-50/50 transition-colors"
              >
                <img
                  src={item.product.images[0] || '/assets/aistudio/Universo_Cor-de-Rosa_de_Beleza_e_Moda_4b1c881c.png'}
                  alt={item.product.name}
                  className="w-16 h-16 rounded-xl object-cover border border-pink-100 shrink-0 bg-white"
                />

                <div className="flex-1 min-w-0">
                  <h4 className="text-xs font-bold text-zinc-900 truncate" title={item.product.name}>
                    {item.product.name}
                  </h4>
                  <div className="text-xs font-bold text-pink-600 font-serif mt-0.5">
                    {formatKz(item.product.price)}
                  </div>

                  {/* Quantity Controls */}
                  <div className="flex items-center gap-3 mt-2">
                    <div className="flex items-center border border-pink-200 rounded-lg bg-white">
                      <button
                        onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                        className="w-6 h-6 flex items-center justify-center text-xs font-bold text-zinc-600 hover:text-pink-600"
                        aria-label="Diminuir quantidade"
                      >
                        -
                      </button>
                      <span className="w-7 text-center text-xs font-bold text-zinc-800">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                        disabled={item.quantity >= item.product.stock}
                        className="w-6 h-6 flex items-center justify-center text-xs font-bold text-zinc-600 hover:text-pink-600 disabled:opacity-30"
                        aria-label="Aumentar quantidade"
                      >
                        +
                      </button>
                    </div>

                    <span className="text-[11px] text-zinc-500 font-medium">
                      Subtotal: {formatKz(item.product.price * item.quantity)}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => removeFromCart(item.product.id)}
                  className="text-zinc-400 hover:text-rose-500 p-1.5 transition-colors"
                  aria-label={`Remover ${item.product.name}`}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))
          )}
        </div>

        {/* Footer with subtotal and checkout */}
        {items.length > 0 && (
          <div className="p-4 sm:p-5 border-t border-pink-100 bg-white space-y-3">
            <div className="space-y-1 text-xs">
              <div className="flex justify-between text-zinc-600">
                <span>Subtotal dos produtos:</span>
                <span className="font-bold text-zinc-900 font-serif">{formatKz(subtotal)}</span>
              </div>
              <div className="flex justify-between text-zinc-600">
                <span>Envio por província:</span>
                <span className="text-zinc-500 italic">Calculado no checkout</span>
              </div>
            </div>

            <div className="pt-2 border-t border-pink-100 flex justify-between items-baseline">
              <span className="text-sm font-bold text-zinc-900">Total previsto:</span>
              <span className="text-xl font-extrabold text-pink-600 font-serif">
                {formatKz(subtotal)}
              </span>
            </div>

            {!isAuthenticated && (
              <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-[11px] text-amber-800 flex items-start gap-1.5">
                <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span>
                  Para concluir a compra é obrigatório iniciar sessão. O seu carrinho será mantido!
                </span>
              </div>
            )}

            <button
              onClick={handleCheckoutClick}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 active:scale-95 text-white font-bold text-sm tracking-wide shadow-md shadow-pink-200 flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <span>{isAuthenticated ? 'Finalizar Compra' : 'Entrar e Finalizar Compra'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
