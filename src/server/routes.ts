import { Router, Response } from 'express';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {
  db,
  hashPassword,
  verifyPassword,
  User,
  Product,
  Order,
  ShippingCarrier,
  ShippingDestination,
  StorePaymentSettings,
} from './db.js';
import {
  AuthenticatedRequest,
  generateToken,
  requireAuth,
  requireAdmin,
} from './auth.js';
import {
  verifyAndCalculateItems,
  calculateOrderTotals,
  generateOrderNumber,
} from '../utils/pricing.js';
import { ORDER_STATUS_MAP } from '../utils/orderStatus.js';
import {
  isSupabaseConfigured,
  testSupabaseConnection,
  uploadReceiptToSupabase,
  getSupabaseAdminClient,
} from './supabase.js';

export const apiRouter = Router();

// ==========================================
// 1. AUTHENTICATION ROUTES
// ==========================================

// Register customer
apiRouter.post('/auth/register', (req: AuthenticatedRequest, res: Response) => {
  try {
    const { name, phone, email, password, confirmPassword } = req.body;

    if (!name || typeof name !== 'string' || name.trim().length < 3) {
      return res.status(400).json({ error: 'Nome completo é obrigatório (mínimo 3 caracteres).' });
    }
    if (!phone || typeof phone !== 'string' || phone.trim().length < 8) {
      return res.status(400).json({ error: 'Número de telefone válido é obrigatório.' });
    }
    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return res.status(400).json({ error: 'E-mail válido é obrigatório.' });
    }
    if (!password || typeof password !== 'string' || password.length < 6) {
      return res.status(400).json({ error: 'A palavra-passe deve ter pelo menos 6 caracteres.' });
    }
    if (password !== confirmPassword) {
      return res.status(400).json({ error: 'As palavras-passe não coincidem.' });
    }

    // Check uniqueness
    if (db.getUserByEmail(email)) {
      return res.status(400).json({ error: 'Já existe uma conta registada com este e-mail.' });
    }
    if (db.getUserByPhone(phone)) {
      return res.status(400).json({ error: 'Já existe uma conta com este número de telefone.' });
    }

    const { hash, salt } = hashPassword(password);
    const newUser: User = {
      id: `user-${crypto.randomUUID()}`,
      name: name.trim(),
      phone: phone.trim(),
      email: email.trim().toLowerCase(),
      passwordHash: hash,
      salt,
      role: 'client',
      createdAt: new Date().toISOString(),
    };

    db.createUser(newUser);
    const token = generateToken(newUser);

    return res.status(201).json({
      message: 'Registo efectuado com sucesso!',
      token,
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        phone: newUser.phone,
        role: newUser.role,
      },
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Erro ao criar conta.' });
  }
});

// Login (Customer or Admin)
apiRouter.post('/auth/login', (req: AuthenticatedRequest, res: Response) => {
  try {
    const { identifier, password } = req.body; // email or phone
    if (!identifier || !password) {
      return res.status(400).json({ error: 'E-mail/Telefone e palavra-passe são obrigatórios.' });
    }

    const trimmed = identifier.trim();
    let user = db.getUserByEmail(trimmed);
    if (!user) {
      user = db.getUserByPhone(trimmed);
    }

    if (!user) {
      return res.status(401).json({ error: 'Credenciais inválidas. Verifique o seu e-mail e palavra-passe.' });
    }

    const isValid = verifyPassword(password, user.passwordHash, user.salt);
    if (!isValid) {
      return res.status(401).json({ error: 'Credenciais inválidas. Verifique o seu e-mail e palavra-passe.' });
    }

    const token = generateToken(user);
    return res.json({
      message: 'Sessão iniciada com sucesso!',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
      },
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Erro ao iniciar sessão.' });
  }
});

// Current User Profile
apiRouter.get('/auth/me', (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    return res.json({ user: null });
  }
  return res.json({ user: req.user });
});

