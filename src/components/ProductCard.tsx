import React from 'react';
import { ShoppingBag, Eye, Heart } from 'lucide-react';
import { Product } from '../types.js';
import { formatKz } from '../utils/pricing.js';
import { useCart } from '../context/CartContext.js';

interface ProductCardProps {
  product: Product;
  onViewDetails: (product: Product) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product, onViewDetails }) => {
  const { addToCart } = useCart();
  const [isLiked, setIsLiked] = React.useState(false);

  const isOutOfStock = product.stock <= 0;

  return (
    <div className="group relative bg-white rounded-2xl border border-pink-100 hover:border-pink-300 shadow-xs hover:shadow-xl transition-all duration-300 flex flex-col overflow-hidden">
      {/* Product Image Frame */}
      <div className="relative aspect-square w-full overflow-hidden bg-pink-50/40 cursor-pointer" onClick={() => onViewDetails(product)}>
        <img
          src={product.images[0] || '/assets/aistudio/Universo_Cor-de-Rosa_de_Beleza_e_Moda_4b1c881c.png'}
          alt={product.name}
          className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
        />

        {/* Badge */}
        {product.badge && (
          <div className="absolute top-2.5 left-2.5 bg-gradient-to-r from-pink-500 to-rose-500 text-white text-[10px] font-bold px-2.5 py-1 rounded-full shadow-sm tracking-wide">
            {product.badge}
          </div>
        )}

        {/* Favorite Heart Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            setIsLiked(!isLiked);
          }}
          className={`absolute top-2.5 right-2.5 w-8 h-8 rounded-full flex items-center justify-center transition-colors shadow-xs ${
            isLiked ? 'bg-pink-50 text-pink-500' : 'bg-white/80 hover:bg-white text-zinc-400 hover:text-pink-500'
          }`}
          aria-label="Guardar nos favoritos"
        >
          <Heart className={`w-4 h-4 ${isLiked ? 'fill-pink-500 text-pink-500' : ''}`} />
        </button>

        {/* Quick View Overlay on Hover */}
        <div className="absolute inset-0 bg-pink-900/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
          <span className="bg-white/95 text-zinc-900 text-xs font-semibold px-3 py-1.5 rounded-full shadow-md flex items-center gap-1.5 backdrop-blur-xs">
            <Eye className="w-3.5 h-3.5 text-pink-500" />
            Ver detalhes
          </span>
        </div>
      </div>

      {/* Info Section */}
      <div className="p-4 flex flex-col flex-1 justify-between">
        <div>
          <div className="flex items-center justify-between text-[11px] font-medium text-pink-500 mb-1">
            <span>{product.category}</span>
            {product.stock <= 5 && !isOutOfStock && (
              <span className="text-amber-600 font-semibold">Resta {product.stock} un.</span>
            )}
            {isOutOfStock && <span className="text-rose-500 font-semibold">Esgotado</span>}
          </div>

          <h3
            onClick={() => onViewDetails(product)}
            className="font-semibold text-zinc-900 text-sm line-clamp-2 hover:text-pink-600 transition-colors cursor-pointer"
            title={product.name}
          >
            {product.name}
          </h3>
        </div>

        <div className="mt-4 pt-3 border-t border-pink-50 flex items-center justify-between gap-2">
          <div>
            <div className="text-[10px] text-zinc-400 font-medium">Preço</div>
            <div className="text-base sm:text-lg font-bold text-zinc-900 font-serif tracking-tight">
              {formatKz(product.price)}
            </div>
          </div>

          <button
            onClick={() => addToCart(product, 1)}
            disabled={isOutOfStock}
            className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer ${
              isOutOfStock
                ? 'bg-zinc-100 text-zinc-400 cursor-not-allowed'
                : 'bg-pink-500 hover:bg-pink-600 text-white shadow-sm shadow-pink-200 hover:shadow-md'
            }`}
            aria-label={`Adicionar ${product.name} ao carrinho`}
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Adicionar</span>
          </button>
        </div>
      </div>
    </div>
  );
};
