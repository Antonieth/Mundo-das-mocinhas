#!/usr/bin/env node
/**
 * Script de Configuração e Gestão Segura de Administradores
 * Marca: O Mundo das Mocinhas
 * 
 * Este utilitário de backend permite criar ou promover administradores de forma autorizada,
 * gravando passwords com hash scrypt e salt criptográfico individual, sem expor chaves nem passwords no código.
 * 
 * Uso via terminal:
 *   npx tsx scripts/create-admin.ts --name="Nome Completo" --email="admin@exemplo.ao" --phone="+244 923 000 000" --password="PasswordForte123"
 *   npx tsx scripts/create-admin.ts --promote="cliente@exemplo.ao"
 */

import { db, hashPassword, User } from '../src/server/db.js';
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

  console.log('---------------------------------------------------------');
  console.log('💎 O MUNDO DAS MOCINHAS — GESTÃO SEGURA DE ADMINISTRADORES');
  console.log('---------------------------------------------------------');

  // Option 1: Promote existing customer to administrator
  if (args.promote) {
    const email = args.promote.trim().toLowerCase();
    const existing = db.getUserByEmail(email);

    if (!existing) {
      console.error(`❌ Erro: Utilizador com e-mail "${email}" não foi encontrado na base de dados.`);
      process.exit(1);
    }

    if (existing.role === 'admin') {
      console.log(`ℹ️ O utilizador "${existing.name}" (${existing.email}) já tem a função de Administrador.`);
      process.exit(0);
    }

    db.updateUser(existing.id, { role: 'admin' });
    console.log(`✅ Sucesso: O utilizador "${existing.name}" (${existing.email}) foi promovido a Administrador!`);
    console.log(`👉 Agora pode aceder a /admin com as suas credenciais.`);
    process.exit(0);
  }

  // Option 2: Create or update administrator with custom credentials
  const email = (args.email || '').trim().toLowerCase();
  const password = args.password;
  const name = (args.name || '').trim();
  const phone = (args.phone || '').trim();

  if (!email || !password) {
    console.log('ℹ️ Para criar um administrador forneça os parâmetros:');
    console.log('   npx tsx scripts/create-admin.ts --name="Nome" --email="admin@dominio.ao" --phone="+244..." --password="SuaPassword"');
    console.log('   Ou para promover um cliente existente:');
    console.log('   npx tsx scripts/create-admin.ts --promote="cliente@dominio.ao"');
    console.log('');
    console.log('Actualmente existem os seguintes administradores no sistema:');
    const admins = db.getAdmins();
    if (admins.length === 0) {
      console.log('   (Nenhum administrador registado)');
    } else {
      admins.forEach((a) => console.log(`   • ${a.name} (${a.email}) - ID: ${a.id}`));
    }
    process.exit(0);
  }

  if (password.length < 8) {
    console.error('❌ Erro: A palavra-passe de administrador deve conter pelo menos 8 caracteres.');
    process.exit(1);
  }

  const existing = db.getUserByEmail(email);
  const { hash, salt } = hashPassword(password);

  if (existing) {
    db.updateUser(existing.id, {
      name: name || existing.name,
      phone: phone || existing.phone,
      passwordHash: hash,
      salt,
      role: 'admin',
    });
    console.log(`✅ Sucesso: Conta existente "${existing.email}" actualizada e atribuída a função de Administrador.`);
  } else {
    const newAdmin: User = {
      id: `user-admin-${crypto.randomUUID()}`,
      name: name || 'Administrador Oficial',
      phone: phone || '+244 923 000 000',
      email,
      passwordHash: hash,
      salt,
      role: 'admin',
      createdAt: new Date().toISOString(),
    };
    db.createUser(newAdmin);
    console.log(`✅ Sucesso: Novo Administrador "${newAdmin.name}" (${newAdmin.email}) criado com sucesso!`);
  }

  console.log(`👉 Acesso configurado para a rota /admin.`);
}

run().catch((err) => {
  console.error('Erro ao executar utilitário de administrador:', err);
  process.exit(1);
});