// Update Profile (Strict Privilege Escalation Prevention)
apiRouter.put('/auth/profile', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user!;
    const { name, phone, role } = req.body;

    // Critical security check: NEVER allow users to change their own role or promote themselves
    if (role !== undefined && role !== user.role) {
      return res.status(403).json({
        error: 'Operação recusada. Não tem autorização para alterar a função (role) de utilizador.',
      });
    }

    const existing = db.getUserById(user.id);
    if (!existing) {
      return res.status(404).json({ error: 'Utilizador não encontrado.' });
    }

    const updates: Partial<User> = {};
    if (name && typeof name === 'string' && name.trim().length >= 3) {
      updates.name = name.trim();
    }
    if (phone && typeof phone === 'string' && phone.trim().length >= 8) {
      updates.phone = phone.trim();
    }

    const updatedUser = db.updateUser(user.id, updates);
    if (!updatedUser) {
      return res.status(500).json({ error: 'Erro ao guardar dados do perfil.' });
    }

    return res.json({
      message: 'Perfil actualizado com sucesso!',
      user: {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        phone: updatedUser.phone,
        role: updatedUser.role,
      },
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Erro ao actualizar perfil.' });
  }
});

// ==========================================
// 1.1 ADMIN SETUP & PRIVILEGE ESCALATION LOCK
// ==========================================

// Check if any administrator exists and if setup mode is active
apiRouter.get('/admin/setup-status', (_req: AuthenticatedRequest, res: Response) => {
  try {
    const existingAdmins = db.getAdmins();
    const isTokenConfigured = Boolean(
      process.env.ADMIN_SETUP_TOKEN?.trim() || process.env.ADMIN_SETUP_SECRET?.trim()
    );

    return res.json({
      hasAdmin: existingAdmins.length > 0,
      adminCount: existingAdmins.length,
      needsSetup: existingAdmins.length === 0,
      isTokenConfigured,
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'Erro ao verificar estado de administradores.' });
  }
});

