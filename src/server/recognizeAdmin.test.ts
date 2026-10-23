import test from 'node:test';
import assert from 'node:assert/strict';
import { db, hashPassword, verifyPassword, User } from './db.js';
import { isDesignatedAdminEmail, generateToken, verifyToken, DESIGNATED_ADMIN_EMAILS } from './auth.js';

test('Recognized Admin: isDesignatedAdminEmail recognizes admin@gmai.com and aliases', () => {
  assert.equal(isDesignatedAdminEmail('admin@gmai.com'), true, 'admin@gmai.com must be recognized');
  assert.equal(isDesignatedAdminEmail('ADMIN@GMAI.COM'), true, 'Case-insensitive email must be recognized');
  assert.equal(isDesignatedAdminEmail('  admin@gmai.com  '), true, 'Trimmed email must be recognized');
  assert.equal(isDesignatedAdminEmail('admin@gmail.com'), true, 'admin@gmail.com alias must be recognized');
  assert.equal(isDesignatedAdminEmail('cliente@exemplo.ao'), false, 'Normal client email must NOT be recognized');
  assert.equal(isDesignatedAdminEmail(''), false, 'Empty string must return false');
  assert.equal(isDesignatedAdminEmail(undefined), false, 'Undefined must return false');
});

test('Recognized Admin: ensureRecognizedAdmin creates or confirms admin with role admin', () => {
  const result = db.ensureRecognizedAdmin('admin@gmai.com', {
    name: 'Administradora Geral',
    phone: '+244 923 000 000',
    password: 'AdminMocinhas2026!',
  });

  assert.ok(result.user, 'Admin user must exist');
  assert.equal(result.user.email, 'admin@gmai.com');
  assert.equal(result.user.role, 'admin');

  // Verify password hash is verified with verifyPassword
  const isCorrectPassword = verifyPassword('AdminMocinhas2026!', result.user.passwordHash, result.user.salt);
  assert.equal(isCorrectPassword, true, 'Password hash must verify properly with scrypt');

  // Verify wrong password fails
  const isWrongPassword = verifyPassword('wrongpassword', result.user.passwordHash, result.user.salt);
  assert.equal(isWrongPassword, false, 'Wrong password must be rejected');

  // Verify generated token contains role admin
  const token = generateToken(result.user);
  const payload = verifyToken(token);
  assert.ok(payload);
  assert.equal(payload.role, 'admin');
  assert.equal(payload.email, 'admin@gmai.com');
});

test('Recognized Admin: If user previously existed as client, ensureRecognizedAdmin promotes to admin', () => {
  const testEmail = `temp.admin.${Date.now()}@gmai.com`;
  const pass = hashPassword('temp12345');

  // Register as normal client
  const clientUser: User = {
    id: `user-${Date.now()}`,
    name: 'Cliente Teste Promoção',
    email: testEmail,
    phone: '+244 911 222 333',
    passwordHash: pass.hash,
    salt: pass.salt,
    role: 'client',
    createdAt: new Date().toISOString(),
  };
  db.createUser(clientUser);

  // Run ensureRecognizedAdmin on this email
  const updated = db.ensureRecognizedAdmin(testEmail);
  assert.equal(updated.user.role, 'admin', 'Role must be updated to admin');
  assert.equal(updated.updated, true, 'Updated flag must be true');

  const inDb = db.getUserByEmail(testEmail);
  assert.equal(inDb?.role, 'admin');
});
