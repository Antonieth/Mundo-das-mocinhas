import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  Package,
  ShoppingBag,
  Truck,
  CreditCard,
  MapPin,
  LogOut,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Eye,
  FileText,
  Clock,
  Plus,
  Edit2,
  Trash2,
  Search,
  ExternalLink,
  Shield,
  DollarSign,
  TrendingUp,
  Database,
  HardDrive,
  RefreshCw,
  Copy,
  Check,
  Server,
  Terminal,
  Lock,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.js';
import { Order, Product, Category, ShippingCarrier, ShippingDestination, StorePaymentSettings } from '../types.js';
import { formatKz } from '../utils/pricing.js';
import { ORDER_STATUS_MAP, OrderStatus } from '../utils/orderStatus.js';

interface AdminPanelProps {
  onBackToStore: () => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ onBackToStore }) => {
  const { user, token, isAdmin, login, logout, setAuthSession } = useAuth();

  // Navigation tab
  const [activeTab, setActiveTab] = useState<'dashboard' | 'orders' | 'products' | 'shipping' | 'settings' | 'database'>('dashboard');

  // Setup mode check for first administrator
  const [setupStatus, setSetupStatus] = useState<{
    hasAdmin: boolean;
    needsSetup: boolean;
    isTokenConfigured: boolean;
    loading: boolean;
  }>({
    hasAdmin: true,
    needsSetup: false,
    isTokenConfigured: false,
    loading: true,
  });

  // Setup form states
  const [setupName, setSetupName] = useState('Antonieth António');
  const [setupEmail, setSetupEmail] = useState('antoniethantonio@gmail.com');
  const [setupPhone, setSetupPhone] = useState('+244 923 000 000');
  const [setupPassword, setSetupPassword] = useState('');
  const [setupConfirmPassword, setSetupConfirmPassword] = useState('');
  const [setupToken, setSetupToken] = useState('');
  const [setupError, setSetupError] = useState<string | null>(null);
  const [setupSubmitting, setSetupSubmitting] = useState(false);

  // Login form for admin if not logged in or not admin
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loginLoading, setLoginLoading] = useState(false);

  // Data states
  const [stats, setStats] = useState<any>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [carriers, setCarriers] = useState<ShippingCarrier[]>([]);
  const [destinations, setDestinations] = useState<ShippingDestination[]>([]);
  const [paymentSettings, setPaymentSettings] = useState<StorePaymentSettings | null>(null);

  // Selected Order for Receipt Verification Modal
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectInput, setShowRejectInput] = useState(false);
  const [newTrackingCode, setNewTrackingCode] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('todos');

  // Product Create/Edit Modal
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [prodName, setProdName] = useState('');
  const [prodCategory, setProdCategory] = useState('Maquilhagem');
  const [prodPrice, setProdPrice] = useState(2500);
  const [prodStock, setProdStock] = useState(20);
  const [prodDesc, setProdDesc] = useState('');
  const [prodImage, setProdImage] = useState('');
  const [prodFeatured, setProdFeatured] = useState(false);

  // Settings form
  const [settingsForm, setSettingsForm] = useState<StorePaymentSettings>({
    bankName: '',
    accountHolder: '',
    iban: '',
    multicaixaExpressPhone: '',
    paymentInstructions: '',
    notice: '',
  });
  const [settingsSuccess, setSettingsSuccess] = useState(false);

  // Database Management states
  const [dbInfo, setDbInfo] = useState<any>(null);
  const [dbLoading, setDbLoading] = useState(false);
  const [dbTesting, setDbTesting] = useState(false);
  const [dbTestResult, setDbTestResult] = useState<{ success: boolean; message: string; health?: any } | null>(null);
  const [dbSyncing, setDbSyncing] = useState(false);
  const [dbSyncResult, setDbSyncResult] = useState<{ success: boolean; message: string } | null>(null);
  const [copiedSql, setCopiedSql] = useState(false);
  const [sqlExpanded, setSqlExpanded] = useState(false);

  const loadDbStatus = async () => {
    if (!token || !isAdmin) return;
    setDbLoading(true);
    try {
      const res = await fetch('/api/admin/database-status', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setDbInfo(data);
      }
    } catch (err) {
      console.error('Error fetching database status:', err);
    } finally {
      setDbLoading(false);
    }
  };

  const handleTestSupabase = async () => {
    if (!token) return;
    setDbTesting(true);
    setDbTestResult(null);
    try {
      const res = await fetch('/api/admin/test-supabase', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      setDbTestResult({
        success: data.success,
        message: data.message,
        health: data.health,
      });
      loadDbStatus();
    } catch (err: any) {
      setDbTestResult({
        success: false,
        message: err.message || 'Erro ao conectar ao servidor para teste.',
      });
    } finally {
      setDbTesting(false);
    }
  };

  const handleSyncSupabase = async () => {
    if (!token) return;
    setDbSyncing(true);
    setDbSyncResult(null);
    try {
      const res = await fetch('/api/admin/sync-to-supabase', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (res.ok) {
        setDbSyncResult({
          success: true,
          message: data.message || 'Catálogo sincronizado com sucesso!',
        });
        loadDbStatus();
      } else {
        setDbSyncResult({
          success: false,
          message: data.error || 'Erro ao sincronizar dados com o Supabase.',
        });
      }
    } catch (err: any) {
      setDbSyncResult({
        success: false,
        message: err.message || 'Erro na requisição de sincronização.',
      });
    } finally {
      setDbSyncing(false);
    }
  };

  const handleCopySql = () => {
    if (dbInfo?.schemaSql) {
      navigator.clipboard.writeText(dbInfo.schemaSql);
      setCopiedSql(true);
      setTimeout(() => setCopiedSql(false), 2500);
    }
  };

  // Load Admin Data
  const loadAdminData = async () => {
    if (!token || !isAdmin) return;
    try {
      // 1. Stats
      const statsRes = await fetch('/api/admin/stats', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (statsRes.ok) {
        const data = await statsRes.json();
        setStats(data.stats);
      }

      // 2. Orders
      const ordersRes = await fetch('/api/orders', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (ordersRes.ok) {
        const data = await ordersRes.json();
        setOrders(data.orders || []);
      }

      // 3. Products
      const prodsRes = await fetch('/api/products?all=true', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (prodsRes.ok) {
        const data = await prodsRes.json();
        setProducts(data.products || []);
      }

      // 4. Categories
      const catsRes = await fetch('/api/categories');
      if (catsRes.ok) {
        const data = await catsRes.json();
        setCategories(data.categories || []);
      }

      // 5. Shipping Carriers
      const carriersRes = await fetch('/api/shipping/carriers');
      if (carriersRes.ok) {
        const data = await carriersRes.json();
        setCarriers(data.carriers || []);
      }

      // 6. Destinations
      const destsRes = await fetch('/api/shipping/destinations');
      if (destsRes.ok) {
        const data = await destsRes.json();
        setDestinations(data.destinations || []);
      }

      // 7. Payment Settings
      const settingsRes = await fetch('/api/settings/payment');
      if (settingsRes.ok) {
        const data = await settingsRes.json();
        if (data.paymentSettings) {
          setPaymentSettings(data.paymentSettings);
          setSettingsForm(data.paymentSettings);
        }
      }
    } catch (err) {
      console.error('Error loading admin data:', err);
    }
  };

  const checkSetupStatus = async () => {
    try {
      const res = await fetch('/api/admin/setup-status');
      if (res.ok) {
        const data = await res.json();
        setSetupStatus({
          hasAdmin: data.hasAdmin,
          needsSetup: data.needsSetup,
          isTokenConfigured: data.isTokenConfigured,
          loading: false,
        });
      } else {
        setSetupStatus((prev) => ({ ...prev, loading: false }));
      }
    } catch {
      setSetupStatus((prev) => ({ ...prev, loading: false }));
    }
  };

  useEffect(() => {
    checkSetupStatus();
  }, []);

  useEffect(() => {
    if (isAdmin && token) {
      loadAdminData();
    }
  }, [isAdmin, token]);

  const handleFirstAdminSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSetupError(null);

    if (setupPassword !== setupConfirmPassword) {
      setSetupError('As palavras-passe não coincidem.');
      return;
    }
    if (setupPassword.length < 8) {
      setSetupError('A palavra-passe deve ter pelo menos 8 caracteres.');
      return;
    }
    if (!setupToken.trim()) {
      setSetupError('O Token de Configuração do Servidor (ADMIN_SETUP_TOKEN) é obrigatório.');
      return;
    }

    setSetupSubmitting(true);
    try {
      const res = await fetch('/api/admin/setup-first-admin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-setup-token': setupToken.trim(),
        },
        body: JSON.stringify({
          name: setupName.trim(),
          phone: setupPhone.trim(),
          email: setupEmail.trim(),
          password: setupPassword,
          confirmPassword: setupConfirmPassword,
          setupToken: setupToken.trim(),
        }),
      });

      const data = await res.json();
      setSetupSubmitting(false);

      if (!res.ok) {
        setSetupError(data.error || 'Erro ao criar administrador.');
        return;
      }

      // Successfully registered first administrator
      setAuthSession(data.admin, data.token);
      setSetupStatus({
        hasAdmin: true,
        needsSetup: false,
        isTokenConfigured: true,
        loading: false,
      });
    } catch (err: any) {
      setSetupSubmitting(false);
      setSetupError(err.message || 'Erro de conexão ao servidor.');
    }
  };

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setLoginLoading(true);
    const res = await login(adminEmail, adminPassword);
    setLoginLoading(false);
    if (!res.success) {
      setLoginError(res.error || 'Credenciais de administrador inválidas.');
    } else if (res.user?.role !== 'admin') {
      setLoginError('Esta conta não tem permissões de administrador.');
      logout();
    }
  };

  // Receipt verification actions
  const handleVerifyReceipt = async (action: 'approve' | 'reject') => {
    if (!selectedOrder) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/orders/${selectedOrder.id}/verify-receipt`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          action,
          rejectionReason: action === 'reject' ? rejectReason : undefined,
        }),
      });
      const data = await res.json();
      setActionLoading(false);
      if (res.ok) {
        setSelectedOrder(data.order);
        setShowRejectInput(false);
        loadAdminData();
      } else {
        alert(data.error || 'Erro ao processar comprovativo');
      }
    } catch (err) {
      setActionLoading(false);
      alert('Erro de conexão');
    }
  };

  // Update Status & Carrier Tracking Code
  const handleUpdateStatus = async (status: OrderStatus) => {
    if (!selectedOrder) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/orders/${selectedOrder.id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          status,
          carrierTrackingCode: newTrackingCode || selectedOrder.carrierTrackingCode,
        }),
      });
      const data = await res.json();
      setActionLoading(false);
      if (res.ok) {
        setSelectedOrder(data.order);
        loadAdminData();
      } else {
        alert(data.error || 'Erro ao actualizar estado');
      }
    } catch (err) {
      setActionLoading(false);
      alert('Erro de conexão');
    }
  };

  // Product Save
  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prodName || !prodPrice) return;
    try {
      const method = editingProduct ? 'PUT' : 'POST';
      const url = editingProduct ? `/api/products/${editingProduct.id}` : '/api/products';
      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: prodName,
          category: prodCategory,
          price: Number(prodPrice),
          stock: Number(prodStock),
          description: prodDesc,
          images: prodImage ? [prodImage] : ['/assets/aistudio/Universo_Cor-de-Rosa_de_Beleza_e_Moda_4b1c881c.png'],
          isFeatured: prodFeatured,
        }),
      });
      if (res.ok) {
        setIsProductModalOpen(false);
        setEditingProduct(null);
        loadAdminData();
      } else {
        const data = await res.json();
        alert(data.error || 'Erro ao guardar produto');
      }
    } catch (err) {
      alert('Erro de conexão');
    }
  };

  const handleDeleteProduct = async (id: string) => {
    if (!confirm('Tem a certeza que deseja eliminar este produto?')) return;
    try {
      const res = await fetch(`/api/products/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        loadAdminData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Save Settings
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/settings/payment', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(settingsForm),
      });
      if (res.ok) {
        setSettingsSuccess(true);
        setTimeout(() => setSettingsSuccess(false), 3000);
      }
    } catch (err) {
      alert('Erro ao guardar configurações');
    }
  };

  // SCENARIO 0: FIRST-ADMIN SETUP MODE
  // If no administrator exists in the database, show the secure First Admin Registration screen
  if (!isAdmin && setupStatus.needsSetup) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-zinc-900 border border-amber-900/60 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-pink-500/10 rounded-full blur-3xl -ml-10 -mb-10 pointer-events-none" />

          <button
            onClick={onBackToStore}
            className="text-xs text-zinc-400 hover:text-white flex items-center gap-1.5 mb-6 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Voltar à Loja</span>
          </button>

          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-950/80 border border-amber-700/60 flex items-center justify-center text-amber-400 shadow-md">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold tracking-widest text-amber-400 block">
                Configuração Inicial Segura
              </span>
              <h1 className="text-xl font-serif font-bold text-white">Registo do 1º Administrador</h1>
            </div>
          </div>

          <div className="p-3.5 mb-5 rounded-2xl bg-amber-950/30 border border-amber-800/50 text-xs text-amber-200/90 leading-relaxed space-y-1">
            <p className="font-semibold text-amber-300 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5" />
              Nenhum administrador registado na base de dados
            </p>
            <p className="text-[11px] text-zinc-300">
              Para garantir segurança total e impedir auto-promoção de clientes, o registo exige o token único definido no servidor (<code className="text-amber-300 font-mono">ADMIN_SETUP_TOKEN</code>).
            </p>
          </div>

          {setupError && (
            <div className="p-3 mb-4 rounded-xl bg-rose-950/70 border border-rose-800 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{setupError}</span>
            </div>
          )}

          <form onSubmit={handleFirstAdminSubmit} className="space-y-3.5">
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1">Nome Completo</label>
              <input
                type="text"
                required
                value={setupName}
                onChange={(e) => setSetupName(e.target.value)}
                placeholder="ex: Antonieth António"
                className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-zinc-800/80 border border-zinc-700 text-white focus:outline-hidden focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">E-mail</label>
                <input
                  type="email"
                  required
                  value={setupEmail}
                  onChange={(e) => setSetupEmail(e.target.value)}
                  placeholder="antoniethantonio@gmail.com"
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-zinc-800/80 border border-zinc-700 text-white focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">Telefone / WhatsApp</label>
                <input
                  type="text"
                  required
                  value={setupPhone}
                  onChange={(e) => setSetupPhone(e.target.value)}
                  placeholder="+244 923 000 000"
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-zinc-800/80 border border-zinc-700 text-white focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">Palavra-passe (mín. 8)</label>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={setupPassword}
                  onChange={(e) => setSetupPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-zinc-800/80 border border-zinc-700 text-white focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">Confirmar Senha</label>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={setupConfirmPassword}
                  onChange={(e) => setSetupConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-zinc-800/80 border border-zinc-700 text-white focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>

            <div className="pt-1">
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-amber-300 flex items-center gap-1">
                  <Terminal className="w-3.5 h-3.5" />
                  Token do Servidor (ADMIN_SETUP_TOKEN)
                </label>
                <span className="text-[10px] text-zinc-400">definido no .env</span>
              </div>
              <input
                type="password"
                required
                value={setupToken}
                onChange={(e) => setSetupToken(e.target.value)}
                placeholder="Insira o token do ficheiro .env do servidor"
                className="w-full px-3.5 py-2.5 text-xs font-mono rounded-xl bg-zinc-950 border border-amber-700/60 text-amber-200 placeholder:text-zinc-600 focus:outline-hidden focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <button
              type="submit"
              disabled={setupSubmitting}
              className="w-full mt-3 py-3 rounded-xl bg-gradient-to-r from-amber-500 via-rose-500 to-pink-600 hover:from-amber-600 hover:to-pink-700 text-white font-bold text-xs tracking-wider uppercase transition-all shadow-lg shadow-amber-500/20 active:scale-95 cursor-pointer disabled:opacity-50"
            >
              {setupSubmitting ? 'A registar e proteger o sistema...' : 'Criar Conta de Administradora & Entrar'}
            </button>
          </form>

          <p className="mt-4 text-[10px] text-center text-zinc-500">
            🔒 Uma vez registada, esta página é bloqueada permanentemente.
          </p>
        </div>
      </div>
    );
  }

  // SCENARIO B: If user is logged in as normal client, show Access Denied (403)
  if (user && !isAdmin) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-zinc-900 border border-rose-900/60 rounded-3xl p-6 sm:p-8 shadow-2xl text-center space-y-5 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-36 h-36 bg-rose-500/10 rounded-full blur-2xl pointer-events-none" />
          <div className="w-16 h-16 rounded-2xl bg-rose-950/80 border border-rose-800 text-rose-400 mx-auto flex items-center justify-center shadow-lg">
            <AlertCircle className="w-8 h-8" />
          </div>

          <div>
            <span className="text-[10px] uppercase font-bold tracking-widest text-rose-400 block mb-1">
              Acesso Negado • Erro 403
            </span>
            <h1 className="text-xl font-serif font-bold text-white">Área Restrita a Administradores</h1>
          </div>

          <p className="text-xs text-zinc-300 leading-relaxed">
            O painel de gestão em <code className="text-pink-300 font-mono">/admin</code> é exclusivo para a administração autorizada de O Mundo das Mocinhas.
          </p>

          <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 text-left text-xs space-y-1">
            <div className="flex justify-between text-zinc-400">
              <span>Utilizador Autenticado:</span>
              <span className="font-semibold text-white truncate max-w-[170px]">{user.name}</span>
            </div>
            <div className="flex justify-between text-zinc-400">
              <span>E-mail:</span>
              <span className="font-mono text-zinc-300 truncate max-w-[170px]">{user.email}</span>
            </div>
            <div className="flex justify-between text-zinc-400">
              <span>Função:</span>
              <span className="text-amber-400 font-bold uppercase text-[10px] px-1.5 py-0.5 bg-amber-950/60 rounded border border-amber-800">
                Cliente Normal
              </span>
            </div>
          </div>

          <p className="text-[11px] text-zinc-400">
            A sua conta actual não tem autorização administrativa.
          </p>

          <div className="pt-2 flex flex-col gap-2">
            <button
              onClick={onBackToStore}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-600 hover:to-rose-700 text-white font-bold text-xs tracking-wider uppercase transition-all shadow-md active:scale-95 cursor-pointer"
            >
              Voltar à Loja Pública
            </button>
            <button
              onClick={logout}
              className="w-full py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-semibold text-xs transition-colors cursor-pointer"
            >
              Terminar Sessão para Mudar de Conta
            </button>
          </div>
        </div>
      </div>
    );
  }

  // SCENARIO A: If user is not logged in as admin, show dedicated Admin Login Screen
  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-zinc-900 border border-zinc-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
          {/* Subtle gold glow */}
          <div className="absolute top-0 right-0 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-pink-500/10 rounded-full blur-3xl -ml-10 -mb-10 pointer-events-none" />

          <button
            onClick={onBackToStore}
            className="text-xs text-zinc-400 hover:text-white flex items-center gap-1.5 mb-6 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Voltar à Loja</span>
          </button>

          <div className="flex items-center gap-3 mb-6">
            <img
              src="/assets/aistudio/Captura_de_ecr__2026-10-23_003850_d2da05b5.png"
              alt="Logótipo"
              className="w-12 h-12 rounded-full border-2 border-amber-400"
            />
            <div>
              <span className="text-[10px] uppercase font-bold tracking-widest text-amber-400 block">
                Painel Administrativo
              </span>
              <h1 className="text-xl font-serif font-bold text-white">O Mundo das Mocinhas</h1>
            </div>
          </div>

          <p className="text-xs text-zinc-400 mb-6 leading-relaxed">
            Área restrita de gestão de vendas, verificação de comprovativos bancários, stock e transportadoras em Angola.
          </p>

          {loginError && (
            <div className="p-3 mb-4 rounded-xl bg-rose-950/70 border border-rose-800 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{loginError}</span>
            </div>
          )}

          <form onSubmit={handleAdminLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1">
                E-mail de Administrador
              </label>
              <input
                type="email"
                required
                placeholder="ex: admin@empresa.ao"
                value={adminEmail}
                onChange={(e) => setAdminEmail(e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-zinc-800/80 border border-zinc-700 text-white focus:outline-hidden focus:ring-2 focus:ring-pink-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1">Palavra-passe</label>
              <input
                type="password"
                required
                placeholder="••••••••"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-zinc-800/80 border border-zinc-700 text-white focus:outline-hidden focus:ring-2 focus:ring-pink-500"
              />
            </div>

            <button
              type="submit"
              disabled={loginLoading}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-600 hover:to-rose-700 text-white font-bold text-xs tracking-wider uppercase transition-all shadow-lg shadow-pink-500/20 active:scale-95 cursor-pointer disabled:opacity-50"
            >
              {loginLoading ? 'A autenticar...' : 'Entrar no Painel'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Filtered orders
  const filteredOrders = orders.filter((o) => {
    if (statusFilter === 'todos') return true;
    if (statusFilter === 'comprovativo') return o.status === 'comprovativo_enviado' || o.paymentStatus === 'em_verificacao';
    if (statusFilter === 'confirmado') return o.paymentStatus === 'confirmado';
    if (statusFilter === 'pendente') return o.paymentStatus === 'pendente';
    return o.status === statusFilter;
  });

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col md:flex-row">
      {/* Sidebar */}
      <aside className="w-full md:w-64 bg-zinc-900 border-r border-zinc-800 p-4 sm:p-5 flex flex-col justify-between shrink-0">
        <div>
          {/* Header */}
          <div className="flex items-center gap-3 pb-6 border-b border-zinc-800">
            <img
              src="/assets/aistudio/Captura_de_ecr__2026-10-23_003850_d2da05b5.png"
              alt="Logo"
              className="w-10 h-10 rounded-full border border-pink-500"
            />
            <div>
              <span className="text-[10px] uppercase font-bold text-amber-400 tracking-wider">
                Painel de Controlo
              </span>
              <h2 className="text-sm font-serif font-bold text-white">Mundo das Mocinhas</h2>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="mt-6 space-y-1">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'dashboard'
                  ? 'bg-gradient-to-r from-pink-600 to-rose-600 text-white shadow-md'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>Dashboard de Vendas</span>
            </button>

            <button
              onClick={() => setActiveTab('orders')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'orders'
                  ? 'bg-gradient-to-r from-pink-600 to-rose-600 text-white shadow-md'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
              }`}
            >
              <div className="flex items-center gap-3">
                <Package className="w-4 h-4" />
                <span>Encomendas & Comprovativos</span>
              </div>
              {stats?.unverifiedReceipts > 0 && (
                <span className="bg-amber-500 text-black font-extrabold text-[10px] px-1.5 py-0.5 rounded-full">
                  {stats.unverifiedReceipts}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('products')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'products'
                  ? 'bg-gradient-to-r from-pink-600 to-rose-600 text-white shadow-md'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
              }`}
            >
              <ShoppingBag className="w-4 h-4" />
              <span>Gestão de Produtos</span>
            </button>

            <button
              onClick={() => setActiveTab('shipping')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'shipping'
                  ? 'bg-gradient-to-r from-pink-600 to-rose-600 text-white shadow-md'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
              }`}
            >
              <Truck className="w-4 h-4" />
              <span>Transportadoras & Províncias</span>
            </button>

            <button
              onClick={() => setActiveTab('settings')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'settings'
                  ? 'bg-gradient-to-r from-pink-600 to-rose-600 text-white shadow-md'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
              }`}
            >
              <CreditCard className="w-4 h-4" />
              <span>Contas & Pagamentos</span>
            </button>

            <button
              onClick={() => {
                setActiveTab('database');
                loadDbStatus();
              }}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'database'
                  ? 'bg-gradient-to-r from-pink-600 to-rose-600 text-white shadow-md'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
              }`}
            >
              <div className="flex items-center gap-3">
                <Database className="w-4 h-4 text-amber-400" />
                <span>Base de Dados & Supabase</span>
              </div>
              <span
                className={`w-2 h-2 rounded-full ${
                  dbInfo?.supabase?.health?.connected ? 'bg-emerald-400 shadow-xs shadow-emerald-400' : 'bg-amber-400 shadow-xs shadow-amber-400'
                }`}
                title={dbInfo?.supabase?.health?.connected ? 'Supabase Ligado' : 'Armazenamento Local Persistente Activo'}
              />
            </button>
          </nav>
        </div>

        {/* Footer controls */}
        <div className="pt-6 border-t border-zinc-800 space-y-2">
          <button
            onClick={onBackToStore}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-zinc-300 hover:bg-zinc-800 hover:text-pink-400 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Voltar à Loja Pública</span>
          </button>
          <button
            onClick={logout}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-rose-400 hover:bg-rose-950/40 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>Terminar Sessão</span>
          </button>
        </div>
      </aside>

      {/* Main Content View */}
      <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto max-h-screen">
        {/* Top Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 mb-6 border-b border-zinc-800 gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-serif font-bold text-white">
              {activeTab === 'dashboard' && 'Dashboard de Vendas'}
              {activeTab === 'orders' && 'Encomendas & Validação de Pagamentos'}
              {activeTab === 'products' && 'Catálogo e Stock de Produtos'}
              {activeTab === 'shipping' && 'Configuração de Transportadoras e Províncias'}
              {activeTab === 'settings' && 'Configuração de Contas Bancárias da Loja'}
            </h1>
            <p className="text-xs text-zinc-400 mt-0.5">
              Administrador: <span className="text-amber-400 font-semibold">{user?.name}</span>
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={loadAdminData}
              className="px-3.5 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-zinc-200 transition-colors"
            >
              Actualizar Dados
            </button>
          </div>
        </div>

        {/* TAB 1: DASHBOARD */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-2xl">
                <div className="flex items-center justify-between text-zinc-400 text-xs mb-2">
                  <span>Vendas Confirmadas</span>
                  <DollarSign className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="text-2xl font-bold font-serif text-white">
                  {formatKz(stats?.totalConfirmedSales || 0)}
                </div>
                <span className="text-[10px] text-emerald-400 font-semibold mt-1 inline-block">
                  ✓ Pagamentos validados no banco
                </span>
              </div>

              <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-2xl">
                <div className="flex items-center justify-between text-zinc-400 text-xs mb-2">
                  <span>Total de Encomendas</span>
                  <Package className="w-4 h-4 text-blue-400" />
                </div>
                <div className="text-2xl font-bold font-serif text-white">
                  {stats?.totalOrders || orders.length}
                </div>
                <span className="text-[10px] text-zinc-400 mt-1 inline-block">
                  {stats?.pendingOrders || 0} pendentes de envio
                </span>
              </div>

              <div className="bg-zinc-900 border border-amber-900/40 p-5 rounded-2xl relative overflow-hidden">
                <div className="flex items-center justify-between text-zinc-400 text-xs mb-2">
                  <span>Comprovativos por Verificar</span>
                  <FileText className="w-4 h-4 text-amber-400" />
                </div>
                <div className="text-2xl font-bold font-serif text-amber-400">
                  {stats?.unverifiedReceipts || 0}
                </div>
                <button
                  onClick={() => {
                    setActiveTab('orders');
                    setStatusFilter('comprovativo');
                  }}
                  className="text-[10px] text-amber-400 hover:underline font-semibold mt-1 inline-block"
                >
                  Conferir agora →
                </button>
              </div>

              <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-2xl">
                <div className="flex items-center justify-between text-zinc-400 text-xs mb-2">
                  <span>Stock Baixo (≤ 5 un.)</span>
                  <AlertCircle className="w-4 h-4 text-rose-400" />
                </div>
                <div className="text-2xl font-bold font-serif text-white">
                  {stats?.lowStockCount || 0}
                </div>
                <button
                  onClick={() => setActiveTab('products')}
                  className="text-[10px] text-pink-400 hover:underline font-semibold mt-1 inline-block"
                >
                  Gerir inventário →
                </button>
              </div>
            </div>

            {/* Provinces & Carriers breakdown */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Vendas por Província */}
              <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-2xl">
                <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-pink-500" />
                  <span>Distribuição de Encomendas por Província (Angola)</span>
                </h3>
                {stats?.provinceSales && Object.keys(stats.provinceSales).length > 0 ? (
                  <div className="space-y-3">
                    {Object.entries(stats.provinceSales).map(([prov, data]: [string, any]) => (
                      <div key={prov} className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="font-semibold text-zinc-200">{prov}</span>
                          <span className="text-zinc-400">
                            {data.count} {data.count === 1 ? 'encomenda' : 'encomendas'} • {formatKz(data.total)}
                          </span>
                        </div>
                        <div className="w-full bg-zinc-800 rounded-full h-2 overflow-hidden">
                          <div
                            className="bg-gradient-to-r from-pink-500 to-rose-500 h-2 rounded-full"
                            style={{
                              width: `${Math.min(100, Math.max(15, (data.count / (stats.totalOrders || 1)) * 100))}%`,
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-zinc-500 py-6 text-center">
                    Ainda não existem encomendas registadas por província.
                  </p>
                )}
              </div>

              {/* Transportadoras Parceiras */}
              <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-2xl">
                <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                  <Truck className="w-4 h-4 text-pink-500" />
                  <span>Envios por Transportadora</span>
                </h3>
                {stats?.carrierCounts && Object.keys(stats.carrierCounts).length > 0 ? (
                  <div className="space-y-3">
                    {Object.entries(stats.carrierCounts).map(([carrier, count]: [string, any]) => (
                      <div
                        key={carrier}
                        className="p-3 bg-zinc-800/60 rounded-xl flex items-center justify-between text-xs"
                      >
                        <span className="font-semibold text-zinc-200">{carrier}</span>
                        <span className="bg-zinc-700 text-zinc-200 px-2.5 py-0.5 rounded-full font-bold">
                          {count} envios
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-zinc-500 py-6 text-center">
                    Nenhum envio associado a transportadoras no momento.
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: ORDERS & RECEIPT VERIFICATION */}
        {activeTab === 'orders' && (
          <div className="space-y-4">
            {/* Filter buttons */}
            <div className="flex flex-wrap items-center gap-2 pb-2">
              <button
                onClick={() => setStatusFilter('todos')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold ${
                  statusFilter === 'todos' ? 'bg-pink-500 text-white' : 'bg-zinc-800 text-zinc-400'
                }`}
              >
                Todas ({orders.length})
              </button>
              <button
                onClick={() => setStatusFilter('comprovativo')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold ${
                  statusFilter === 'comprovativo'
                    ? 'bg-amber-500 text-black'
                    : 'bg-zinc-800 text-amber-400'
                }`}
              >
                Comprovativos a Verificar ({orders.filter((o) => o.status === 'comprovativo_enviado' || o.paymentStatus === 'em_verificacao').length})
              </button>
              <button
                onClick={() => setStatusFilter('confirmado')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold ${
                  statusFilter === 'confirmado' ? 'bg-emerald-600 text-white' : 'bg-zinc-800 text-zinc-400'
                }`}
              >
                Pagas Confirmadas
              </button>
              <button
                onClick={() => setStatusFilter('pendente')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold ${
                  statusFilter === 'pendente' ? 'bg-pink-500 text-white' : 'bg-zinc-800 text-zinc-400'
                }`}
              >
                Aguardando Pagamento
              </button>
            </div>

            {/* Orders Table */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-zinc-800/80 text-zinc-400 uppercase font-semibold">
                    <tr>
                      <th className="p-3.5">Encomenda</th>
                      <th className="p-3.5">Cliente</th>
                      <th className="p-3.5">Destino & Transportadora</th>
                      <th className="p-3.5">Total</th>
                      <th className="p-3.5">Comprovativo</th>
                      <th className="p-3.5">Estado</th>
                      <th className="p-3.5 text-right">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800 text-zinc-300">
                    {filteredOrders.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="text-center py-8 text-zinc-500">
                          Nenhuma encomenda encontrada com o filtro seleccionado.
                        </td>
                      </tr>
                    ) : (
                      filteredOrders.map((order) => {
                        const statusMeta = ORDER_STATUS_MAP[order.status] || ORDER_STATUS_MAP.aguardando_pagamento;
                        const hasReceipt = !!order.receiptData;

                        return (
                          <tr key={order.id} className="hover:bg-zinc-800/40 transition-colors">
                            <td className="p-3.5 font-mono font-bold text-white">
                              {order.orderNumber}
                              <div className="text-[10px] text-zinc-500 font-sans">
                                {new Date(order.createdAt).toLocaleDateString('pt-AO')}
                              </div>
                            </td>
                            <td className="p-3.5">
                              <div className="font-semibold text-white">{order.customerName}</div>
                              <div className="text-[11px] text-zinc-400">{order.customerPhone}</div>
                            </td>
                            <td className="p-3.5">
                              <div>{order.destinationProvince}</div>
                              <div className="text-[11px] text-zinc-400 font-medium">
                                {order.carrierName}
                              </div>
                            </td>
                            <td className="p-3.5 font-bold font-serif text-white">
                              {formatKz(order.total)}
                            </td>
                            <td className="p-3.5">
                              {hasReceipt ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-950 text-amber-300 border border-amber-800 text-[10px] font-bold">
                                  <FileText className="w-3 h-3" />
                                  Comprovativo Anexo
                                </span>
                              ) : (
                                <span className="text-[10px] text-zinc-500 italic">Sem ficheiro</span>
                              )}
                            </td>
                            <td className="p-3.5">
                              <span
                                className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${statusMeta.badgeBg} ${statusMeta.badgeText}`}
                              >
                                {statusMeta.label}
                              </span>
                            </td>
                            <td className="p-3.5 text-right">
                              <button
                                onClick={() => {
                                  setSelectedOrder(order);
                                  setNewTrackingCode(order.carrierTrackingCode || '');
                                  setShowRejectInput(false);
                                }}
                                className="px-3 py-1.5 rounded-xl bg-pink-600 hover:bg-pink-700 text-white font-bold text-xs inline-flex items-center gap-1.5"
                              >
                                <Eye className="w-3.5 h-3.5" />
                                <span>Ver / Validar</span>
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: PRODUCTS MANAGEMENT */}
        {activeTab === 'products' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <div className="text-xs text-zinc-400">
                Total de produtos em catálogo:{' '}
                <span className="font-bold text-white">{products.length}</span>
              </div>
              <button
                onClick={() => {
                  setEditingProduct(null);
                  setProdName('');
                  setProdPrice(2500);
                  setProdStock(20);
                  setProdCategory('Maquilhagem');
                  setProdDesc('');
                  setProdImage('');
                  setProdFeatured(false);
                  setIsProductModalOpen(true);
                }}
                className="px-4 py-2 rounded-xl bg-pink-500 hover:bg-pink-600 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-pink-500/20"
              >
                <Plus className="w-4 h-4" />
                <span>Adicionar Novo Produto</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {products.map((prod) => (
                <div
                  key={prod.id}
                  className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 flex flex-col justify-between"
                >
                  <div className="flex gap-3">
                    <img
                      src={prod.images[0] || '/assets/aistudio/Universo_Cor-de-Rosa_de_Beleza_e_Moda_4b1c881c.png'}
                      alt={prod.name}
                      className="w-16 h-16 rounded-xl object-cover bg-zinc-800 shrink-0 border border-zinc-700"
                    />
                    <div className="min-w-0">
                      <span className="text-[10px] text-pink-400 font-semibold uppercase">
                        {prod.category}
                      </span>
                      <h4 className="font-bold text-xs text-white truncate" title={prod.name}>
                        {prod.name}
                      </h4>
                      <div className="text-sm font-bold font-serif text-amber-300 mt-1">
                        {formatKz(prod.price)}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-zinc-800 flex items-center justify-between text-xs">
                    <div>
                      <span className="text-zinc-500 text-[11px]">Stock: </span>
                      <span
                        className={`font-bold ${
                          prod.stock <= 5 ? 'text-rose-400' : 'text-emerald-400'
                        }`}
                      >
                        {prod.stock} un.
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => {
                          setEditingProduct(prod);
                          setProdName(prod.name);
                          setProdPrice(prod.price);
                          setProdStock(prod.stock);
                          setProdCategory(prod.category);
                          setProdDesc(prod.description);
                          setProdImage(prod.images[0] || '');
                          setProdFeatured(prod.isFeatured);
                          setIsProductModalOpen(true);
                        }}
                        className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300"
                        title="Editar"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteProduct(prod.id)}
                        className="p-1.5 rounded-lg bg-zinc-800 hover:bg-rose-950 text-rose-400"
                        title="Eliminar"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 4: SHIPPING & PROVINCES CONFIGURATION */}
        {activeTab === 'shipping' && (
          <div className="space-y-6">
            {/* Carriers */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
              <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                <Truck className="w-4 h-4 text-pink-500" />
                <span>Transportadoras Reconhecidas em Angola</span>
              </h3>
              <div className="divide-y divide-zinc-800">
                {carriers.map((carrier) => (
                  <div key={carrier.id} className="py-3 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-bold text-white text-sm">{carrier.name}</span>
                      <p className="text-zinc-400 text-[11px]">{carrier.note}</p>
                    </div>
                    <span className="bg-emerald-950 text-emerald-300 border border-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                      Ativa no Checkout
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Provinces Rates */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
              <h3 className="text-sm font-bold text-white mb-1 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-pink-500" />
                <span>Taxas de Envio Base por Província (18 Províncias)</span>
              </h3>
              <p className="text-xs text-zinc-400 mb-4">
                Valores calculados automaticamente no checkout para entregas interprovinciais.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {destinations.map((dest) => (
                  <div key={dest.province} className="p-3 bg-zinc-800/60 rounded-xl border border-zinc-700/60 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-bold text-white block">{dest.province}</span>
                      <span className="text-[10px] text-zinc-400">{dest.estimatedDays}</span>
                    </div>
                    <span className="font-serif font-bold text-pink-400 text-sm">
                      {formatKz(dest.baselineFee)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: STORE PAYMENT SETTINGS */}
        {activeTab === 'settings' && (
          <div className="max-w-2xl bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-4">
            <h3 className="text-sm font-bold text-white mb-1 flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-pink-500" />
              <span>Configuração dos Dados Bancários Oficiais</span>
            </h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Estes dados serão apresentados aos clientes após a finalização da compra para efectuarem a transferência e carregarem o comprovativo.
            </p>

            {settingsSuccess && (
              <div className="p-3 rounded-xl bg-emerald-950 border border-emerald-800 text-emerald-300 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Dados de pagamento actualizados com sucesso!</span>
              </div>
            )}

            <form onSubmit={handleSaveSettings} className="space-y-4 text-xs">
              <div>
                <label className="block text-zinc-300 font-semibold mb-1">Nome do Banco</label>
                <input
                  type="text"
                  required
                  value={settingsForm.bankName}
                  onChange={(e) => setSettingsForm({ ...settingsForm, bankName: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-800 border border-zinc-700 text-white"
                />
              </div>

              <div>
                <label className="block text-zinc-300 font-semibold mb-1">Titular da Conta</label>
                <input
                  type="text"
                  required
                  value={settingsForm.accountHolder}
                  onChange={(e) => setSettingsForm({ ...settingsForm, accountHolder: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-800 border border-zinc-700 text-white"
                />
              </div>

              <div>
                <label className="block text-zinc-300 font-semibold mb-1">IBAN Oficial (Angola)</label>
                <input
                  type="text"
                  required
                  value={settingsForm.iban}
                  onChange={(e) => setSettingsForm({ ...settingsForm, iban: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-800 border border-zinc-700 text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-zinc-300 font-semibold mb-1">
                  Telemóvel Multicaixa Express
                </label>
                <input
                  type="text"
                  required
                  value={settingsForm.multicaixaExpressPhone}
                  onChange={(e) => setSettingsForm({ ...settingsForm, multicaixaExpressPhone: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-800 border border-zinc-700 text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-zinc-300 font-semibold mb-1">Instruções de Pagamento</label>
                <textarea
                  rows={3}
                  value={settingsForm.paymentInstructions}
                  onChange={(e) => setSettingsForm({ ...settingsForm, paymentInstructions: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-800 border border-zinc-700 text-white"
                />
              </div>

              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl bg-pink-500 hover:bg-pink-600 text-white font-bold text-xs transition-colors"
              >
                Guardar Configurações
              </button>
            </form>
          </div>
        )}

        {/* TAB 6: DATABASE & SUPABASE INFRASTRUCTURE */}
        {activeTab === 'database' && (
          <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-zinc-900 border border-zinc-800 p-5 rounded-2xl">
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-amber-400 block">
                  Infra-estrutura de Persistência Real
                </span>
                <h2 className="text-lg font-serif font-bold text-white flex items-center gap-2">
                  <Database className="w-5 h-5 text-pink-400" />
                  Base de Dados & Supabase
                </h2>
                <p className="text-xs text-zinc-400 mt-1">
                  Arquitectura híbrida com persistência local garantida no disco e integração completa pronta para Supabase PostgreSQL, Auth & Storage.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={loadDbStatus}
                  disabled={dbLoading}
                  className="px-3.5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${dbLoading ? 'animate-spin' : ''}`} />
                  <span>Actualizar Estado</span>
                </button>
              </div>
            </div>

            {/* Status Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {/* Card 1: Local Persistent Storage */}
              <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-2xl space-y-4">
                <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-pink-950/60 border border-pink-700 flex items-center justify-center text-pink-400">
                      <HardDrive className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white">Armazenamento Local Persistente</h3>
                      <p className="text-[11px] text-zinc-400">Ficheiro estruturado no disco do servidor</p>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-800 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    Activo & Gravado
                  </span>
                </div>

                <div className="space-y-2.5 text-xs text-zinc-300">
                  <div className="flex justify-between py-1 border-b border-zinc-800/60">
                    <span className="text-zinc-500">Localização do Ficheiro:</span>
                    <span className="font-mono text-[11px] text-zinc-200 truncate max-w-[200px]" title={dbInfo?.localDatabase?.filePath}>
                      {dbInfo?.localDatabase?.filePath || 'data/db.json'}
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-zinc-800/60">
                    <span className="text-zinc-500">Persistência em Disco:</span>
                    <span className="text-emerald-400 font-bold">Verificada (Sobrevive a reinícios)</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-zinc-800/60">
                    <span className="text-zinc-500">Tamanho no Disco:</span>
                    <span className="font-mono text-zinc-200">
                      {dbInfo?.localDatabase?.fileSizeBytes ? `${Math.round(dbInfo.localDatabase.fileSizeBytes / 1024)} KB` : 'Detectando...'}
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-zinc-800/60">
                    <span className="text-zinc-500">Produtos Registados:</span>
                    <span className="font-bold text-white">{dbInfo?.localDatabase?.stats?.productsCount || products.length}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-zinc-800/60">
                    <span className="text-zinc-500">Encomendas no Histórico:</span>
                    <span className="font-bold text-white">{dbInfo?.localDatabase?.stats?.ordersCount || orders.length}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-zinc-800/60">
                    <span className="text-zinc-500">Províncias com Tarifas:</span>
                    <span className="font-bold text-white">18 Províncias de Angola</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-zinc-500">Contas de Utilizadores:</span>
                    <span className="font-bold text-white">{dbInfo?.localDatabase?.stats?.usersCount || 2}</span>
                  </div>
                </div>

                <div className="p-3 bg-zinc-950/60 rounded-xl border border-zinc-800 text-[11px] text-zinc-400 leading-relaxed">
                  ✓ <strong className="text-zinc-200">Zero perda de dados:</strong> Todos os pedidos, produtos criados e comprovativos anexados são imediatamente persistidos em disco.
                </div>
              </div>

              {/* Card 2: Supabase PostgreSQL Connection */}
              <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-2xl space-y-4">
                <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-emerald-950/60 border border-emerald-700 flex items-center justify-center text-emerald-400">
                      <Server className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white">Supabase PostgreSQL & Storage</h3>
                      <p className="text-[11px] text-zinc-400">Base de dados relacional na Cloud</p>
                    </div>
                  </div>
                  {dbInfo?.supabase?.health?.connected ? (
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-800 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      Conectado
                    </span>
                  ) : (
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-950 text-amber-300 border border-amber-800 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {dbInfo?.supabase?.isConfigured ? 'Aguardando Tabelas' : 'Aguardando Chaves'}
                    </span>
                  )}
                </div>

                <div className="space-y-2.5 text-xs text-zinc-300">
                  <div className="flex justify-between py-1 border-b border-zinc-800/60">
                    <span className="text-zinc-500">Project URL (SUPABASE_URL):</span>
                    <span className="font-mono text-[11px] text-zinc-200 truncate max-w-[200px]">
                      {dbInfo?.supabase?.supabaseUrl || 'Não configurado'}
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-zinc-800/60">
                    <span className="text-zinc-500">Service Role Key (Backend):</span>
                    <span className={dbInfo?.supabase?.hasServiceRoleKey ? 'text-emerald-400 font-bold' : 'text-zinc-500'}>
                      {dbInfo?.supabase?.hasServiceRoleKey ? '✓ Presente (Segura no Servidor)' : '✗ Pendente em .env'}
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-zinc-800/60">
                    <span className="text-zinc-500">Anon Public Key:</span>
                    <span className={dbInfo?.supabase?.hasAnonKey ? 'text-emerald-400 font-bold' : 'text-zinc-500'}>
                      {dbInfo?.supabase?.hasAnonKey ? '✓ Presente' : '✗ Pendente em .env'}
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-zinc-800/60">
                    <span className="text-zinc-500">Bucket Storage (payment_receipts):</span>
                    <span className={dbInfo?.supabase?.health?.storageConfigured ? 'text-emerald-400 font-bold' : 'text-zinc-500'}>
                      {dbInfo?.supabase?.health?.storageConfigured ? '✓ Configurado e Privado' : 'Aguardando criação'}
                    </span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-zinc-500">Políticas RLS (Segurança):</span>
                    <span className="text-pink-400 font-bold">8 Tabelas protegidas</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="pt-2 flex flex-col sm:flex-row gap-2">
                  <button
                    onClick={handleTestSupabase}
                    disabled={dbTesting}
                    className="flex-1 py-2 px-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${dbTesting ? 'animate-spin' : ''}`} />
                    <span>{dbTesting ? 'A testar ligação...' : 'Testar Ligação ao Supabase'}</span>
                  </button>

                  <button
                    onClick={handleSyncSupabase}
                    disabled={dbSyncing || !dbInfo?.supabase?.isConfigured}
                    className="flex-1 py-2 px-3 rounded-xl bg-pink-600 hover:bg-pink-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors disabled:opacity-40 cursor-pointer"
                  >
                    <span>{dbSyncing ? 'A sincronizar catálogo...' : 'Sincronizar Catálogo'}</span>
                  </button>
                </div>

                {/* Test Feedback banner */}
                {dbTestResult && (
                  <div
                    className={`p-3 rounded-xl border text-xs ${
                      dbTestResult.success
                        ? 'bg-emerald-950/60 border-emerald-800 text-emerald-300'
                        : 'bg-amber-950/60 border-amber-800 text-amber-300'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-bold mb-1">
                      {dbTestResult.success ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                      <span>{dbTestResult.message}</span>
                    </div>
                    {dbTestResult.health?.tablesDetected && (
                      <div className="mt-2 text-[11px] grid grid-cols-2 gap-1 text-zinc-300">
                        <span>Produtos: {dbTestResult.health.tablesDetected.products ? '✓ Ok' : '✗ Ausente'}</span>
                        <span>Encomendas: {dbTestResult.health.tablesDetected.orders ? '✓ Ok' : '✗ Ausente'}</span>
                        <span>Categorias: {dbTestResult.health.tablesDetected.categories ? '✓ Ok' : '✗ Ausente'}</span>
                        <span>Perfis: {dbTestResult.health.tablesDetected.profiles ? '✓ Ok' : '✗ Ausente'}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Sync Feedback banner */}
                {dbSyncResult && (
                  <div
                    className={`p-3 rounded-xl border text-xs ${
                      dbSyncResult.success
                        ? 'bg-emerald-950/60 border-emerald-800 text-emerald-300'
                        : 'bg-rose-950/60 border-rose-800 text-rose-300'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-bold">
                      {dbSyncResult.success ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                      <span>{dbSyncResult.message}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Step-by-Step Supabase Setup Guide */}
            <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                <div>
                  <h3 className="text-sm font-serif font-bold text-white flex items-center gap-2">
                    <Terminal className="w-4 h-4 text-amber-400" />
                    Instruções para Configuração do Supabase (Passo a Passo)
                  </h3>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    Siga estes 4 passos simples para activar a base de dados PostgreSQL e o Storage na cloud:
                  </p>
                </div>
                <button
                  onClick={handleCopySql}
                  className="px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  {copiedSql ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedSql ? 'Copiado!' : 'Copiar schema.sql'}</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                {/* Passo 1 */}
                <div className="p-4 bg-zinc-950 rounded-xl border border-zinc-800/80 space-y-2">
                  <div className="flex items-center gap-2 font-bold text-white">
                    <span className="w-5 h-5 rounded-full bg-pink-500/20 text-pink-400 flex items-center justify-center text-[11px]">
                      1
                    </span>
                    <span>Criar o Projecto no Supabase</span>
                  </div>
                  <p className="text-zinc-400 leading-relaxed text-[11px]">
                    Acesse <a href="https://supabase.com" target="_blank" rel="noreferrer" className="text-pink-400 underline inline-flex items-center gap-1">supabase.com <ExternalLink className="w-3 h-3" /></a>, inicie sessão e crie um novo projecto com o nome <strong className="text-zinc-200">o-mundo-das-mocinhas</strong>.
                  </p>
                </div>

                {/* Passo 2 */}
                <div className="p-4 bg-zinc-950 rounded-xl border border-zinc-800/80 space-y-2">
                  <div className="flex items-center gap-2 font-bold text-white">
                    <span className="w-5 h-5 rounded-full bg-pink-500/20 text-pink-400 flex items-center justify-center text-[11px]">
                      2
                    </span>
                    <span>Executar a Migração SQL</span>
                  </div>
                  <p className="text-zinc-400 leading-relaxed text-[11px]">
                    No painel do Supabase, clique em <strong className="text-zinc-200">SQL Editor</strong>, crie uma <strong className="text-zinc-200">New Query</strong>, cole o conteúdo do ficheiro <strong className="text-amber-400">/supabase/schema.sql</strong> e clique em <strong className="text-zinc-200">Run</strong>.
                  </p>
                </div>

                {/* Passo 3 */}
                <div className="p-4 bg-zinc-950 rounded-xl border border-zinc-800/80 space-y-2">
                  <div className="flex items-center gap-2 font-bold text-white">
                    <span className="w-5 h-5 rounded-full bg-pink-500/20 text-pink-400 flex items-center justify-center text-[11px]">
                      3
                    </span>
                    <span>Configurar as Variáveis de Ambiente</span>
                  </div>
                  <p className="text-zinc-400 leading-relaxed text-[11px]">
                    Em <strong className="text-zinc-200">Project Settings &gt; API</strong>, copie a URL do projecto e as chaves <code className="text-pink-300">anon</code> e <code className="text-amber-300">service_role</code> para o ficheiro <code className="text-zinc-200">.env</code> do servidor.
                  </p>
                </div>

                {/* Passo 4 */}
                <div className="p-4 bg-zinc-950 rounded-xl border border-zinc-800/80 space-y-2">
                  <div className="flex items-center gap-2 font-bold text-white">
                    <span className="w-5 h-5 rounded-full bg-pink-500/20 text-pink-400 flex items-center justify-center text-[11px]">
                      4
                    </span>
                    <span>Storage Privado de Comprovativos</span>
                  </div>
                  <p className="text-zinc-400 leading-relaxed text-[11px]">
                    O script SQL cria automaticamente o bucket privado <code className="text-amber-300">payment_receipts</code> com regras RLS que impedem que clientes vejam comprovativos de outros clientes.
                  </p>
                </div>
              </div>
            </div>

            {/* SQL Schema Preview */}
            <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-2xl space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Lock className="w-4 h-4 text-pink-400" />
                    Esquema de Dados SQL & Políticas RLS (/supabase/schema.sql)
                  </h3>
                  <p className="text-[11px] text-zinc-400">
                    Inclui 8 tabelas relacionais, integridade referencial, índices para províncias e transportadoras, e triggers de auditoria.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setSqlExpanded(!sqlExpanded)}
                    className="px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold cursor-pointer"
                  >
                    {sqlExpanded ? 'Ocultar Código' : 'Expandir Código SQL'}
                  </button>
                  <button
                    onClick={handleCopySql}
                    className="px-3 py-1.5 rounded-xl bg-pink-600 hover:bg-pink-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                  >
                    {copiedSql ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedSql ? 'Copiado!' : 'Copiar'}</span>
                  </button>
                </div>
              </div>

              {sqlExpanded && (
                <div className="mt-4 rounded-xl bg-zinc-950 p-4 border border-zinc-800 overflow-x-auto max-h-[500px] overflow-y-auto font-mono text-[11px] text-zinc-300 leading-relaxed">
                  <pre>{dbInfo?.schemaSql || '-- Carregando /supabase/schema.sql...'}</pre>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* RECEIPT VERIFICATION & ORDER MANAGEMENT MODAL */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="relative bg-zinc-900 border border-zinc-700 rounded-3xl max-w-2xl w-full p-6 shadow-2xl text-zinc-200 max-h-[90vh] overflow-y-auto space-y-5">
            <div className="flex justify-between items-start border-b border-zinc-800 pb-4">
              <div>
                <span className="text-[10px] text-amber-400 font-mono font-bold">
                  {selectedOrder.orderNumber}
                </span>
                <h3 className="text-lg font-serif font-bold text-white">
                  Auditoria da Encomenda & Comprovativo
                </h3>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                className="w-8 h-8 rounded-full bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            {/* Customer & Delivery Data */}
            <div className="grid grid-cols-2 gap-3 text-xs bg-zinc-800/40 p-4 rounded-xl border border-zinc-800">
              <div>
                <span className="text-zinc-500 block">Cliente:</span>
                <span className="font-bold text-white">{selectedOrder.customerName}</span>
                <p className="text-zinc-400">{selectedOrder.customerPhone}</p>
              </div>
              <div>
                <span className="text-zinc-500 block">Destino & Transportadora:</span>
                <span className="font-bold text-white">{selectedOrder.destinationProvince}</span>
                <p className="text-zinc-400">{selectedOrder.carrierName}</p>
              </div>
              <div className="col-span-2 pt-2 border-t border-zinc-800 flex justify-between">
                <span>Total a receber:</span>
                <span className="font-serif font-bold text-base text-pink-400">
                  {formatKz(selectedOrder.total)}
                </span>
              </div>
            </div>

            {/* Uploaded Receipt Preview */}
            <div className="bg-zinc-950 p-4 rounded-2xl border border-zinc-800 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-white flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-amber-400" />
                  Comprovativo Anexado pelo Cliente
                </span>
                {selectedOrder.receiptUploadedAt && (
                  <span className="text-[10px] text-zinc-500">
                    Enviado: {new Date(selectedOrder.receiptUploadedAt).toLocaleString('pt-AO')}
                  </span>
                )}
              </div>

              {selectedOrder.receiptData ? (
                selectedOrder.receiptMimeType?.includes('pdf') ? (
                  <div className="p-4 bg-zinc-900 rounded-xl border border-zinc-700 flex items-center gap-3 text-xs text-zinc-300">
                    <FileText className="w-8 h-8 text-rose-500" />
                    <div>
                      <p className="font-bold">{selectedOrder.receiptFilename}</p>
                      <a
                        href={selectedOrder.receiptData}
                        download={selectedOrder.receiptFilename || 'comprovativo.pdf'}
                        className="text-pink-400 hover:underline text-xs inline-flex items-center gap-1 mt-1"
                      >
                        Descarregar Documento PDF
                      </a>
                    </div>
                  </div>
                ) : (
                  <div className="text-center bg-black/60 p-2 rounded-xl border border-zinc-800">
                    <img
                      src={selectedOrder.receiptData}
                      alt="Comprovativo"
                      className="max-h-64 object-contain mx-auto rounded-lg shadow-md"
                    />
                  </div>
                )
              ) : (
                <div className="p-6 text-center text-xs text-zinc-500 italic">
                  O cliente ainda não anexou o comprovativo de pagamento no site.
                </div>
              )}

              {/* Receipt Verification Decision Buttons */}
              {selectedOrder.receiptData && selectedOrder.paymentStatus !== 'confirmado' && (
                <div className="pt-2 flex gap-3">
                  <button
                    onClick={() => handleVerifyReceipt('approve')}
                    disabled={actionLoading}
                    className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-md"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Aprovar Pagamento</span>
                  </button>
                  <button
                    onClick={() => setShowRejectInput(true)}
                    disabled={actionLoading}
                    className="px-4 py-2.5 rounded-xl bg-rose-700 hover:bg-rose-800 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all"
                  >
                    <AlertCircle className="w-4 h-4" />
                    <span>Rejeitar</span>
                  </button>
                </div>
              )}

              {showRejectInput && (
                <div className="p-3 bg-rose-950/40 border border-rose-900 rounded-xl space-y-2 text-xs">
                  <label className="font-semibold text-rose-300 block">
                    Motivo da Rejeição para o Cliente:
                  </label>
                  <input
                    type="text"
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    placeholder="Ex: Montante divergente, talão ilegível ou conta errada"
                    className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-rose-800 text-white"
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => setShowRejectInput(false)}
                      className="px-3 py-1 rounded-lg bg-zinc-800 text-zinc-400"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={() => handleVerifyReceipt('reject')}
                      className="px-3 py-1 rounded-lg bg-rose-600 text-white font-bold"
                    >
                      Confirmar Rejeição
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Carrier Dispatch & Tracking Code */}
            <div className="bg-zinc-800/40 p-4 rounded-xl border border-zinc-800 space-y-3 text-xs">
              <span className="font-bold text-white block">
                Expedição & Código de Rastreio da Transportadora
              </span>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Ex: Guia Real Express nº 481920"
                  value={newTrackingCode}
                  onChange={(e) => setNewTrackingCode(e.target.value)}
                  className="flex-1 px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-700 text-white"
                />
                <button
                  onClick={() => handleUpdateStatus(selectedOrder.status)}
                  className="px-3 py-2 rounded-xl bg-zinc-700 hover:bg-zinc-600 text-white font-bold"
                >
                  Salvar Guia
                </button>
              </div>

              {/* Status advancement buttons */}
              <div className="pt-2 flex flex-wrap gap-2">
                <button
                  onClick={() => handleUpdateStatus('em_preparacao')}
                  className="px-3 py-1.5 rounded-lg bg-cyan-950 text-cyan-300 border border-cyan-800 hover:bg-cyan-900 font-bold"
                >
                  Mover p/ Em Preparação
                </button>
                <button
                  onClick={() => handleUpdateStatus('enviada')}
                  className="px-3 py-1.5 rounded-lg bg-indigo-950 text-indigo-300 border border-indigo-800 hover:bg-indigo-900 font-bold"
                >
                  Entregue à Transportadora
                </button>
                <button
                  onClick={() => handleUpdateStatus('entregue')}
                  className="px-3 py-1.5 rounded-lg bg-emerald-950 text-emerald-300 border border-emerald-800 hover:bg-emerald-900 font-bold"
                >
                  Marcar como Entregue
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CREATE / EDIT PRODUCT MODAL */}
      {isProductModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="relative bg-zinc-900 border border-zinc-700 rounded-3xl max-w-md w-full p-6 shadow-2xl text-zinc-200">
            <h3 className="text-base font-serif font-bold text-white mb-4">
              {editingProduct ? 'Editar Produto' : 'Novo Produto para Catálogo'}
            </h3>

            <form onSubmit={handleSaveProduct} className="space-y-3 text-xs">
              <div>
                <label className="block text-zinc-300 font-semibold mb-1">Nome do Produto *</label>
                <input
                  type="text"
                  required
                  value={prodName}
                  onChange={(e) => setProdName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-800 border border-zinc-700 text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-zinc-300 font-semibold mb-1">Categoria *</label>
                  <select
                    value={prodCategory}
                    onChange={(e) => setProdCategory(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-zinc-800 border border-zinc-700 text-white"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.name}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-zinc-300 font-semibold mb-1">Preço em Kwanzas (Kz) *</label>
                  <input
                    type="number"
                    required
                    value={prodPrice}
                    onChange={(e) => setProdPrice(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-zinc-800 border border-zinc-700 text-white font-serif font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-zinc-300 font-semibold mb-1">Stock Disponível</label>
                  <input
                    type="number"
                    value={prodStock}
                    onChange={(e) => setProdStock(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-zinc-800 border border-zinc-700 text-white"
                  />
                </div>
                <div>
                  <label className="block text-zinc-300 font-semibold mb-1">Destaque na Home</label>
                  <label className="flex items-center gap-2 mt-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={prodFeatured}
                      onChange={(e) => setProdFeatured(e.target.checked)}
                      className="text-pink-500 rounded-sm"
                    />
                    <span className="text-zinc-300">Produto em Destaque</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-zinc-300 font-semibold mb-1">URL da Imagem</label>
                <input
                  type="text"
                  placeholder="/assets/aistudio/... ou link de imagem"
                  value={prodImage}
                  onChange={(e) => setProdImage(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-800 border border-zinc-700 text-white"
                />
              </div>

              <div>
                <label className="block text-zinc-300 font-semibold mb-1">Descrição</label>
                <textarea
                  rows={2}
                  value={prodDesc}
                  onChange={(e) => setProdDesc(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-800 border border-zinc-700 text-white"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsProductModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-zinc-800 text-zinc-400"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-pink-500 hover:bg-pink-600 text-white font-bold"
                >
                  Guardar Produto
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
