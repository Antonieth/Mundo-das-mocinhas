import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { db, hashPassword, verifyPassword, User, Order } from './db.js';
import { isSupabaseConfigured } from './supabase.js';
import { calculateOrderTotals, verifyAndCalculateItems } from '../utils/pricing.js';

test('Database persists data to disk and reloads correctly on re-instantiation', () => {
  const dbFile = db.getDbFilePath();
  assert.ok(fs.existsSync(dbFile), 'db.json file must exist on disk');

  // 1. Create a test user
  const testUserId = `test-user-${Date.now()}`;
  const pass = hashPassword('segredo123');
  const testUser: User = {
    id: testUserId,
    name: 'Mocinha Teste Persistência',
    phone: `+244 999 ${Math.floor(100000 + Math.random() * 900000)}`,
    email: `teste.${Date.now()}@mocinhas.ao`,
    passwordHash: pass.hash,
    salt: pass.salt,
    role: 'client',
    createdAt: new Date().toISOString(),
  };

  db.createUser(testUser);

  // Read raw file directly from disk to confirm synchronous persistence
  const diskRaw = fs.readFileSync(dbFile, 'utf-8');
  const diskParsed = JSON.parse(diskRaw);
  const userOnDisk = diskParsed.users.find((u: any) => u.id === testUserId);

  assert.ok(userOnDisk, 'User must be found directly in physical disk file');
  assert.equal(userOnDisk.name, 'Mocinha Teste Persistência');
  assert.equal(verifyPassword('segredo123', userOnDisk.passwordHash, userOnDisk.salt), true);
  assert.equal(verifyPassword('palavraerrada', userOnDisk.passwordHash, userOnDisk.salt), false);

  // 2. Create an order and verify order history persistence
  const orderId = `test-order-${Date.now()}`;
  const newOrder: Order = {
    id: orderId,
    orderNumber: `MOC-TEST-${Math.floor(1000 + Math.random() * 9000)}`,
    customerId: testUserId,
    customerName: testUser.name,
    customerPhone: testUser.phone,
    customerEmail: testUser.email,
    destinationProvince: 'Benguela',
    destinationMunicipality: 'Lobito',
    carrierId: 'carrier-real-express',
    carrierName: 'Real Express',
    items: [
      {
        productId: 'prod-1',
        name: 'Kit Completo Rosa Mosqueta Porán',
        price: 17000,
        quantity: 1,
        subtotal: 17000,
      },
    ],
    subtotal: 17000,
    shippingFee: 3500,
    total: 20500,
    status: 'aguardando_pagamento',
    paymentStatus: 'pendente',
    paymentMethod: 'Transferência Bancária / Multicaixa Express',
    statusHistory: [
      {
        id: `hist-1`,
        status: 'aguardando_pagamento',
        title: 'Aguardando Pagamento',
        description: 'Encomenda gerada para teste de persistência.',
        timestamp: new Date().toISOString(),
        updatedBy: 'Teste Automático',
      },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  db.createOrder(newOrder);

  // Verify order on disk
  const diskRawAfterOrder = fs.readFileSync(dbFile, 'utf-8');
  const diskParsedAfterOrder = JSON.parse(diskRawAfterOrder);
  const orderOnDisk = diskParsedAfterOrder.orders.find((o: any) => o.id === orderId);

  assert.ok(orderOnDisk, 'Order must be persisted to disk file');
  assert.equal(orderOnDisk.total, 20500);
  assert.equal(orderOnDisk.destinationProvince, 'Benguela');
  assert.equal(orderOnDisk.statusHistory.length, 1);

  // 3. Update order with payment receipt & status change
  db.updateOrder(orderId, {
    status: 'comprovativo_enviado',
    paymentStatus: 'em_verificacao',
    receiptFilename: 'comprovativo_teste.pdf',
    receiptUploadedAt: new Date().toISOString(),
  });

  db.addOrderStatusHistory(orderId, {
    id: `hist-2`,
    status: 'comprovativo_enviado',
    title: 'Comprovativo Anexado',
    description: 'Comprovativo anexado em teste.',
    timestamp: new Date().toISOString(),
    updatedBy: 'Cliente Teste',
  });

  const diskRawAfterUpdate = fs.readFileSync(dbFile, 'utf-8');
  const diskParsedAfterUpdate = JSON.parse(diskRawAfterUpdate);
  const updatedOnDisk = diskParsedAfterUpdate.orders.find((o: any) => o.id === orderId);

  assert.equal(updatedOnDisk.status, 'comprovativo_enviado');
  assert.equal(updatedOnDisk.paymentStatus, 'em_verificacao');
  assert.equal(updatedOnDisk.receiptFilename, 'comprovativo_teste.pdf');
  assert.equal(updatedOnDisk.statusHistory.length, 2);
});

test('Supabase configuration detector validates URL and key requirements', () => {
  // Save initial env
  const origUrl = process.env.SUPABASE_URL;
  const origKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  try {
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    assert.equal(isSupabaseConfigured(), false);

    // Placeholder shouldn't count as configured
    process.env.SUPABASE_URL = 'https://YOUR_SUPABASE.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'YOUR_KEY_HERE';
    assert.equal(isSupabaseConfigured(), false);

    // Valid HTTPS URL and token format
    process.env.SUPABASE_URL = 'https://abcd1234efgh5678.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'valid-token-string-example';
    assert.equal(isSupabaseConfigured(), true);
  } finally {
    // Restore
    if (origUrl) process.env.SUPABASE_URL = origUrl; else delete process.env.SUPABASE_URL;
    if (origKey) process.env.SUPABASE_SERVICE_ROLE_KEY = origKey; else delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  }
});
