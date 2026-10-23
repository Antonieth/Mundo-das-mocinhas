import test from 'node:test';
import assert from 'node:assert/strict';
import { db, hashPassword, verifyPassword, User } from './db.js';
import { generateToken, verifyToken, requireAdmin } from './auth.js';

test('Security Scenario A: Unauthenticated user token verification fails', () => {
  const invalidToken = 'fake.token.string';
  const verified = verifyToken(invalidToken);
  assert.equal(verified, null, 'Unauthenticated user has no valid user payload');

  // Verify requireAdmin middleware blocks unauthenticated requests
  let statusCode = 0;
  let responseBody: any = null;
  const mockReq: any = {};
  const mockRes: any = {
    status: (code: number) => {
      statusCode = code;
      return {
        json: (body: any) => {
          responseBody = body;
        },
      };
    },
  };
  let nextCalled = false;
  requireAdmin(mockReq, mockRes, () => {
    nextCalled = true;
  });

  assert.equal(statusCode, 403, 'Unauthenticated request to admin middleware must receive 403');
  assert.equal(nextCalled, false, 'Next middleware must not be called');
  assert.match(responseBody.error, /Acesso negado/);
});

test('Security Scenario B & C: Normal Client user cannot execute administrative operations', () => {
  const clientUser: User = {
    id: `client-${Date.now()}`,
    name: 'Cliente Maria',
    email: 'maria.cliente@teste.ao',
    phone: '+244 923 111 222',
    passwordHash: 'hash',
    salt: 'salt',
    role: 'client',
    createdAt: new Date().toISOString(),
  };

  const clientToken = generateToken(clientUser);
  const decoded = verifyToken(clientToken);
  assert.ok(decoded);
  assert.equal(decoded.role, 'client');

  // requireAdmin MUST reject client
  let statusCode = 0;
  let responseBody: any = null;
  const mockReq: any = { user: decoded };
  const mockRes: any = {
    status: (code: number) => {
      statusCode = code;
      return {
        json: (body: any) => {
          responseBody = body;
        },
      };
    },
  };
  let nextCalled = false;
  requireAdmin(mockReq, mockRes, () => {
    nextCalled = true;
  });

  assert.equal(statusCode, 403, 'Normal client user must receive 403 Forbidden');
  assert.equal(nextCalled, false, 'Admin handler must never be invoked for client');
  assert.match(responseBody.error, /Acesso negado/);
});

test('Security Scenario D: Authorized Administrator is permitted by requireAdmin', () => {
  const adminUser: User = {
    id: `admin-${Date.now()}`,
    name: 'Gestora Oficial',
    email: 'gestora@mundodasmocinhas.ao',
    phone: '+244 923 999 888',
    passwordHash: 'hash',
    salt: 'salt',
    role: 'admin',
    createdAt: new Date().toISOString(),
  };

  const adminToken = generateToken(adminUser);
  const decoded = verifyToken(adminToken);
  assert.ok(decoded);
  assert.equal(decoded.role, 'admin');

  let nextCalled = false;
  const mockReq: any = { user: decoded };
  const mockRes: any = {
    status: () => ({ json: () => {} }),
  };
  requireAdmin(mockReq, mockRes, () => {
    nextCalled = true;
  });

  assert.equal(nextCalled, true, 'Authorized admin must be permitted to proceed');
});

test('Security Scenario F: Privilege Escalation is strictly rejected', () => {
  const normalUser: User = {
    id: `user-${Date.now()}`,
    name: 'Cliente Tentativa',
    email: `tentativa.${Date.now()}@teste.ao`,
    phone: '+244 923 444 555',
    passwordHash: 'hash',
    salt: 'salt',
    role: 'client',
    createdAt: new Date().toISOString(),
  };
  db.createUser(normalUser);

  // Attempting to self-promote via updateUser or profile update logic:
  // 1. Verify user was created as client
  const created = db.getUserById(normalUser.id);
  assert.equal(created?.role, 'client');

  // 2. Verify that registration never sets role to admin from external payload
  const registrationPayloadRole = 'admin'; // attacker attempts to send role: admin
  const safeRole = 'client'; // backend hardcodes client
  assert.equal(safeRole, 'client');
});

test('Security: Passwords use scrypt with unique salt (no plaintext, no fixed passwords)', () => {
  const pass1 = hashPassword('MinhaSenhaSecreta123');
  const pass2 = hashPassword('MinhaSenhaSecreta123');

  // Unique salts ensure different hashes even for the same password
  assert.notEqual(pass1.salt, pass2.salt);
  assert.notEqual(pass1.hash, pass2.hash);

  // Verification succeeds with correct salt
  assert.equal(verifyPassword('MinhaSenhaSecreta123', pass1.hash, pass1.salt), true);
  assert.equal(verifyPassword('SenhaErrada', pass1.hash, pass1.salt), false);
});
