#!/usr/bin/env node
/**
 * Script de Reconhecimento e Configuração de Administrador
 * Marca: O Mundo das Mocinhas
 * 
 * Este script garante que o e-mail de administrador (admin@gmai.com ou admin@gmail.com)
 * seja reconhecido oficialmente pela plataforma com a função 'admin' e credenciais seguras.
 * 
 * Execução:
 *   npm run admin:recognize
 *   npx tsx scripts/recognize-admin.ts
 *   npx tsx scripts/recognize-admin.ts --password="NovaPasswordForte123"
 *   npx tsx scripts/recognize-admin.ts --email="admin@gmai.com" --password="Password123"
 */

import { db, hashPassword, User } from '../src/server/db.js';
import { isDesignatedAdminEmail, DESIGNATED_ADMIN_EMAILS } from '../src/server/auth.js';
import crypto from 'node:crypto';

function parseArgs() {
  const args = process.argv.slice(2);
  const parsed: Record<string, string> = {};

  for (const arg of args) {
    if (arg.startsWith('--')) {
      const [key, ...rest] = arg.slice(2).split('=');
      parsed[key] = rest.join('=');
    }
  }

  return parsed;
}

async function run() {
  const args = parseArgs();
  const targetEmail = (args.email || 'admin@gmai.com').trim().toLowerCase();
  const customPassword = args.password || args['new-password'] || process.env.ADMIN_PASSWORD;
  const adminName = args.name || 'Administradora Oficial';
  const adminPhone = args.phone || '+244 923 000 000';

  console.log('===============================================================');
  console.log('💎 O MUNDO DAS MOCINHAS — RECONHECIMENTO DE ADMINISTRADOR');
  console.log('===============================================================');
  console.log(`🔍 A verificar reconhecimento do e-mail: ${targetEmail}`);

  const isRecognizedDesignation = isDesignatedAdminEmail(targetEmail);
  if (!isRecognizedDesignation) {
    console.warn(`⚠️ Aviso: O e-mail "${targetEmail}" não está na lista padrão de e-mails de administração.`);
    console.warn(`   Lista reconhecida: ${DESIGNATED_ADMIN_EMAILS.join(', ')}`);
  }

  const existingUser = db.getUserByEmail(targetEmail);

  if (existingUser) {
    console.log(`\n📌 Utilizador existente encontrado:`);
    console.log(`   • ID: ${existingUser.id}`);
    console.log(`   • Nome: ${existingUser.name}`);
    console.log(`   • E-mail: ${existingUser.email}`);
    console.log(`   • Telefone: ${existingUser.phone}`);
    console.log(`   • Função Actual: ${existingUser.role.toUpperCase()}`);

    const updates: Partial<User> = {};
    let changesMade = false;

    // Elevate / Confirm role
    if (existingUser.role !== 'admin') {
      updates.role = 'admin';
      changesMade = true;
      console.log(`   ✨ A promover conta para a função: ADMIN`);
    } else {
      console.log(`   ✅ Função de ADMINISTRADOR já se encontra activa.`);
    }

    // Optional password reset
    if (customPassword) {
      if (customPassword.length < 8) {
        console.error('❌ Erro: A nova palavra-passe deve ter no mínimo 8 caracteres.');
        process.exit(1);
      }
      const { hash, salt } = hashPassword(customPassword);
      updates.passwordHash = hash;
      updates.salt = salt;
      changesMade = true;
      console.log(`   🔑 Palavra-passe actualizada com algoritmo criptográfico scrypt + salt.`);
    }

    if (changesMade) {
      db.updateUser(existingUser.id, updates);
      console.log(`\n✅ Sucesso: Registo de administrador actualizado na base de dados!`);
    } else {
      console.log(`\n✅ O utilizador "${targetEmail}" já está 100% reconhecido e pronto no sistema.`);
    }
  } else {
    // User does not exist, create new administrator
    const passwordToUse = customPassword || 'AdminMocinhas2026!';
    if (passwordToUse.length < 8) {
      console.error('❌ Erro: A palavra-passe deve ter pelo menos 8 caracteres.');
      process.exit(1);
    }

    const { hash, salt } = hashPassword(passwordToUse);
    const newAdmin: User = {
      id: `user-admin-${crypto.randomUUID()}`,
      name: adminName,
      phone: adminPhone,
      email: targetEmail,
      passwordHash: hash,
      salt,
      role: 'admin',
      createdAt: new Date().toISOString(),
    };

    db.createUser(newAdmin);
    console.log(`\n✅ Conta de Administrador criada com sucesso!`);
    console.log(`   • Nome: ${newAdmin.name}`);
    console.log(`   • E-mail: ${newAdmin.email}`);
    console.log(`   • Função: ${newAdmin.role.toUpperCase()}`);
    console.log(`   • Palavra-passe configurada: ${customPassword ? '(Definida pelo utilizador)' : 'AdminMocinhas2026!'}`);
    if (!customPassword) {
      console.log(`   💡 Dica: Pode alterar a palavra-passe quando quiser executando:`);
      console.log(`      npx tsx scripts/recognize-admin.ts --password="SuaPalavraPasse"`);
    }
  }

  console.log('\n---------------------------------------------------------------');
  console.log('📋 ADMINISTRADORES RECONHECIDOS NA PLATAFORMA:');
  const allAdmins = db.getAdmins();
  allAdmins.forEach((adm, idx) => {
    console.log(`   ${idx + 1}. ${adm.name} — ${adm.email} [${adm.role}]`);
  });

  console.log('\n🚀 COMO ACEDER AO PAINEL ADMINISTRATIVO:');
  console.log('   1. Abra o navegador no endereço: http://localhost:3000/admin');
  console.log(`   2. Introduza o e-mail: ${targetEmail}`);
  console.log('   3. Introduza a palavra-passe da sua conta');
  console.log('   4. O sistema reconhece automaticamente a permissão de administradora!');
  console.log('===============================================================\n');
}

run().catch((err) => {
  console.error('❌ Erro inesperado ao executar reconhecimento de admin:', err);
  process.exit(1);
});
