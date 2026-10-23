import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { db } from '../src/server/db.js';

interface MigrationReport {
  timestamp: string;
  totalUsers: number;
  adminCount: number;
  admins: Array<{ id: string; name: string; email: string }>;
  isTokenConfigured: boolean;
  setupStatus: 'NEEDS_FIRST_ADMIN' | 'LOCKED_ADMIN_EXISTS';
  recommendedAction: string;
}

export function runAdminCheckMigration(options: { purgeDummy?: boolean } = {}): MigrationReport {
  console.log('='.repeat(70));
  console.log('   MIGRAÇÃO DE VERIFICAÇÃO DE ADMINISTRADORES - O MUNDO DAS MOCINHAS');
  console.log('='.repeat(70));

  const allUsers = db.getUsers();
  let admins = db.getAdmins();

  // If dummy fixture is present and purge requested or only fixture dummy exists:
  const dummyAdmin = admins.find(
    (u) => u.id === 'user-admin' || u.email.toLowerCase() === 'admin@mundodasmocinhas.ao'
  );

  if (dummyAdmin && (options.purgeDummy || process.argv.includes('--purge-dummy') || process.argv.includes('--clean-dummy'))) {
    console.log(`[LIMPEZA] A remover administrador fictício de demonstração: ${dummyAdmin.email} (${dummyAdmin.id})`);
    db.deleteUser(dummyAdmin.id);
    admins = db.getAdmins();
  }

  const tokenConfigured = Boolean(
    process.env.ADMIN_SETUP_TOKEN?.trim() || process.env.ADMIN_SETUP_SECRET?.trim()
  );

  const report: MigrationReport = {
    timestamp: new Date().toISOString(),
    totalUsers: db.getUsers().length,
    adminCount: admins.length,
    admins: admins.map((a) => ({ id: a.id, name: a.name, email: a.email })),
    isTokenConfigured: tokenConfigured,
    setupStatus: admins.length === 0 ? 'NEEDS_FIRST_ADMIN' : 'LOCKED_ADMIN_EXISTS',
    recommendedAction: '',
  };

  console.log(`\n[ESTATÍSTICAS DA BASE DE DADOS]`);
  console.log(`- Total de utilizadores registados: ${report.totalUsers}`);
  console.log(`- Total de administradores encontrados: ${report.adminCount}`);
  console.log(`- Token de configuração (ADMIN_SETUP_TOKEN): ${tokenConfigured ? 'CONFIGURADO NO SERVIDOR' : 'NÃO CONFIGURADO (.env)'}`);

  if (report.adminCount === 0) {
    console.log('\n[STATUS: NENHUM ADMINISTRADOR ENCONTRADO]');
    console.log('O sistema NÃO possui nenhum administrador activo na base de dados.');
    console.log('\n[SEGURANÇA: MODO DE REGISTO DO PRIMEIRO ADMINISTRADOR ACTIVADO]');
    console.log('1. O endpoint seguro POST /api/admin/setup-first-admin está disponível.');
    console.log('2. O registo exige obrigatoriamente o token ADMIN_SETUP_TOKEN.');
    console.log('3. Assim que o primeiro administrador for registado, o endpoint é permanentemente BLOQUEADO.');
    console.log('4. Nenhum utilizador comum (role: client) poderá auto-promover-se.');

    if (!tokenConfigured) {
      console.log('\n[ALERTA OBRIGATÓRIO]');
      console.log('Defina a variável ADMIN_SETUP_TOKEN no ficheiro .env antes de executar o registo.');
      console.log('Exemplo no .env:');
      console.log('  ADMIN_SETUP_TOKEN="mocinhas-segredo-admin-2026-super-forte"');
      report.recommendedAction = 'Configure ADMIN_SETUP_TOKEN no ficheiro .env do servidor.';
    } else {
      console.log('\n[PRONTO PARA REGISTO]');
      console.log('Abra /admin no navegador para preencher o formulário ou faça um pedido POST a /api/admin/setup-first-admin.');
      report.recommendedAction = 'Registe a conta do primeiro administrador usando ADMIN_SETUP_TOKEN.';
    }
  } else {
    console.log('\n[STATUS: ADMINISTRADOR EXISTENTE CONFIRMADO]');
    console.log('Administradores activos:');
    admins.forEach((a, idx) => {
      console.log(`  ${idx + 1}. ${a.name} (${a.email}) - ID: ${a.id}`);
    });

    console.log('\n[SEGURANÇA: BLOQUEIO PERMANENTE CONTRA ELEVAÇÃO DE PRIVILÉGIOS]');
    console.log('Como já existe pelo menos um administrador, o registo inicial está BLOQUEADO (403 Forbidden).');
    console.log('Ninguém mais pode usar o endpoint de inicialização.');
    report.recommendedAction = 'Sistema operacional e protegido.';
  }

  console.log('='.repeat(70) + '\n');
  return report;
}

// Execute directly if run as main script
const isMain = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));
if (isMain) {
  runAdminCheckMigration();
}

function fileURLToPath(url: string): string {
  return new URL(url).pathname;
}
