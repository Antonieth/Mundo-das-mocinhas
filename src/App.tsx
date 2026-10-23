/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext.js';
import { CartProvider, useCart } from './context/CartContext.js';
import { Navbar } from './components/Navbar.js';
import { HeroBanner } from './components/HeroBanner.js';
import { CategoryCircles } from './components/CategoryCircles.js';
import { ProductCard } from './components/ProductCard.js';
import { ProductDetailModal } from './components/ProductDetailModal.js';
import { CartDrawer } from './components/CartDrawer.js';
import { AuthModal } from './components/AuthModal.js';
import { CheckoutModal } from './components/CheckoutModal.js';
import { PaymentReceiptModal } from './components/PaymentReceiptModal.js';
import { CustomerOrdersModal } from './components/CustomerOrdersModal.js';
import { Footer } from './components/Footer.js';
import { AdminPanel } from './admin/AdminPanel.js';
import { Product, Category, Order } from './types.js';
import { Sparkles, Filter, SlidersHorizontal, ShieldAlert } from 'lucide-react';

function StoreApp() {
  const { user, isAuthenticated, isAdmin, isLoading, logout } = useAuth();
  const { openCart } = useCart();

  // Route state
  const [isAdminRoute, setIsAdminRoute] = useState(() => {
    return (
      window.location.pathname.startsWith('/admin') ||
      window.location.search.includes('view=admin')
    );
  });

  // Catalog State
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('todos');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [sortBy, setSortBy] = useState<string>('featured');
  const [loading, setLoading] = useState<boolean>(true);

  // Modals
  const [activeProduct, setActiveProduct] = useState<Product | null>(null);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isOrdersOpen, setIsOrdersOpen] = useState(false);
  const [isTrackingMode, setIsTrackingMode] = useState(false);
  const [activeReceiptOrder, setActiveReceiptOrder] = useState<Order | null>(null);

  // Sync browser URL for /admin
  useEffect(() => {
    const handlePopState = () => {
      setIsAdminRoute(
        window.location.pathname.startsWith('/admin') ||
        window.location.search.includes('view=admin')
      );
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigateToStore = () => {
    window.history.pushState({}, '', '/');
    setIsAdminRoute(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Fetch initial data
  const loadCatalog = () => {
    setLoading(true);
    const query = new URLSearchParams();
    if (selectedCategory && selectedCategory !== 'todos') {
      query.set('category', selectedCategory);
    }
    if (searchTerm) {
      query.set('search', searchTerm);
    }
    if (sortBy) {
      query.set('sort', sortBy);
    }

    fetch(`/api/products?${query.toString()}`)
      .then((res) => res.json())
      .then((data) => {
        setProducts(data.products || []);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Error loading products:', err);
        setLoading(false);
      });
  };

  useEffect(() => {
    // Categories
    fetch('/api/categories')
      .then((res) => res.json())
      .then((data) => {
        if (data.categories) setCategories(data.categories);
      })
      .catch((err) => console.error(err));
  }, []);

  useEffect(() => {
    if (!isAdminRoute) {
      loadCatalog();
    }
  }, [selectedCategory, searchTerm, sortBy, isAdminRoute]);

  // If in administrative route, handle authentication and authorization strictly
  if (isAdminRoute) {
    if (isLoading) {
      return (
        <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-pink-500 border-t-transparent rounded-full animate-spin" />
        </div>
      );
    }

    // Delegate access control and screens directly to AdminPanel (handles Setup Mode, 403 Client Denied, Admin Login, and Admin Dashboard)
    return <AdminPanel onBackToStore={navigateToStore} />;
  }

  return (
    <div className="min-h-screen bg-[#FFF8F9] flex flex-col">
      {/* Customer Header */}
      <Navbar
        onOpenAuth={() => {
          setAuthMode('login');
          setIsAuthOpen(true);
        }}
        onOpenOrders={() => {
          setIsTrackingMode(false);
          setIsOrdersOpen(true);
        }}
        onOpenTracking={() => {
          setIsTrackingMode(true);
          setIsOrdersOpen(true);
        }}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        selectedCategory={selectedCategory}
        onSelectCategory={setSelectedCategory}
        categories={categories}
      />

      {/* Main Content */}
      <main className="flex-1 pb-16">
        {/* Editorial Hero Banner */}
        <HeroBanner
          onShopClick={() => {
            const catalogEl = document.getElementById('catalogo-section');
            if (catalogEl) {
              catalogEl.scrollIntoView({ behavior: 'smooth' });
            }
          }}
        />

        {/* Visual Category Circles */}
        <CategoryCircles
          selectedCategory={selectedCategory}
          onSelectCategory={setSelectedCategory}
        />

        {/* Catalog Section */}
        <section id="catalogo-section" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-pink-100">
            <div>
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-pink-500" />
                <h2 className="text-xl sm:text-2xl font-serif font-bold text-zinc-900">
                  {selectedCategory === 'todos' ? 'Colecção Completa' : selectedCategory}
                </h2>
              </div>
              <p className="text-xs text-zinc-500 mt-0.5">
                {products.length} {products.length === 1 ? 'produto encontrado' : 'produtos encontrados'} • Preços oficiais em Kwanzas
              </p>
            </div>

            {/* Filter and Sort controls */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1 text-xs text-zinc-600 bg-white px-3 py-1.5 rounded-xl border border-pink-100 shadow-2xs">
                <SlidersHorizontal className="w-3.5 h-3.5 text-pink-500" />
                <span className="font-semibold">Ordenar:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="bg-transparent border-none focus:outline-hidden text-xs font-bold text-zinc-800 cursor-pointer"
                >
                  <option value="featured">Destaques da Loja</option>
                  <option value="price-asc">Preço: Menor para Maior</option>
                  <option value="price-desc">Preço: Maior para Menor</option>
                  <option value="name-asc">Ordem Alfabética</option>
                </select>
              </div>

              {selectedCategory !== 'todos' && (
                <button
                  onClick={() => setSelectedCategory('todos')}
                  className="text-xs text-pink-600 hover:text-pink-700 font-semibold underline"
                >
                  Limpar Filtros
                </button>
              )}
            </div>
          </div>

          {/* Product Grid */}
          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6 py-12">
              {[...Array(8)].map((_, i) => (
                <div
                  key={i}
                  className="h-72 rounded-2xl bg-pink-100/40 animate-pulse border border-pink-100"
                />
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-3xl border border-pink-100 shadow-xs p-8 max-w-lg mx-auto">
              <Sparkles className="w-12 h-12 text-pink-400 mx-auto mb-3" />
              <h3 className="font-serif font-bold text-zinc-900 text-lg mb-1">
                Nenhum produto encontrado
              </h3>
              <p className="text-xs text-zinc-500 mb-6">
                Não foram encontrados produtos para esta pesquisa ou categoria.
              </p>
              <button
                onClick={() => {
                  setSelectedCategory('todos');
                  setSearchTerm('');
                }}
                className="px-5 py-2.5 rounded-full bg-pink-500 hover:bg-pink-600 text-white font-bold text-xs"
              >
                Ver Todo o Catálogo
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
              {products.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onViewDetails={setActiveProduct}
                />
              ))}
            </div>
          )}
        </section>
      </main>

      {/* Customer Footer */}
      <Footer
        onOpenOrders={() => {
          setIsTrackingMode(false);
          setIsOrdersOpen(true);
        }}
        onSelectCategory={setSelectedCategory}
      />

      {/* MODALS */}

      {/* 1. Product Detail */}
      <ProductDetailModal
        product={activeProduct}
        onClose={() => setActiveProduct(null)}
      />

      {/* 2. Cart Drawer */}
      <CartDrawer
        onProceedToCheckout={() => setIsCheckoutOpen(true)}
        onRequireAuth={() => {
          setAuthMode('login');
          setIsAuthOpen(true);
        }}
      />

      {/* 3. Auth Modal (Login / Register) */}
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        initialMode={authMode}
        onSuccess={() => {
          // If customer was opening checkout, open it directly after auth
          setIsCheckoutOpen(true);
        }}
      />

      {/* 4. Checkout Modal */}
      <CheckoutModal
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        onOrderCreated={(order) => {
          setActiveReceiptOrder(order);
        }}
      />

      {/* 5. Payment & Receipt Upload Modal */}
      <PaymentReceiptModal
        order={activeReceiptOrder}
        isOpen={!!activeReceiptOrder}
        onClose={() => setActiveReceiptOrder(null)}
        onOrderUpdated={(updated) => {
          setActiveReceiptOrder(updated);
        }}
      />

      {/* 6. Customer Orders & Tracking Modal */}
      <CustomerOrdersModal
        isOpen={isOrdersOpen}
        onClose={() => setIsOrdersOpen(false)}
        initialTrackingMode={isTrackingMode}
        onSelectOrder={(order) => {
          setActiveReceiptOrder(order);
        }}
      />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <StoreApp />
      </CartProvider>
    </AuthProvider>
  );
}
