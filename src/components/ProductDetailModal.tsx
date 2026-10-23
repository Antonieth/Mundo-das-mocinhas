import React, { useState } from 'react';
import { X, ShoppingBag, ShieldCheck, Truck, Sparkles, Check } from 'lucide-react';
import { Product } from '../types.js';
import { formatKz } from '../utils/pricing.js';
import { useCart } from '../context/CartContext.js';

interface ProductDetailModalProps {
  product: Product | null;
  onClose: () => void;
}

export const ProductDetailModal: React.FC<ProductDetailModalProps> = ({ product, onClose }) => {
  const { addToCart } = useCart();
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);

  if (!product) return null;

  const isOutOfStock = product.stock <= 0;

  const handleAdd = () => {
    addToCart(product, quantity);
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="relative bg-white rounded-3xl max-w-3xl w-full shadow-2xl border border-pink-100 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 w-9 h-9 rounded-full bg-white/90 hover:bg-white text-zinc-500 hover:text-zinc-800 shadow-md flex items-center justify-center transition-colors"
          aria-label="Fechar detalhes do produto"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="grid grid-cols-1 md:grid-cols-2">
          {/* Product Image Frame */}
          <div className="relative aspect-square md:aspect-auto bg-pink-50/50 flex items-center justify-center p-6 border-b md:border-b-0 md:border-r border-pink-100">
            <img
              src={product.images[0] || '/assets/aistudio/Universo_Cor-de-Rosa_de_Beleza_e_Moda_4b1c881c.png'}
              alt={product.name}
              className="max-h-[380px] w-full object-contain rounded-2xl shadow-xs"
            />
            {product.badge && (
              <span className="absolute top-4 left-4 bg-pink-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-md">
                {product.badge}
              </span>
            )}
          </div>

          {/* Details & Action */}
          <div className="p-6 sm:p-8 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-pink-100 text-pink-700">
                  {product.category}
                </span>
                <span className="text-xs text-zinc-400">•</span>
                <span className={`text-xs font-medium ${isOutOfStock ? 'text-rose-500' : 'text-emerald-600'}`}>
                  {isOutOfStock ? 'Esgotado' : `${product.stock} disponíveis em stock`}
                </span>
              </div>

              <h2 className="text-xl sm:text-2xl font-bold font-serif text-zinc-900 leading-tight">
                {product.name}
              </h2>

              <div className="mt-3 text-2xl sm:text-3xl font-extrabold text-pink-600 font-serif">
                {formatKz(product.price)}
              </div>

              <div className="mt-4 pt-4 border-t border-pink-100">
                <h4 className="text-xs font-bold text-zinc-800 uppercase tracking-wider mb-2">
                  Descrição & Características
                </h4>
                <p className="text-xs sm:text-sm text-zinc-600 leading-relaxed max-h-40 overflow-y-auto pr-1">
                  {product.description}
                </p>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-pink-100 space-y-4">
              {/* Quantity Picker */}
              {!isOutOfStock && (
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-zinc-700">Quantidade:</span>
                  <div className="flex items-center border border-pink-200 rounded-xl bg-pink-50/50">
                    <button
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      disabled={quantity <= 1}
                      className="px-3 py-1.5 text-sm font-bold text-zinc-700 hover:text-pink-600 disabled:opacity-30"
                    >
                      -
                    </button>
                    <span className="px-3 py-1 text-xs font-bold text-zinc-900">{quantity}</span>
                    <button
                      onClick={() => setQuantity(Math.min(product.stock, quantity + 1))}
                      disabled={quantity >= product.stock}
                      className="px-3 py-1.5 text-sm font-bold text-zinc-700 hover:text-pink-600 disabled:opacity-30"
                    >
                      +
                    </button>
                  </div>
                </div>
              )}

              {/* Add to Cart Button */}
              <button
                onClick={handleAdd}
                disabled={isOutOfStock}
                className={`w-full py-3.5 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-md ${
                  added
                    ? 'bg-emerald-600 text-white'
                    : isOutOfStock
                    ? 'bg-zinc-200 text-zinc-400 cursor-not-allowed'
                    : 'bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white shadow-pink-200 active:scale-95'
                }`}
              >
                {added ? (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Adicionado com Sucesso!</span>
                  </>
                ) : isOutOfStock ? (
                  <span>Produto Esgotado</span>
                ) : (
                  <>
                    <ShoppingBag className="w-4 h-4" />
                    <span>Adicionar ao Carrinho • {formatKz(product.price * quantity)}</span>
                  </>
                )}
              </button>

              {/* Delivery info */}
              <div className="p-3 bg-pink-50/60 rounded-xl border border-pink-100 flex items-start gap-2 text-[11px] text-zinc-600">
                <Truck className="w-4 h-4 text-pink-600 shrink-0 mt-0.5" />
                <span>
                  Envios para todas as províncias através da transportadora seleccionada no checkout (Real Express, Macon, Huambo Express, Rosalina Express, etc.).
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
