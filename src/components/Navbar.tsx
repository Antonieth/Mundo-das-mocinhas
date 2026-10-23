import React, { useState } from 'react';
import { ShoppingBag, Search, User as UserIcon, Package, LogOut, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext.js';
import { useCart } from '../context/CartContext.js';
import { formatKz } from '../utils/pricing.js';

interface NavbarProps {
  onOpenAuth: () => void;
  onOpenOrders: () => void;
  onOpenTracking: () => void;
  searchTerm: string;
  onSearchChange: (val: string) => void;
  selectedCategory: string;
  onSelectCategory: (cat: string) => void;
  categories: { id: string; name: string; slug: string }[];
}

export const Navbar: React.FC<NavbarProps> = ({
  onOpenAuth,
  onOpenOrders,
  onOpenTracking,
  searchTerm,
  onSearchChange,
  selectedCategory,
  onSelectCategory,
  categories,
}) => {
  const { user, isAuthenticated, logout } = useAuth();
  const { itemCount, subtotal, openCart } = useCart();
  const [showUserMenu, setShowUserMenu] = useState(false);

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-pink-100 shadow-xs">
      {/* Top Notification Announcement Bar */}
      <div className="bg-gradient-to-r from-pink-600 via-pink-500 to-rose-500 text-white text-xs py-1.5 px-4 text-center font-medium tracking-wide">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <span className="hidden sm:inline">🇦🇴 Bem-vinda ao Mundo das Mocinhas! Envio seguro para todas as províncias de Angola</span>
          <span className="sm:hidden mx-auto">🇦🇴 Envio para todas as províncias de Angola</span>
          <div className="hidden md:flex items-center space-x-4 text-pink-100 text-xs">
            <span>✨ Produtos 100% Originais</span>
            <span>💳 Pagamento Multicaixa & Transferência</span>
          </div>
        </div>
      </div>

      {/* Main Navbar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20 gap-4">
          {/* Brand Logo & Name */}
          <button
            onClick={() => {
              onSelectCategory('todos');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="flex items-center gap-3 text-left group transition-transform active:scale-95"
            aria-label="Página inicial O Mundo das Mocinhas"
          >
            <div className="relative">
              <img
                src="/assets/aistudio/Captura_de_ecr__2026-10-23_003850_d2da05b5.png"
                alt="Logótipo Oficial O Mundo das Mocinhas"
                className="w-13 h-13 rounded-full object-cover shadow-sm border-2 border-pink-400 group-hover:scale-105 transition-transform"
              />
              <span className="absolute -bottom-1 -right-1 bg-amber-400 text-black text-[9px] font-bold px-1 rounded-full shadow-xs">
                AO
              </span>
            </div>
            <div className="flex flex-col justify-center">
              <span className="text-lg sm:text-2xl font-serif font-bold tracking-tight text-zinc-900 leading-tight group-hover:text-pink-600 transition-colors">
                O Mundo das Mocinhas
              </span>
              <span className="text-[10px] sm:text-[11px] font-medium tracking-wider text-pink-500 uppercase leading-none mt-0.5">
                Beleza • Cosméticos • Moda
              </span>
            </div>
          </button>

          {/* Search Bar */}
          <div className="hidden md:flex flex-1 max-w-md mx-4">
            <div className="relative w-full">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
              <input
                type="text"
                placeholder="Pesquisar maquilhagem, skincare, perfumes, bolsas..."
                value={searchTerm}
                onChange={(e) => onSearchChange(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-sm bg-pink-50/50 hover:bg-pink-50 border border-pink-200 rounded-full focus:outline-hidden focus:ring-2 focus:ring-pink-500 focus:bg-white transition-all text-zinc-800 placeholder-zinc-400"
              />
              {searchTerm && (
                <button
                  onClick={() => onSearchChange('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-zinc-400 hover:text-zinc-600"
                >
                  Limpar
                </button>
              )}
            </div>
          </div>

          {/* Right Action Icons */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            {/* Track Order Button */}
            <button
              onClick={onOpenTracking}
              className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:text-pink-600 hover:bg-pink-50 rounded-full border border-pink-100 transition-colors"
              title="Acompanhar estado da encomenda"
            >
              <Package className="w-3.5 h-3.5 text-pink-500" />
              <span>Rastrear</span>
            </button>

            {/* User Account Menu */}
            <div className="relative">
              {isAuthenticated ? (
                <div className="relative">
                  <button
                    onClick={() => setShowUserMenu(!showUserMenu)}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold text-zinc-800 bg-pink-50 hover:bg-pink-100 border border-pink-200 transition-colors"
                  >
                    <div className="w-6 h-6 rounded-full bg-pink-500 text-white flex items-center justify-center font-bold text-[11px]">
                      {user?.name.charAt(0).toUpperCase()}
                    </div>
                    <span className="max-w-[100px] truncate hidden sm:inline">{user?.name}</span>
                  </button>

                  {/* Dropdown Menu */}
                  {showUserMenu && (
                    <div className="absolute right-0 mt-2 w-52 bg-white rounded-2xl shadow-xl border border-pink-100 py-2 z-50 animate-in fade-in slide-in-from-top-2">
                      <div className="px-4 py-2 border-b border-pink-50">
                        <p className="text-xs font-bold text-zinc-800 truncate">{user?.name}</p>
                        <p className="text-[11px] text-zinc-500 truncate">{user?.phone}</p>
                        <span className="inline-block mt-1 text-[10px] bg-pink-100 text-pink-700 px-2 py-0.5 rounded-full font-medium">
                          Cliente Registado
                        </span>
                      </div>
                      <button
                        onClick={() => {
                          setShowUserMenu(false);
                          onOpenOrders();
                        }}
                        className="w-full text-left px-4 py-2 text-xs text-zinc-700 hover:bg-pink-50 hover:text-pink-600 flex items-center gap-2"
                      >
                        <Package className="w-4 h-4 text-pink-500" />
                        Minhas Encomendas
                      </button>
                      <button
                        onClick={() => {
                          setShowUserMenu(false);
                          logout();
                        }}
                        className="w-full text-left px-4 py-2 text-xs text-rose-600 hover:bg-rose-50 flex items-center gap-2"
                      >
                        <LogOut className="w-4 h-4" />
                        Terminar Sessão
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <button
                  onClick={onOpenAuth}
                  className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-zinc-700 hover:text-pink-600 hover:bg-pink-50 rounded-full border border-pink-200 transition-all"
                >
                  <UserIcon className="w-4 h-4 text-pink-500" />
                  <span className="hidden sm:inline">Entrar / Registar</span>
                </button>
              )}
            </div>

            {/* Cart Button */}
            <button
              onClick={openCart}
              className="relative flex items-center gap-2 px-3.5 py-2 bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white rounded-full font-semibold text-xs shadow-md shadow-pink-200 hover:shadow-lg transition-all active:scale-95"
              aria-label={`Carrinho com ${itemCount} itens`}
            >
              <ShoppingBag className="w-4 h-4" />
              <span className="font-bold">{itemCount}</span>
              {subtotal > 0 && (
                <span className="hidden md:inline pl-1 border-l border-pink-400 font-medium">
                  {formatKz(subtotal)}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Mobile Search Bar */}
        <div className="md:hidden pb-3">
          <div className="relative w-full">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <input
              type="text"
              placeholder="Pesquisar produtos, maquilhagem, skincare..."
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-xs bg-pink-50/50 border border-pink-200 rounded-full focus:outline-hidden focus:ring-2 focus:ring-pink-500 focus:bg-white text-zinc-800 placeholder-zinc-400"
            />
          </div>
        </div>

        {/* Sub-bar Categories Navigation */}
        <div className="flex items-center space-x-1 overflow-x-auto py-2 scrollbar-none border-t border-pink-50 text-xs">
          <button
            onClick={() => onSelectCategory('todos')}
            className={`px-3 py-1 rounded-full whitespace-nowrap font-medium transition-all ${
              selectedCategory === 'todos'
                ? 'bg-zinc-900 text-white shadow-xs'
                : 'text-zinc-600 hover:text-pink-600 hover:bg-pink-50'
            }`}
          >
            Todos os Produtos
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => onSelectCategory(cat.name)}
              className={`px-3 py-1 rounded-full whitespace-nowrap font-medium transition-all ${
                selectedCategory.toLowerCase() === cat.name.toLowerCase()
                  ? 'bg-pink-500 text-white shadow-xs'
                  : 'text-zinc-600 hover:text-pink-600 hover:bg-pink-50'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>
    </header>
  );
};
