import React from 'react';
import { Sparkles, Heart, Scissors, Gem, Shirt, Smile, ShoppingBag, Footprints } from 'lucide-react';

interface CategoryCirclesProps {
  selectedCategory: string;
  onSelectCategory: (categoryName: string) => void;
}

const CATEGORY_ITEMS = [
  { name: 'Maquilhagem', label: 'Maquilhagem', icon: Sparkles, color: 'from-pink-400 to-rose-500' },
  { name: 'Skincare', label: 'Skincare', icon: Smile, color: 'from-rose-400 to-pink-500' },
  { name: 'Cabelos', label: 'Cabelos', icon: Scissors, color: 'from-fuchsia-400 to-pink-600' },
  { name: 'Bolsas & Necessaires', label: 'Bolsas', icon: ShoppingBag, color: 'from-pink-500 to-purple-500' },
  { name: 'Acessórios', label: 'Acessórios', icon: Gem, color: 'from-amber-400 to-pink-500' },
  { name: 'Perfumes', label: 'Perfumes', icon: Heart, color: 'from-pink-400 to-red-400' },
  { name: 'Moda', label: 'Moda', icon: Shirt, color: 'from-purple-400 to-pink-500' },
  { name: 'Calçados', label: 'Calçados', icon: Footprints, color: 'from-rose-400 to-amber-500' },
];

export const CategoryCircles: React.FC<CategoryCirclesProps> = ({
  selectedCategory,
  onSelectCategory,
}) => {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-10">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg sm:text-xl font-serif font-bold text-zinc-900">
            Categorias em Destaque
          </h2>
          <p className="text-xs text-zinc-500">Navegue pelas nossas selecções cor-de-rosa</p>
        </div>
        <button
          onClick={() => onSelectCategory('todos')}
          className="text-xs font-semibold text-pink-600 hover:text-pink-700 underline"
        >
          Ver todas
        </button>
      </div>

      <div className="flex items-center gap-4 sm:gap-6 overflow-x-auto pb-4 scrollbar-none">
        {CATEGORY_ITEMS.map((item) => {
          const Icon = item.icon;
          const isSelected = selectedCategory.toLowerCase() === item.name.toLowerCase();

          return (
            <button
              key={item.name}
              onClick={() => onSelectCategory(isSelected ? 'todos' : item.name)}
              className="group flex flex-col items-center shrink-0 transition-transform active:scale-95"
            >
              <div
                className={`w-18 h-18 sm:w-20 sm:h-20 rounded-full flex items-center justify-center p-0.5 transition-all ${
                  isSelected
                    ? 'ring-3 ring-pink-500 ring-offset-2 scale-105 shadow-md shadow-pink-200'
                    : 'group-hover:scale-105'
                }`}
              >
                <div
                  className={`w-full h-full rounded-full bg-gradient-to-br ${item.color} flex items-center justify-center text-white shadow-inner`}
                >
                  <Icon className="w-8 h-8 drop-shadow-xs" />
                </div>
              </div>
              <span
                className={`mt-2 text-xs font-medium text-center transition-colors ${
                  isSelected ? 'font-bold text-pink-600' : 'text-zinc-700 group-hover:text-pink-600'
                }`}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