// Secure Registration of the First Administrator using ADMIN_SETUP_TOKEN
const handleFirstAdminSetup = (req: AuthenticatedRequest, res: Response) => {
  try {
    const { name, phone, email, password, confirmPassword, setupToken, setupSecret } = req.body;
    const existingAdmins = db.getAdmins();

    // STRICT LOCK: If an administrator already exists, setup is permanently blocked to prevent any privilege escalation
    if (existingAdmins.length > 0) {
      return res.status(403).json({
        error:
          'Registo recusado. O sistema já possui um administrador configurado. O registo do primeiro administrador encontra-se permanentemente bloqueado para impedir elevação de privilégios.',
      });
    }

    // Server must have ADMIN_SETUP_TOKEN configured in environment
    const envToken = process.env.ADMIN_SETUP_TOKEN?.trim() || process.env.ADMIN_SETUP_SECRET?.trim();
    if (!envToken) {
      return res.status(503).json({
        error:
          'ADMIN_SETUP_TOKEN não está configurado no ficheiro de ambiente (.env) do servidor. Defina a variável de ambiente no servidor para autorizar o registo do primeiro administrador.',
      });
    }

    // Token comparison using timingSafeEqual
    const providedToken =
      (req.headers['x-admin-setup-token'] as string) ||
      (req.headers['x-admin-setup-secret'] as string) ||
      setupToken ||
      setupSecret ||
      '';

    const providedBuf = Buffer.from(String(providedToken));
    const expectedBuf = Buffer.from(envToken);

    if (
      providedBuf.length === 0 ||
      providedBuf.length !== expectedBuf.length ||
      !crypto.timingSafeEqual(providedBuf, expectedBuf)
    ) {
      return res.status(401).json({
        error: 'Token de configuração do servidor inválido ou ausente. Verifique o valor de ADMIN_SETUP_TOKEN.',
      });
    }

    // Validate inputs
    if (!name || typeof name !== 'string' || name.trim().length < 3) {
      return res.status(400).json({ error: 'Nome do administrador é obrigatório (mínimo 3 caracteres).' });
    }
    if (!phone || typeof phone !== 'string' || phone.trim().length < 8) {
      return res.status(400).json({ error: 'Número de telefone válido é obrigatório.' });
    }
    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return res.status(400).json({ error: 'E-mail válido é obrigatório.' });
    }
    if (!password || typeof password !== 'string' || password.length < 8) {
      return res.status(400).json({ error: 'A palavra-passe de administrador deve ter no mínimo 8 caracteres.' });
    }
    if (confirmPassword && password !== confirmPassword) {
      return res.status(400).json({ error: 'As palavras-passe não coincidem.' });
    }

    const trimmedEmail = email.trim().toLowerCase();
    const existingUser = db.getUserByEmail(trimmedEmail);

    let adminUser: User;
    const { hash, salt } = hashPassword(password);

    if (existingUser) {
      // Existing user account is promoted to first administrator
      const updated = db.updateUser(existingUser.id, {
        name: name.trim(),
        phone: phone.trim(),
        passwordHash: hash,
        salt,
        role: 'admin',
      });
      if (!updated) {
        return res.status(500).json({ error: 'Erro ao atribuir função de administrador ao utilizador existente.' });
      }
      adminUser = updated;
    } else {
      // Create brand new administrator
      adminUser = {
        id: `user-admin-${crypto.randomUUID()}`,
        name: name.trim(),
        phone: phone.trim(),
        email: trimmedEmail,
        passwordHash: hash,
        salt,
        role: 'admin',
        createdAt: new Date().toISOString(),
      };
      db.createUser(adminUser);
    }

    // Generate authenticated session token
    const token = generateToken(adminUser);

    return res.status(201).json({
      message: 'Primeiro administrador configurado com sucesso! O sistema de configuração foi bloqueado permanentemente.',
      token,
      admin: {
        id: adminUser.id,
        name: adminUser.name,
        email: adminUser.email,
        phone: adminUser.phone,
        role: adminUser.role,
      },
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Erro ao registar o primeiro administrador.' });
  }
};

apiRouter.post('/admin/setup-first-admin', handleFirstAdminSetup);
apiRouter.post('/admin/setup-initial-admin', handleFirstAdminSetup);


// ==========================================
// 2. PRODUCT ROUTES
// ==========================================

// List products with optional search, category, and sorting
apiRouter.get('/products', (req: AuthenticatedRequest, res: Response) => {
  try {
    let products = db.getProducts();

    // Client only sees active products unless admin
    const isAdmin = req.user && req.user.role === 'admin';
    if (!isAdmin) {
      products = products.filter((p) => p.isActive);
    }

    const category = req.query.category as string;
    const search = req.query.search as string;
    const sort = req.query.sort as string;

    if (category && category !== 'todos') {
      products = products.filter(
        (p) => p.category.toLowerCase() === category.toLowerCase()
      );
    }

    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      products = products.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q)
      );
    }

    if (sort === 'price-asc') {
      products.sort((a, b) => a.price - b.price);
    } else if (sort === 'price-desc') {
      products.sort((a, b) => b.price - a.price);
    } else if (sort === 'name-asc') {
      products.sort((a, b) => a.name.localeCompare(b.name));
    } else {
      // default: featured first, then newest
      products.sort((a, b) => {
        if (a.isFeatured && !b.isFeatured) return -1;
        if (!a.isFeatured && b.isFeatured) return 1;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
    }

    return res.json({ products });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Erro ao listar produtos.' });
  }
});

// Single product
apiRouter.get('/products/:id', (req: AuthenticatedRequest, res: Response) => {
  const product = db.getProductById(req.params.id);
  if (!product) {
    return res.status(404).json({ error: 'Produto não encontrado.' });
  }
  return res.json({ product });
});

// Admin: Create product
apiRouter.post('/products', requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  try {
    const { name, description, category, price, stock, isActive, isFeatured, images, badge } = req.body;
    if (!name || !price || !category) {
      return res.status(400).json({ error: 'Nome, categoria e preço em Kwanzas são obrigatórios.' });
    }

    const newProduct: Product = {
      id: `prod-${crypto.randomUUID()}`,
      name: name.trim(),
      slug: name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      description: description || '',
      category: category.trim(),
      price: Math.max(0, Math.round(Number(price) || 0)),
      stock: Math.max(0, Math.floor(Number(stock) || 0)),
      isActive: isActive !== false,
      isFeatured: !!isFeatured,
      images: Array.isArray(images) && images.length > 0 ? images : ['/assets/aistudio/Universo_Cor-de-Rosa_de_Beleza_e_Moda_4b1c881c.png'],
      badge: badge ? badge.trim() : undefined,
      createdAt: new Date().toISOString(),
    };

    db.createProduct(newProduct);
    return res.status(201).json({ message: 'Produto criado com sucesso!', product: newProduct });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Erro ao criar produto.' });
  }
});

