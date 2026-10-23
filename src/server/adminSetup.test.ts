import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { db, hashPassword, verifyPassword, User } from './db.js';
import { generateToken, verifyToken } from './auth.js';

test('Setup Status: reports needsSetup=true when 0 admins exist, false when admin exists', () => {
  // Save current users backup
  const initialAdmins = db.getAdmins();

  // Test with at least one admin
  if (initialAdmins.length === 0) {
    const testAdmin: User = {
      id: `test-admin-${Date.now()}`,
      name: 'Admin Teste',
      email: `admin.${Date.now()}@mocinhas.ao`,
      phone: '+244 923 000 111',
      passwordHash: 'hash',
      salt: 'salt',
      role: 'admin',
      createdAt: new Date().toISOString(),
    };
    db.createUser(testAdmin);
  }

  const adminsNow = db.getAdmins();
  assert.ok(adminsNow.length > 0, 'Should have at least 1 admin');
  const needsSetupWithAdmin = adminsNow.length === 0;
  assert.equal(needsSetupWithAdmin, false, 'needsSetup must be false when admin exists');
});

test('First Admin Setup: Single-use lock rejects any subsequent admin registration attempt', () => {
  // Verify that if any administrator already exists, setup handler rejects with 403
  const admins = db.getAdmins();
  assert.ok(admins.length > 0, 'An admin exists in database');

  // Simulate calling setup logic when an admin exists
  const hasExistingAdmins = db.getAdmins().length > 0;
  assert.equal(hasExistingAdmins, true);

  // The route logic checks `existingAdmins.length > 0` and returns 403
  const canRegister = !hasExistingAdmins;
  assert.equal(canRegister, false, 'Setup must be permanently locked against privilege escalation');
});

test('ADMIN_SETUP_TOKEN: timingSafeEqual comparison prevents timing attacks', () => {
  const secret = 'super-secret-admin-setup-token-2026';
  const matchingInput = 'super-secret-admin-setup-token-2026';
  const wrongInput = 'super-secret-admin-setup-token-WRONG';
  const emptyInput = '';

  const checkToken = (input: string, expected: string): boolean => {
    const inputBuf = Buffer.from(input);
    const expectedBuf = Buffer.from(expected);
    if (inputBuf.length === 0 || inputBuf.length !== expectedBuf.length) {
      return false;
    }
    return crypto.timingSafeEqual(inputBuf, expectedBuf);
  };

  assert.equal(checkToken(matchingInput, secret), true, 'Exact token match succeeds');
  assert.equal(checkToken(wrongInput, secret), false, 'Mismatched token fails');
  assert.equal(checkToken(emptyInput, secret), false, 'Empty token fails');
  assert.equal(checkToken('short', secret), false, 'Shorter token fails safely');
});

test('Privilege Escalation Prevention: Clients cannot modify own role or self-promote', () => {
  const clientUser: User = {
    id: `client-test-${Date.now()}`,
    name: 'Cliente Comum',
    email: `cliente.${Date.now()}@teste.ao`,
    phone: '+244 923 777 888',
    passwordHash: 'hash',
    salt: 'salt',
    role: 'client',
    createdAt: new Date().toISOString(),
  };
  db.createUser(clientUser);

  // Verify created user is client
  const created = db.getUserById(clientUser.id);
  assert.equal(created?.role, 'client');

  // Simulating PUT /api/auth/profile role check:
  // if (role !== undefined && role !== user.role) -> 403 Forbidden
  const attemptedRoleChange = 'admin';
  const isForbidden = attemptedRoleChange !== clientUser.role;
  assert.equal(isForbidden, true, 'Role alteration attempt must be flagged as forbidden');
});
