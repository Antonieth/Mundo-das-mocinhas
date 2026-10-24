import { createClient, SupabaseClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

let cachedClient: SupabaseClient | null = null;

export const DEFAULT_SUPABASE_URL = 'https://mmrqbjftioyreyjeplee.supabase.co';
export const DEFAULT_SUPABASE_ANON_KEY = 'sb_publishable_dK08ZSYUebWu7Jh3Phdc7A_rqy5NF8E';

export function getSupabaseUrl(): string {
  const url =
    process.env.SUPABASE_URL?.trim() ||
    process.env.URL_SUPABASE?.trim() ||
    process.env.VITE_SUPABASE_URL?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ||
    DEFAULT_SUPABASE_URL;
  return url;
}

export function getSupabaseKey(): string {
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    process.env.SUPABASE_ANON_KEY?.trim() ||
    process.env.VITE_SUPABASE_ANON_KEY?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ||
    process.env.ANON_KEY_SUPABASE?.trim() ||
    process.env.SUPABASE_KEY?.trim() ||
    DEFAULT_SUPABASE_ANON_KEY;
  return key;
}

export function isSupabaseConfigured(): boolean {
  const url =
    process.env.SUPABASE_URL?.trim() ||
    process.env.URL_SUPABASE?.trim() ||
    process.env.VITE_SUPABASE_URL?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();

  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    process.env.SUPABASE_ANON_KEY?.trim() ||
    process.env.VITE_SUPABASE_ANON_KEY?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ||
    process.env.ANON_KEY_SUPABASE?.trim() ||
    process.env.SUPABASE_KEY?.trim();

  return Boolean(
    url &&
    key &&
    url.startsWith('https://') &&
    !url.includes('YOUR_SUPABASE') &&
    !key.includes('YOUR_KEY')
  );
}

export function getSupabaseAdminClient(): SupabaseClient | null {
  const url = getSupabaseUrl();
  const key = getSupabaseKey();

  if (!url || !key || url.includes('YOUR_SUPABASE') || key.includes('YOUR_KEY')) {
    return null;
  }

  if (cachedClient) {
    return cachedClient;
  }

  try {
    cachedClient = createClient(url, key, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
    return cachedClient;
  } catch (err) {
    console.error('Falha ao inicializar cliente Supabase:', err);
    return null;
  }
}

export interface SupabaseHealthCheck {
  isConfigured: boolean;
  connected: boolean;
  supabaseUrl?: string;
  hasServiceRoleKey: boolean;
  hasAnonKey: boolean;
  tablesDetected?: {
    products: boolean;
    orders: boolean;
    categories: boolean;
    profiles: boolean;
    shippingCarriers: boolean;
  };
  storageConfigured?: boolean;
  error?: string;
}

export async function testSupabaseConnection(): Promise<SupabaseHealthCheck> {
  const isConfigured = isSupabaseConfigured();
  const url = process.env.SUPABASE_URL?.trim();
  const hasServiceRoleKey = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY?.trim());
  const hasAnonKey = Boolean(process.env.SUPABASE_ANON_KEY?.trim());

  if (!isConfigured) {
    return {
      isConfigured: false,
      connected: false,
      supabaseUrl: url || undefined,
      hasServiceRoleKey,
      hasAnonKey,
      error: 'Variáveis SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY (ou SUPABASE_ANON_KEY) não configuradas.',
    };
  }

  const client = getSupabaseAdminClient();
  if (!client) {
    return {
      isConfigured: true,
      connected: false,
      supabaseUrl: url,
      hasServiceRoleKey,
      hasAnonKey,
      error: 'Não foi possível instanciar o cliente Supabase.',
    };
  }

  try {
    // 1. Check database connectivity by querying products table
    const { count: productCount, error: prodErr } = await client
      .from('products')
      .select('*', { count: 'exact', head: true });

    // 2. Check orders table
    const { error: orderErr } = await client
      .from('orders')
      .select('*', { count: 'exact', head: true });

    // 3. Check categories table
    const { error: catErr } = await client
      .from('categories')
      .select('*', { count: 'exact', head: true });

    // 4. Check profiles table
    const { error: profErr } = await client
      .from('profiles')
      .select('*', { count: 'exact', head: true });

    // 5. Check shipping_carriers table
    const { error: carrierErr } = await client
      .from('shipping_carriers')
      .select('*', { count: 'exact', head: true });

    // 6. Check storage bucket
    let storageConfigured = false;
    try {
      const { data: buckets } = await client.storage.listBuckets();
      storageConfigured = Boolean(buckets?.some((b) => b.name === 'payment_receipts'));
    } catch {
      storageConfigured = false;
    }

    const connected = !prodErr;

    return {
      isConfigured: true,
      connected,
      supabaseUrl: url,
      hasServiceRoleKey,
      hasAnonKey,
      tablesDetected: {
        products: !prodErr,
        orders: !orderErr,
        categories: !catErr,
        profiles: !profErr,
        shippingCarriers: !carrierErr,
      },
      storageConfigured,
      error: prodErr ? prodErr.message : undefined,
    };
  } catch (err: any) {
    return {
      isConfigured: true,
      connected: false,
      supabaseUrl: url,
      hasServiceRoleKey,
      hasAnonKey,
      error: err.message || 'Erro inesperado ao conectar ao Supabase.',
    };
  }
}

/**
 * Uploads a payment receipt to the private 'payment_receipts' bucket in Supabase Storage.
 * Generates a signed URL with configurable expiration (default 48 hours for admin review).
 */
export async function uploadReceiptToSupabase(
  buffer: Buffer,
  destinationPath: string,
  contentType: string
): Promise<{ success: boolean; storagePath?: string; signedUrl?: string; error?: string }> {
  const client = getSupabaseAdminClient();
  if (!client) {
    return { success: false, error: 'Supabase não está configurado.' };
  }

  try {
    const { error: uploadError } = await client.storage
      .from('payment_receipts')
      .upload(destinationPath, buffer, {
        contentType,
        upsert: true,
      });

    if (uploadError) {
      return { success: false, error: uploadError.message };
    }

    // Generate signed URL (48 hours = 172800 seconds) for private viewing
    const { data: signedData, error: signError } = await client.storage
      .from('payment_receipts')
      .createSignedUrl(destinationPath, 172800);

    return {
      success: true,
      storagePath: destinationPath,
      signedUrl: signedData?.signedUrl,
      error: signError?.message,
    };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