// Admin: Update product
apiRouter.put('/products/:id', requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  try {
    const updated = db.updateProduct(req.params.id, req.body);
    if (!updated) {
      return res.status(404).json({ error: 'Produto não encontrado.' });
    }
    return res.json({ message: 'Produto actualizado com sucesso!', product: updated });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Erro ao actualizar produto.' });
  }
});

// Admin: Delete product
apiRouter.delete('/products/:id', requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  const deleted = db.deleteProduct(req.params.id);
  if (!deleted) {
    return res.status(404).json({ error: 'Produto não encontrado.' });
  }
  return res.json({ message: 'Produto removido com sucesso!' });
});

// Categories list
apiRouter.get('/categories', (_req: AuthenticatedRequest, res: Response) => {
  return res.json({ categories: db.getCategories() });
});

// ==========================================
// 3. ORDER ROUTES (CLIENT & ADMIN)
// ==========================================

// Create order - MUST BE AUTHENTICATED (Rule 3)
apiRouter.post('/orders', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  try {
    const customer = req.user!;
    const {
      cartItems,
      destinationProvince,
      destinationMunicipality,
      carrierId,
      carrierName,
      customCarrierName,
      pickupInstructions,
      customerPhone,
      customerName,
    } = req.body;

    if (!cartItems || !Array.isArray(cartItems) || cartItems.length === 0) {
      return res.status(400).json({ error: 'O carrinho está vazio.' });
    }

    if (!destinationProvince) {
      return res.status(400).json({ error: 'Por favor seleccione a província de destino em Angola.' });
    }

    if (!carrierId) {
      return res.status(400).json({ error: 'Por favor seleccione a transportadora para a entrega.' });
    }

    if (carrierId === 'carrier-other' && (!customCarrierName || !customCarrierName.trim())) {
      return res.status(400).json({ error: 'Por favor indique o nome da transportadora pretendida.' });
    }

    // Server-side calculation & verification against DB
    const allProducts = db.getProducts();
    const productPriceMap: Record<string, any> = {};
    for (const p of allProducts) {
      productPriceMap[p.id] = p;
    }

    const { items, subtotal } = verifyAndCalculateItems(cartItems, productPriceMap);

    // Verify destination shipping fee
    const destinations = db.getDestinations();
    const dest = destinations.find(
      (d) => d.province.toLowerCase() === destinationProvince.toLowerCase()
    );
    const shippingFee = dest ? dest.baselineFee : 0;

    const totals = calculateOrderTotals(subtotal, shippingFee);

    // Decrement stock in DB
    for (const item of items) {
      db.decrementProductStock(item.productId, item.quantity);
    }

    // Attach product primary image to order items for display
    const enrichedItems = items.map((item) => {
      const prod = productPriceMap[item.productId];
      return {
        ...item,
        image: prod?.images?.[0] || '',
      };
    });

    const now = new Date().toISOString();
    const orderNumber = generateOrderNumber();
    const newOrder: Order = {
      id: `order-${crypto.randomUUID()}`,
      orderNumber,
      customerId: customer.id,
      customerName: customerName || customer.name,
      customerPhone: customerPhone || customer.phone,
      customerEmail: customer.email,
      destinationProvince,
      destinationMunicipality: destinationMunicipality || '',
      carrierId,
      carrierName: carrierId === 'carrier-other' ? customCarrierName.trim() : carrierName,
      customCarrierName: carrierId === 'carrier-other' ? customCarrierName.trim() : undefined,
      pickupInstructions: pickupInstructions ? pickupInstructions.trim() : undefined,
      items: enrichedItems,
      subtotal: totals.subtotal,
      shippingFee: totals.shippingFee,
      total: totals.total,
      status: 'aguardando_pagamento',
      paymentStatus: 'pendente',
      paymentMethod: 'Transferência Bancária / Multicaixa Express',
      statusHistory: [
        {
          id: `hist-${crypto.randomUUID()}`,
          status: 'recebida',
          title: 'Encomenda Registada',
          description: 'A sua encomenda foi criada com sucesso no sistema.',
          timestamp: now,
          updatedBy: 'Sistema',
        },
        {
          id: `hist-${crypto.randomUUID()}`,
          status: 'aguardando_pagamento',
          title: 'Aguardando Pagamento',
          description: 'Aguardamos a transferência bancária e o anexo do respectivo comprovativo.',
          timestamp: now,
          updatedBy: 'Sistema',
        },
      ],
      createdAt: now,
      updatedAt: now,
    };

    db.createOrder(newOrder);

    return res.status(201).json({
      message: 'Encomenda criada com sucesso!',
      order: newOrder,
    });
  } catch (err: any) {
    return res.status(400).json({ error: err.message || 'Erro ao processar encomenda.' });
  }
});

// List orders
apiRouter.get('/orders', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  if (user.role === 'admin') {
    // Admin sees all orders
    return res.json({ orders: db.getOrders() });
  }
  // Client ONLY sees their own orders (Data isolation / RLS rule)
  const clientOrders = db.getOrdersByCustomerId(user.id);
  return res.json({ orders: clientOrders });
});

// Single order details
apiRouter.get('/orders/:id', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const order = db.getOrderById(req.params.id);
  if (!order) {
    return res.status(404).json({ error: 'Encomenda não encontrada.' });
  }

  // Authorization check
  if (user.role !== 'admin' && order.customerId !== user.id) {
    return res.status(403).json({ error: 'Acesso negado a esta encomenda.' });
  }

  return res.json({ order });
});

// Upload Payment Receipt (Customer)
apiRouter.post('/orders/:id/receipt', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user!;
    const order = db.getOrderById(req.params.id);

    if (!order) {
      return res.status(404).json({ error: 'Encomenda não encontrada.' });
    }

    if (user.role !== 'admin' && order.customerId !== user.id) {
      return res.status(403).json({ error: 'Acesso negado a esta encomenda.' });
    }

    const { receiptData, receiptFilename, receiptMimeType } = req.body;
    if (!receiptData) {
      return res.status(400).json({ error: 'Ficheiro do comprovativo não fornecido.' });
    }

    // Validate mime type: image or pdf
    const allowedMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg', 'application/pdf'];
    if (receiptMimeType && !allowedMimes.includes(receiptMimeType.toLowerCase())) {
      return res.status(400).json({ error: 'Formato não suportado. Por favor envie imagem (PNG, JPG, WEBP) ou PDF.' });
    }

    const now = new Date().toISOString();
    let supabaseReceiptPath: string | undefined;

    // If Supabase Storage is configured, also backup the receipt file to private bucket
    if (isSupabaseConfigured() && receiptData.includes('base64,')) {
      try {
        const base64Content = receiptData.split('base64,')[1];
        const buffer = Buffer.from(base64Content, 'base64');
        const ext = (receiptMimeType || 'image/jpeg').split('/')[1] || 'jpg';
        const storageDest = `${order.customerId}/${order.orderNumber}-${Date.now()}.${ext}`;
        const uploadResult = await uploadReceiptToSupabase(buffer, storageDest, receiptMimeType || 'image/jpeg');
        if (uploadResult.success) {
          supabaseReceiptPath = uploadResult.storagePath;
        }
      } catch (storageErr) {
        console.warn('Não foi possível enviar comprovativo para Supabase Storage:', storageErr);
      }
    }

    const updated = db.updateOrder(order.id, {
      receiptData,
      receiptFilename: receiptFilename || 'comprovativo-pagamento',
      receiptMimeType: receiptMimeType || 'image/jpeg',
      receiptUploadedAt: now,
      status: 'comprovativo_enviado',
      paymentStatus: 'em_verificacao',
      receiptRejectionReason: undefined,
    });

    db.addOrderStatusHistory(order.id, {
      id: `hist-${crypto.randomUUID()}`,
      status: 'comprovativo_enviado',
      title: 'Comprovativo Enviado',
      description: supabaseReceiptPath
        ? 'O comprovativo de pagamento foi guardado com sucesso e anexado para verificação.'
        : 'O comprovativo de pagamento foi anexado pelo cliente e está em verificação pela equipa.',
      timestamp: now,
      updatedBy: user.name,
    });

    return res.json({
      message: 'Comprovativo enviado com sucesso! A nossa equipa irá conferir o pagamento.',
      order: updated,
      supabaseStored: Boolean(supabaseReceiptPath),
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Erro ao anexar comprovativo.' });
  }
});

// Admin: Verify Payment Receipt (Approve / Reject)
apiRouter.post('/orders/:id/verify-receipt', requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  try {
    const order = db.getOrderById(req.params.id);
    if (!order) {
      return res.status(404).json({ error: 'Encomenda não encontrada.' });
    }

    const { action, rejectionReason, adminNotes } = req.body;
    const now = new Date().toISOString();

    if (action === 'approve') {
      const updated = db.updateOrder(order.id, {
        paymentStatus: 'confirmado',
        status: 'pagamento_confirmado',
        adminNotes: adminNotes || order.adminNotes,
        receiptRejectionReason: undefined,
      });

      db.addOrderStatusHistory(order.id, {
        id: `hist-${crypto.randomUUID()}`,
        status: 'pagamento_confirmado',
        title: 'Pagamento Confirmado',
        description: 'O pagamento foi conferido e validado com sucesso pela administração.',
        timestamp: now,
        updatedBy: req.user!.name,
      });

      return res.json({ message: 'Pagamento confirmado com sucesso!', order: updated });
    } else if (action === 'reject') {
      const reason = rejectionReason || 'Comprovativo ilegível ou montante não creditado.';
      const updated = db.updateOrder(order.id, {
        paymentStatus: 'rejeitado',
        status: 'pagamento_rejeitado',
        receiptRejectionReason: reason,
        adminNotes: adminNotes || order.adminNotes,
      });

      db.addOrderStatusHistory(order.id, {
        id: `hist-${crypto.randomUUID()}`,
        status: 'pagamento_rejeitado',
        title: 'Comprovativo Rejeitado',
        description: `O comprovativo não pôde ser validado. Motivo: ${reason}`,
        timestamp: now,
        updatedBy: req.user!.name,
      });

      return res.json({ message: 'Comprovativo rejeitado com notificação de motivo.', order: updated });
    } else {
      return res.status(400).json({ error: 'Ação inválida. Utilize "approve" ou "reject".' });
    }
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Erro ao processar comprovativo.' });
  }
});

// Admin: Update order status & carrier tracking code
apiRouter.put('/orders/:id/status', requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  try {
    const order = db.getOrderById(req.params.id);
    if (!order) {
      return res.status(404).json({ error: 'Encomenda não encontrada.' });
    }

    const { status, carrierTrackingCode, adminNotes, statusTitle, statusDescription } = req.body;
    const now = new Date().toISOString();

    const updates: Partial<Order> = {};
    if (status) updates.status = status;
    if (carrierTrackingCode !== undefined) updates.carrierTrackingCode = carrierTrackingCode;
    if (adminNotes !== undefined) updates.adminNotes = adminNotes;

    const updated = db.updateOrder(order.id, updates);

    if (status && status !== order.status) {
      const meta = ORDER_STATUS_MAP[status as keyof typeof ORDER_STATUS_MAP];
      db.addOrderStatusHistory(order.id, {
        id: `hist-${crypto.randomUUID()}`,
        status,
        title: statusTitle || meta?.label || 'Actualização de Estado',
        description: statusDescription || meta?.description || `Estado alterado para ${status}`,
        timestamp: now,
        updatedBy: req.user!.name,
      });
    }

    return res.json({ message: 'Estado da encomenda actualizado!', order: updated });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Erro ao actualizar estado.' });
  }
});

// ==========================================
// 4. SHIPPING & DESTINATION CONFIGURATION
// ==========================================

apiRouter.get('/shipping/carriers', (_req: AuthenticatedRequest, res: Response) => {
  return res.json({ carriers: db.getCarriers() });
});

apiRouter.put('/shipping/carriers/:id', requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  const updated = db.updateCarrier(req.params.id, req.body);
  if (!updated) {
    return res.status(404).json({ error: 'Transportadora não encontrada.' });
  }
  return res.json({ message: 'Transportadora actualizada com sucesso!', carrier: updated });
});

apiRouter.get('/shipping/destinations', (_req: AuthenticatedRequest, res: Response) => {
  return res.json({ destinations: db.getDestinations() });
});

apiRouter.put('/shipping/destinations/:province', requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  const updated = db.updateDestination(req.params.province, req.body);
  if (!updated) {
    return res.status(404).json({ error: 'Província não encontrada.' });
  }
  return res.json({ message: 'Taxa da província actualizada!', destination: updated });
});

// ==========================================
// 5. PAYMENT SETTINGS (STORE BANK ACCOUNTS)
// ==========================================

apiRouter.get('/settings/payment', (_req: AuthenticatedRequest, res: Response) => {
  return res.json({ paymentSettings: db.getPaymentSettings() });
});

apiRouter.put('/settings/payment', requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  const updated = db.updatePaymentSettings(req.body);
  return res.json({ message: 'Dados de pagamento actualizados com sucesso!', paymentSettings: updated });
});

// ==========================================
// 6. ADMIN DASHBOARD METRICS & STATS
// ==========================================

apiRouter.get('/admin/stats', requireAdmin, (_req: AuthenticatedRequest, res: Response) => {
  try {
    const orders = db.getOrders();
    const products = db.getProducts();

    let totalConfirmedSales = 0;
    let pendingOrders = 0;
    let unverifiedReceipts = 0;
    const provinceSales: Record<string, { count: number; total: number }> = {};
    const carrierCounts: Record<string, number> = {};

    for (const order of orders) {
      if (order.paymentStatus === 'confirmado') {
        totalConfirmedSales += order.total;
      }
      if (['recebida', 'aguardando_pagamento', 'comprovativo_enviado', 'em_verificacao'].includes(order.status)) {
        pendingOrders += 1;
      }
      if (order.status === 'comprovativo_enviado' || order.paymentStatus === 'em_verificacao') {
        unverifiedReceipts += 1;
      }

      // Province stats
      const prov = order.destinationProvince || 'Outra';
      if (!provinceSales[prov]) {
        provinceSales[prov] = { count: 0, total: 0 };
      }
      provinceSales[prov].count += 1;
      if (order.paymentStatus === 'confirmado') {
        provinceSales[prov].total += order.total;
      }

      // Carrier stats
      const carrier = order.carrierName || 'Outra';
      carrierCounts[carrier] = (carrierCounts[carrier] || 0) + 1;
    }

    const lowStockProducts = products.filter((p) => p.stock <= 5);

    return res.json({
      stats: {
        totalConfirmedSales,
        totalOrders: orders.length,
        pendingOrders,
        unverifiedReceipts,
        totalProducts: products.length,
        lowStockCount: lowStockProducts.length,
        lowStockProducts,
        provinceSales,
        carrierCounts,
      },
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Erro ao carregar estatísticas.' });
  }
});

// ==========================================
// 7. DATABASE & SUPABASE MANAGEMENT
// ==========================================

// Get database status & connection info
apiRouter.get('/admin/database-status', requireAdmin, async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const isConfigured = isSupabaseConfigured();
    const localDbStats = db.getStatsSummary();
    const localDbFile = db.getDbFilePath();
    const localDbExists = db.isPersistentOnDisk();

    let localDbSize = 0;
    if (localDbExists) {
      try {
        const stat = fs.statSync(localDbFile);
        localDbSize = stat.size;
      } catch {
        localDbSize = 0;
      }
    }

    let supabaseHealth = null;
    if (isConfigured) {
      supabaseHealth = await testSupabaseConnection();
    }

    // Read schema.sql content so admin can copy it easily from UI
    let schemaSql = '';
    const schemaPath = path.resolve(process.cwd(), 'supabase', 'schema.sql');
    if (fs.existsSync(schemaPath)) {
      schemaSql = fs.readFileSync(schemaPath, 'utf-8');
    }

    return res.json({
      status: 'ok',
      activeStorageEngine: isConfigured && supabaseHealth?.connected ? 'supabase_postgresql' : 'local_persistent_json',
      localDatabase: {
        engine: 'File-backed JSON Persistent Database',
        filePath: localDbFile,
        existsOnDisk: localDbExists,
        fileSizeBytes: localDbSize,
        stats: localDbStats,
      },
      supabase: {
        isConfigured,
        supabaseUrl: process.env.SUPABASE_URL || null,
        hasServiceRoleKey: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()),
        hasAnonKey: Boolean(process.env.SUPABASE_ANON_KEY?.trim()),
        health: supabaseHealth,
        schemaFilePath: '/supabase/schema.sql',
        schemaSqlLength: schemaSql.length,
      },
      schemaSql,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Erro ao verificar estado da base de dados.' });
  }
});

// Explicitly test Supabase connection
apiRouter.post('/admin/test-supabase', requireAdmin, async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const health = await testSupabaseConnection();
    return res.json({
      success: health.connected,
      health,
      message: health.connected
        ? 'Ligação ao Supabase PostgreSQL efectuada com sucesso!'
        : health.error || 'Não foi possível conectar ao Supabase.',
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Erro ao testar ligação ao Supabase.' });
  }
});

// Sync local catalog to Supabase (Categories, Products, Shipping, Destinations)
apiRouter.post('/admin/sync-to-supabase', requireAdmin, async (_req: AuthenticatedRequest, res: Response) => {
  try {
    if (!isSupabaseConfigured()) {
      return res.status(400).json({
        error: 'Supabase não está configurado. Configure SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY primeiro.',
      });
    }

    const client = getSupabaseAdminClient();
    if (!client) {
      return res.status(500).json({ error: 'Falha ao inicializar o cliente Supabase.' });
    }

    const categories = db.getCategories();
    const products = db.getProducts();
    const carriers = db.getCarriers();
    const destinations = db.getDestinations();
    const payment = db.getPaymentSettings();

    // 1. Sync categories
    const categoryRows = categories.map((c) => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      icon: c.icon,
      description: c.description,
    }));
    const { error: catErr } = await client.from('categories').upsert(categoryRows);
    if (catErr) {
      return res.status(500).json({ error: `Erro ao sincronizar categorias: ${catErr.message}` });
    }

    // 2. Sync products
    const productRows = products.map((p) => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
      description: p.description,
      category: p.category,
      price: p.price,
      stock: p.stock,
      is_active: p.isActive,
      is_featured: p.isFeatured,
      badge: p.badge || null,
      images: p.images || [],
    }));
    const { error: prodErr } = await client.from('products').upsert(productRows);
    if (prodErr) {
      return res.status(500).json({ error: `Erro ao sincronizar produtos: ${prodErr.message}` });
    }

    // 3. Sync shipping carriers
    const carrierRows = carriers.map((c) => ({
      id: c.id,
      name: c.name,
      active: c.active,
      is_custom_carrier: Boolean(c.isCustomCarrier),
      note: c.note,
      contact: c.contact,
    }));
    const { error: carrErr } = await client.from('shipping_carriers').upsert(carrierRows);
    if (carrErr) {
      return res.status(500).json({ error: `Erro ao sincronizar transportadoras: ${carrErr.message}` });
    }

    // 4. Sync destinations
    const destRows = destinations.map((d) => ({
      province: d.province,
      baseline_fee: d.baselineFee,
      estimated_days: d.estimatedDays,
      active: d.active,
      municipalities: d.municipalities || [],
    }));
    const { error: destErr } = await client.from('shipping_destinations').upsert(destRows);
    if (destErr) {
      return res.status(500).json({ error: `Erro ao sincronizar destinos: ${destErr.message}` });
    }

    // 5. Sync store payment settings
    const { error: payErr } = await client.from('store_payment_settings').upsert({
      id: 1,
      bank_name: payment.bankName,
      account_holder: payment.accountHolder,
      iban: payment.iban,
      multicaixa_express_phone: payment.multicaixaExpressPhone,
      payment_instructions: payment.paymentInstructions,
      notice: payment.notice,
    });
    if (payErr) {
      return res.status(500).json({ error: `Erro ao sincronizar dados de pagamento: ${payErr.message}` });
    }

    return res.json({
      message: 'Sincronização com o Supabase concluída com sucesso!',
      synced: {
        categories: categories.length,
        products: products.length,
        carriers: carriers.length,
        destinations: destinations.length,
        paymentSettings: true,
      },
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Erro durante sincronização com o Supabase.' });
  }
});

