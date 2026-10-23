-- ============================================================================
-- O MUNDO DAS MOCINHAS — ESQUEMA COMPLETO DE BASE DE DADOS (SUPABASE POSTGRESQL)
-- Versão: 1.1.0
-- Inclui: Extensões, Tabelas, Relações, Índices, Funções de Autenticação/Admin,
--         Triggers, RLS (Row Level Security), Bucket de Storage Privado para
--         Comprovativos e Carga Inicial de Dados (Produtos, Preços Kz e Províncias).
-- ============================================================================

-- 1. EXTENSÕES
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- 2. TABELAS PRINCIPAIS
-- ============================================================================

-- 2.1 TABELA: profiles (Perfis de utilizadores ligados ao Supabase Auth)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL CHECK (role IN ('client', 'admin')) DEFAULT 'client',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índice único condicional para telefone
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_phone ON public.profiles(phone) WHERE phone IS NOT NULL AND phone <> '';

-- 2.2 TABELA: categories (Categorias da loja)
CREATE TABLE IF NOT EXISTS public.categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  icon TEXT,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2.3 TABELA: products (Produtos com preços em Kwanzas e controlo de stock)
CREATE TABLE IF NOT EXISTS public.products (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  price NUMERIC(12, 2) NOT NULL CHECK (price >= 0),
  stock INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_featured BOOLEAN NOT NULL DEFAULT false,
  badge TEXT,
  images TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2.4 TABELA: shipping_carriers (Transportadoras parceiras em Angola)
CREATE TABLE IF NOT EXISTS public.shipping_carriers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  is_custom_carrier BOOLEAN NOT NULL DEFAULT false,
  note TEXT,
  contact TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2.5 TABELA: shipping_destinations (Taxas de envio base por Província de Angola)
CREATE TABLE IF NOT EXISTS public.shipping_destinations (
  province TEXT PRIMARY KEY,
  baseline_fee NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (baseline_fee >= 0),
  estimated_days TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  municipalities TEXT[] NOT NULL DEFAULT '{}'
);

-- 2.6 TABELA: store_payment_settings (Configuração das contas bancárias da loja)
CREATE TABLE IF NOT EXISTS public.store_payment_settings (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  bank_name TEXT NOT NULL,
  account_holder TEXT NOT NULL,
  iban TEXT NOT NULL,
  multicaixa_express_phone TEXT NOT NULL,
  payment_instructions TEXT,
  notice TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2.7 TABELA: orders (Encomendas com província, transportadora e comprovativo)
CREATE TABLE IF NOT EXISTS public.orders (
  id TEXT PRIMARY KEY,
  order_number TEXT NOT NULL UNIQUE,
  customer_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  destination_province TEXT NOT NULL,
  destination_municipality TEXT,
  carrier_id TEXT NOT NULL,
  carrier_name TEXT NOT NULL,
  custom_carrier_name TEXT,
  carrier_tracking_code TEXT,
  pickup_instructions TEXT,
  subtotal NUMERIC(12, 2) NOT NULL CHECK (subtotal >= 0),
  shipping_fee NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (shipping_fee >= 0),
  total NUMERIC(12, 2) NOT NULL CHECK (total >= 0),
  status TEXT NOT NULL DEFAULT 'aguardando_pagamento',
  payment_status TEXT NOT NULL DEFAULT 'pendente',
  payment_method TEXT NOT NULL DEFAULT 'Transferência Bancária / Multicaixa Express',
  receipt_storage_path TEXT,
  receipt_filename TEXT,
  receipt_mime_type TEXT,
  receipt_uploaded_at TIMESTAMPTZ,
  receipt_rejection_reason TEXT,
  admin_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2.8 TABELA: order_items (Itens de cada encomenda com preço histórico congelado)
CREATE TABLE IF NOT EXISTS public.order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id TEXT NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL,
  name TEXT NOT NULL,
  price NUMERIC(12, 2) NOT NULL CHECK (price >= 0),
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  subtotal NUMERIC(12, 2) NOT NULL CHECK (subtotal >= 0),
  image TEXT
);

-- 2.9 TABELA: order_status_history (Linha do tempo e auditoria de estados)
CREATE TABLE IF NOT EXISTS public.order_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id TEXT NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  updated_by TEXT NOT NULL DEFAULT 'Sistema',
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- 3. ÍNDICES DE DESEMPENHO
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_products_category ON public.products(category);
CREATE INDEX IF NOT EXISTS idx_products_is_active ON public.products(is_active);
CREATE INDEX IF NOT EXISTS idx_products_is_featured ON public.products(is_featured);
CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON public.orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_order_number ON public.orders(order_number);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON public.orders(payment_status);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON public.order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_status_history_order_id ON public.order_status_history(order_id);

-- ============================================================================
-- 4. FUNÇÕES DE AUTENTICAÇÃO E RECONHECIMENTO DE ADMINISTRADOR
-- ============================================================================

-- 4.1 Verifica se o utilizador autenticado tem papel de administrador
CREATE OR REPLACE FUNCTION public.is_admin(user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = user_id AND role = 'admin'
  );
$$;

-- 4.2 Trigger para criar perfil automaticamente aquando do registo no Supabase Auth
-- RECONHECE AUTOMATICAMENTE admin@gmai.com, admin@gmail.com e antoniethantonio@gmail.com
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  assigned_role TEXT;
  clean_email TEXT;
BEGIN
  clean_email := LOWER(TRIM(NEW.email));
  
  -- Reconhecimento directo do e-mail de administrador
  IF clean_email IN ('admin@gmai.com', 'admin@gmail.com', 'antoniethantonio@gmail.com') THEN
    assigned_role := 'admin';
  ELSE
    assigned_role := COALESCE(NEW.raw_user_meta_data->>'role', 'client');
  END IF;

  INSERT INTO public.profiles (id, name, phone, email, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', 'Utilizador Mocinhas'),
    NULLIF(TRIM(COALESCE(NEW.raw_user_meta_data->>'phone', '')), ''),
    NEW.email,
    assigned_role
  )
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    phone = COALESCE(EXCLUDED.phone, profiles.phone),
    email = EXCLUDED.email,
    role = CASE 
      WHEN LOWER(TRIM(EXCLUDED.email)) IN ('admin@gmai.com', 'admin@gmail.com', 'antoniethantonio@gmail.com') THEN 'admin'
      ELSE profiles.role
    END,
    updated_at = now();

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- 5. ROW LEVEL SECURITY (RLS) — SEGURANÇA E PROTECÇÃO DE DADOS
-- ============================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shipping_carriers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shipping_destinations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_payment_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_status_history ENABLE ROW LEVEL SECURITY;

-- 5.1 Políticas para PROFILES
DROP POLICY IF EXISTS "Utilizadores podem ver o próprio perfil" ON public.profiles;
CREATE POLICY "Utilizadores podem ver o próprio perfil"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Utilizadores podem actualizar o próprio perfil (excepto role)" ON public.profiles;
CREATE POLICY "Utilizadores podem actualizar o próprio perfil (excepto role)"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id OR public.is_admin(auth.uid()))
  WITH CHECK (
    public.is_admin(auth.uid()) OR (
      auth.uid() = id AND role = (SELECT p.role FROM public.profiles p WHERE p.id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Administradores gerem todos os perfis" ON public.profiles;
CREATE POLICY "Administradores gerem todos os perfis"
  ON public.profiles FOR ALL
  USING (public.is_admin(auth.uid()));

-- 5.2 Políticas para CATEGORIES e PRODUCTS
DROP POLICY IF EXISTS "Público pode ver categorias activas" ON public.categories;
CREATE POLICY "Público pode ver categorias activas"
  ON public.categories FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Apenas administradores gerem categorias" ON public.categories;
CREATE POLICY "Apenas administradores gerem categorias"
  ON public.categories FOR ALL
  USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Clientes e visitantes vêem produtos activos" ON public.products;
CREATE POLICY "Clientes e visitantes vêem produtos activos"
  ON public.products FOR SELECT
  USING (is_active = true OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Apenas administradores gerem produtos" ON public.products;
CREATE POLICY "Apenas administradores gerem produtos"
  ON public.products FOR ALL
  USING (public.is_admin(auth.uid()));

-- 5.3 Políticas para TRANSPORTADORAS, DESTINOS E CONTAS
DROP POLICY IF EXISTS "Público pode ver transportadoras" ON public.shipping_carriers;
CREATE POLICY "Público pode ver transportadoras"
  ON public.shipping_carriers FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Apenas administradores gerem transportadoras" ON public.shipping_carriers;
CREATE POLICY "Apenas administradores gerem transportadoras"
  ON public.shipping_carriers FOR ALL
  USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Público pode ver taxas de províncias" ON public.shipping_destinations;
CREATE POLICY "Público pode ver taxas de províncias"
  ON public.shipping_destinations FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Apenas administradores gerem taxas de províncias" ON public.shipping_destinations;
CREATE POLICY "Apenas administradores gerem taxas de províncias"
  ON public.shipping_destinations FOR ALL
  USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Público pode consultar dados de pagamento da loja" ON public.store_payment_settings;
CREATE POLICY "Público pode consultar dados de pagamento da loja"
  ON public.store_payment_settings FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Apenas administradores editam dados de pagamento" ON public.store_payment_settings;
CREATE POLICY "Apenas administradores editam dados de pagamento"
  ON public.store_payment_settings FOR ALL
  USING (public.is_admin(auth.uid()));

-- 5.4 Políticas para ORDERS (Isolamento de Encomendas dos Clientes)
DROP POLICY IF EXISTS "Clientes vêem apenas as suas próprias encomendas" ON public.orders;
CREATE POLICY "Clientes vêem apenas as suas próprias encomendas"
  ON public.orders FOR SELECT
  USING (auth.uid() = customer_id OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Clientes autenticados podem criar encomendas" ON public.orders;
CREATE POLICY "Clientes autenticados podem criar encomendas"
  ON public.orders FOR INSERT
  WITH CHECK (auth.uid() = customer_id OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Clientes podem actualizar comprovativo da sua encomenda" ON public.orders;
CREATE POLICY "Clientes podem actualizar comprovativo da sua encomenda"
  ON public.orders FOR UPDATE
  USING (auth.uid() = customer_id OR public.is_admin(auth.uid()))
  WITH CHECK (
    public.is_admin(auth.uid()) OR (
      auth.uid() = customer_id AND
      status IN ('comprovativo_enviado', 'aguardando_pagamento')
    )
  );

DROP POLICY IF EXISTS "Administradores têm controlo total sobre encomendas" ON public.orders;
CREATE POLICY "Administradores têm controlo total sobre encomendas"
  ON public.orders FOR ALL
  USING (public.is_admin(auth.uid()));

-- 5.5 Políticas para ORDER_ITEMS
DROP POLICY IF EXISTS "Clientes vêem itens apenas das suas encomendas" ON public.order_items;
CREATE POLICY "Clientes vêem itens apenas das suas encomendas"
  ON public.order_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.orders
      WHERE orders.id = order_items.order_id
        AND (orders.customer_id = auth.uid() OR public.is_admin(auth.uid()))
    )
  );

DROP POLICY IF EXISTS "Inserção de itens de encomenda autorizada" ON public.order_items;
CREATE POLICY "Inserção de itens de encomenda autorizada"
  ON public.order_items FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.orders
      WHERE orders.id = order_items.order_id
        AND (orders.customer_id = auth.uid() OR public.is_admin(auth.uid()))
    )
  );

-- 5.6 Políticas para ORDER_STATUS_HISTORY
DROP POLICY IF EXISTS "Clientes vêem histórico apenas das suas encomendas" ON public.order_status_history;
CREATE POLICY "Clientes vêem histórico apenas das suas encomendas"
  ON public.order_status_history FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.orders
      WHERE orders.id = order_status_history.order_id
        AND (orders.customer_id = auth.uid() OR public.is_admin(auth.uid()))
    )
  );

DROP POLICY IF EXISTS "Inserção de histórico de encomenda" ON public.order_status_history;
CREATE POLICY "Inserção de histórico de encomenda"
  ON public.order_status_history FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- ============================================================================
-- 6. BUCKET DE STORAGE PRIVADO PARA COMPROVATIVOS DE PAGAMENTO
-- ============================================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'payment_receipts',
  'payment_receipts',
  false,
  10485760, -- Limite de 10 MB
  ARRAY['image/png', 'image/jpeg', 'image/webp', 'application/pdf']
)
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY['image/png', 'image/jpeg', 'image/webp', 'application/pdf'];

-- Políticas de Storage RLS para 'payment_receipts'
DROP POLICY IF EXISTS "Clientes podem fazer upload dos seus comprovativos" ON storage.objects;
CREATE POLICY "Clientes podem fazer upload dos seus comprovativos"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'payment_receipts' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Clientes podem ver os seus próprios comprovativos" ON storage.objects;
CREATE POLICY "Clientes podem ver os seus próprios comprovativos"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'payment_receipts' AND
    (
      (storage.foldername(name))[1] = auth.uid()::text
      OR public.is_admin(auth.uid())
    )
  );

DROP POLICY IF EXISTS "Administradores gerem todos os ficheiros de comprovativo" ON storage.objects;
CREATE POLICY "Administradores gerem todos os ficheiros de comprovativo"
  ON storage.objects FOR ALL
  TO authenticated
  USING (
    bucket_id = 'payment_receipts' AND
    public.is_admin(auth.uid())
  );

-- ============================================================================
-- 7. SEED INICIAL (CATEGORIAS, PRODUTOS, TRANSPORTADORAS, PROVÍNCIAS E BANCOS)
-- ============================================================================

-- Categorias
INSERT INTO public.categories (id, name, slug, icon, description) VALUES
  ('cat-maquilhagem', 'Maquilhagem', 'maquilhagem', 'Sparkles', 'Bases, pós, iluminadores, batons e pincéis de qualidade'),
  ('cat-skincare', 'Skincare', 'skincare', 'Smile', 'Cremes, séruns, esfoliantes e cuidados corporais'),
  ('cat-cabelos', 'Cabelos', 'cabelos', 'Scissors', 'Kits capilares, gelatinas e cremes de pentear'),
  ('cat-bolsas', 'Bolsas & Necessaires', 'bolsas', 'ShoppingBag', 'Necessaires metálicas, bolsas transparentes e kits'),
  ('cat-acessorios', 'Acessórios', 'acessorios', 'Gem', 'Copos térmicos, garrafas com brilho e organizadores'),
  ('cat-perfumes', 'Perfumes', 'perfumes', 'Heart', 'Fragrâncias e body mists encantadores'),
  ('cat-moda', 'Moda', 'moda', 'Shirt', 'Roupas e looks elegantes seleccionados'),
  ('cat-calcados', 'Calçados', 'calcados', 'Footprints', 'Calçados elegantes e confortáveis')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  slug = EXCLUDED.slug,
  icon = EXCLUDED.icon,
  description = EXCLUDED.description;

-- Produtos Reais com Preços em Kwanzas (Kz)
INSERT INTO public.products (id, name, slug, description, category, price, stock, is_active, is_featured, badge, images) VALUES
  ('prod-1', 'Kit Completo Rosa Mosqueta Porán', 'kit-completo-rosa-mosqueta-poran', 'Kit de cuidado corporal e facial completo com Rosa Mosqueta Porán: Esfoliante Corporal (240g), Hidratante Intensivo (145g), Sabonete Facial Hidratante, Esfoliante Facial (100g) e Óleo de Rosa Mosqueta (120ml). Regenera, hidrata profundamente e deixa a pele aveludada.', 'Skincare', 17000.00, 24, true, true, 'Mais Vendido', ARRAY['/assets/aistudio/Captura_de_ecr__2026-10-23_001512_5162332e.png']),
  ('prod-2', 'Paleta de Iluminador Colorfish Colour Spell 6 Pcs', 'paleta-iluminador-colorfish-colour-spell', 'Paleta de iluminadores e blush em estojo luxuoso dourado com 6 tons radiantes para todos os tipos de pele. Alta pigmentação e brilho sofisticado.', 'Maquilhagem', 2500.00, 35, true, true, 'Destaque', ARRAY['/assets/aistudio/Captura_de_ecr__2026-10-23_002021_5405007b.png']),
  ('prod-3', 'Kit Capilar Skala Expert #MaisCrespinhos & #MaisCachinhos', 'kit-skala-expert-mais-crespinhos-mais-cachinhos', 'Combo especial Skala Expert com Shampoo e Condicionador formulado para cabelos crespos e crespíssimos. Brilho, nutrição e desembaraço suave com fórmula 100% vegana.', 'Cabelos', 5500.00, 18, true, true, 'Favorito Crespas', ARRAY['/assets/aistudio/Captura_de_ecr__2026-10-23_001143_43bf35ec.png']),
  ('prod-4', 'Sérum Corporal Dove Pró-Ceramidas / Niacinamida 380ml', 'serum-corporal-dove-pro-ceramidas-380ml', 'Sérum corporal de alta tecnologia dermatológica Dove: Pró-Ceramidas e Niacinamida Uniformizador. Hidratação profunda 48h.', 'Skincare', 16500.00, 12, true, true, 'Tratamento Avançado', ARRAY['/assets/aistudio/Captura_de_ecr__2026-10-23_001545_b13d1f77.png']),
  ('prod-5', 'Kit Banho Muriel Umidiliz Baby Relaxante', 'kit-banho-muriel-umidiliz-baby', 'Kit infantil Muriel Umidiliz Baby Hora do Banho com sabonete glicerinado cremoso e condicionador suave.', 'Skincare', 5500.00, 15, true, false, NULL, ARRAY['/assets/aistudio/Captura_de_ecr__2026-10-23_001159_bebc35ac.png']),
  ('prod-6', 'Gelatina Capilar Skala Frutástica (Uva, Melancia ou Maracujá)', 'gelatina-capilar-skala-frutastica', 'Gelatina capilar liberada Skala Frutástica com 72h de definição e protecção térmica.', 'Cabelos', 5500.00, 40, true, true, NULL, ARRAY['/assets/aistudio/Captura_de_ecr__2026-10-23_001316_6b233a24.png']),
  ('prod-7', 'Desodorizante em Creme Herbíssimo Variados 55g', 'desodorizante-creme-herbissimo-variados', 'Desodorizante antitranspirante em creme Herbíssimo com fórmula suave e protecção prolongada.', 'Skincare', 2800.00, 50, true, false, NULL, ARRAY['/assets/aistudio/Captura_de_ecr__2026-10-23_001235_f3d9ee87.png']),
  ('prod-8', 'Base Líquida Kiko Make Up Full Coverage 2-in-1', 'base-liquida-kiko-full-coverage-2-in-1', 'Base e corretor 2-em-1 de alta cobertura com acabamento impecável acetinado.', 'Maquilhagem', 3500.00, 22, true, true, 'Alta Cobertura', ARRAY['/assets/aistudio/Captura_de_ecr__2026-10-23_001512_5162332e.png']),
  ('prod-9', 'Base Colour Director Skin High Coverage Matte', 'base-colour-director-skin-high-coverage', 'Base com acabamento matte aveludado da Colour Director.', 'Maquilhagem', 2500.00, 28, true, false, NULL, ARRAY['/assets/aistudio/Captura_de_ecr__2026-10-23_001545_b13d1f77.png']),
  ('prod-10', 'Fixador de Maquilhagem Micolor Setting Spray', 'fixador-maquilhagem-micolor-setting-spray', 'Spray fixador refrescante Micolor com aroma floral suave.', 'Maquilhagem', 1500.00, 45, true, false, NULL, ARRAY['/assets/aistudio/Captura_de_ecr__2026-10-23_001618_134ad564.png']),
  ('prod-11', 'Necessaire The Queen''s Secret Metalizada Rosa', 'necessaire-the-queens-secret-metalizada', 'Bolsa necessaire espaçosa com acabamento metalizado espelhado em tom pink vibrante.', 'Bolsas & Necessaires', 3000.00, 14, true, true, NULL, ARRAY['/assets/aistudio/Captura_de_ecr__2026-10-23_001708_95773561.png']),
  ('prod-12', 'Bolsa Necessaire BG Beautiful Girl Listrada', 'bolsa-necessaire-bg-beautiful-girl', 'Bolsa organizadora com alça superior e padrão listrado clássico rosa e branco.', 'Bolsas & Necessaires', 3500.00, 16, true, true, 'Tendência', ARRAY['/assets/aistudio/Captura_de_ecr__2026-10-23_001749_e134467f.png']),
  ('prod-13', 'Base Sérum Colour Director 24h Matt', 'base-serum-colour-director-24h-matt', 'Base sérum ultra fluida com cobertura natural matte 24 horas.', 'Maquilhagem', 2500.00, 20, true, false, NULL, ARRAY['/assets/aistudio/Captura_de_ecr__2026-10-23_001821_969a682a.png']),
  ('prod-14', 'Copos Térmicos Stitch Edição Especial com Alça', 'copos-termicos-stitch-edicao-especial', 'Copo térmico de aço inoxidável com tampa antivazamento e canudo. Mantém bebidas geladas por 12h.', 'Acessórios', 5500.00, 19, true, true, 'Popular', ARRAY['/assets/aistudio/Captura_de_ecr__2026-10-23_001942_c8fa5d64.png']),
  ('prod-15', 'Copos Térmicos Grandes 40oz (Cores Candy)', 'copos-termicos-grandes-40oz', 'Copo térmico de grande capacidade (1200ml) com alça ergonómica reforçada.', 'Acessórios', 8000.00, 12, true, true, NULL, ARRAY['/assets/aistudio/Captura_de_ecr__2026-10-23_002046_21e2a29d.png']),
  ('prod-16', 'Kit Labial LoveLiner + Gloss Franciny Ehlke', 'kit-labial-loveliner-gloss-franciny-ehlke', 'Kit de lábios completo com delineador labial de precisão LoveLiner e gloss volumizador hidratante.', 'Maquilhagem', 4500.00, 25, true, true, 'Oii Mocinhas!', ARRAY['/assets/aistudio/Captura_de_ecr__2026-10-23_002255_d5b341d4.png']),
  ('prod-17', 'Garrafa Térmica com Brilho Strass Luxo', 'garrafa-termica-brilho-strass-luxo', 'Garrafa térmica exclusiva revestida manualmente com cristais de strass brilhantes.', 'Acessórios', 12000.00, 8, true, true, 'Edição Luxo', ARRAY['/assets/aistudio/Captura_de_ecr__2026-10-23_002348_dfbd86d6.png']),
  ('prod-18', 'Kit Bolsa Beauty Transparente + Mini Necessaire Glitter', 'kit-bolsa-beauty-transparente-glitter', 'Conjunto 2-em-1 com bolsa transparente resistente à água e bolsinha brilhante com zíper.', 'Bolsas & Necessaires', 4500.00, 15, true, false, NULL, ARRAY['/assets/aistudio/Captura_de_ecr__2026-10-23_002417_d328ea02.png']),
  ('prod-19', 'Paleta de Sombras Baby Got Peach Pink Key', 'paleta-sombras-baby-got-peach-pink-key', 'Paleta de sombras compacta com 9 tons quentes entre matte e cintilante.', 'Maquilhagem', 1500.00, 32, true, false, NULL, ARRAY['/assets/aistudio/Captura_de_ecr__2026-10-23_002448_20e713d5.png']),
  ('prod-20', 'Kit Presente Oii Mocinhas: Paleta Book + Hand Cream + Lip Mask', 'kit-presente-oii-mocinhas-completo', 'Super combo queridinho: Paleta em formato de livro com iluminadores e sombras, Creme de Mãos Ushas e Lip Mask.', 'Maquilhagem', 6500.00, 18, true, true, 'Super Presente', ARRAY['/assets/aistudio/Captura_de_ecr__2026-10-23_002826_1fb9d21c.png'])
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  slug = EXCLUDED.slug,
  description = EXCLUDED.description,
  category = EXCLUDED.category,
  price = EXCLUDED.price,
  stock = EXCLUDED.stock,
  is_active = EXCLUDED.is_active,
  is_featured = EXCLUDED.is_featured,
  badge = EXCLUDED.badge,
  images = EXCLUDED.images,
  updated_at = now();

-- Transportadoras Oficiais em Angola
INSERT INTO public.shipping_carriers (id, name, active, is_custom_carrier, note, contact) VALUES
  ('carrier-real-express', 'Real Express', true, false, 'Entregas regulares nas principais capitais de província', '+244 923 000 111'),
  ('carrier-macon', 'Macon', true, false, 'Rede nacional com terminais de encomendas em todo o país', '+244 923 000 222'),
  ('carrier-huambo-express', 'Huambo Express', true, false, 'Especialista na rota Luanda - Benguela - Huambo - Huíla', '+244 923 000 333'),
  ('carrier-rosalina-express', 'Rosalina Express', true, false, 'Serviço rápido de encomendas interprovinciais', '+244 923 000 444'),
  ('carrier-other', 'Outra transportadora', true, true, 'Indique a transportadora da sua preferência no checkout', NULL)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  active = EXCLUDED.active,
  is_custom_carrier = EXCLUDED.is_custom_carrier,
  note = EXCLUDED.note,
  contact = EXCLUDED.contact;

-- Províncias de Angola e Taxas Base de Envio
INSERT INTO public.shipping_destinations (province, baseline_fee, estimated_days, active, municipalities) VALUES
  ('Luanda', 2000.00, '1 a 2 dias úteis', true, ARRAY['Luanda', 'Belas', 'Cazenga', 'Cacuaco', 'Viana', 'Talatona', 'Kilamba Kiaxi', 'Icolo e Bengo', 'Quiçama']),
  ('Benguela', 3500.00, '2 a 4 dias úteis', true, ARRAY['Benguela', 'Lobito', 'Baía Farta', 'Catumbela', 'Ganda']),
  ('Huambo', 3500.00, '2 a 4 dias úteis', true, ARRAY['Huambo', 'Caála', 'Bailundo', 'Ekunha']),
  ('Huíla', 3500.00, '3 a 5 dias úteis', true, ARRAY['Lubango', 'Chibia', 'Matala', 'Humpata']),
  ('Cabinda', 4500.00, '3 a 5 dias úteis', true, ARRAY['Cabinda', 'Cacongo', 'Buco-Zau', 'Belize']),
  ('Namibe', 4000.00, '3 a 5 dias úteis', true, ARRAY['Moçâmedes', 'Tômbwa', 'Bibala', 'Virei']),
  ('Bié', 4000.00, '3 a 5 dias úteis', true, ARRAY['Cuíto', 'Andulo', 'Camacupa', 'Catabola']),
  ('Cuanza Sul', 3500.00, '2 a 4 dias úteis', true, ARRAY['Sumbe', 'Porto Amboim', 'Gabela', 'Libolo']),
  ('Cuanza Norte', 3500.00, '2 a 4 dias úteis', true, ARRAY['N''dalatando', 'Cambambe', 'Golungo Alto']),
  ('Malanje', 4000.00, '2 a 4 dias úteis', true, ARRAY['Malanje', 'Calandula', 'Cacuso', 'Cangandala']),
  ('Uíge', 4000.00, '2 a 4 dias úteis', true, ARRAY['Uíge', 'Negage', 'Sanza Pombo', 'Damba']),
  ('Zaire', 4500.00, '3 a 5 dias úteis', true, ARRAY['M''banza Kongo', 'Soyo', 'Nzeto', 'Noqui']),
  ('Lunda Norte', 5000.00, '4 a 6 dias úteis', true, ARRAY['Dundo', 'Chitato', 'Cambulo', 'Lucapa']),
  ('Lunda Sul', 5000.00, '4 a 6 dias úteis', true, ARRAY['Saurimo', 'Muconda', 'Dala', 'Cacolo']),
  ('Moxico', 5000.00, '4 a 6 dias úteis', true, ARRAY['Luena', 'Camanongue', 'Léua', 'Cameia']),
  ('Cuando Cubango', 5500.00, '4 a 7 dias úteis', true, ARRAY['Menongue', 'Cuito Cuanavale', 'Cuchi']),
  ('Cunene', 4500.00, '4 a 6 dias úteis', true, ARRAY['Ondjiva', 'Cuanhama', 'Ombadja', 'Namacunde']),
  ('Bengo', 2500.00, '1 a 2 dias úteis', true, ARRAY['Caxito', 'Dande', 'Ambriz', 'Nambuangongo'])
ON CONFLICT (province) DO UPDATE SET
  baseline_fee = EXCLUDED.baseline_fee,
  estimated_days = EXCLUDED.estimated_days,
  active = EXCLUDED.active,
  municipalities = EXCLUDED.municipalities;

-- Dados Bancários e Multicaixa Express de O Mundo das Mocinhas
INSERT INTO public.store_payment_settings (id, bank_name, account_holder, iban, multicaixa_express_phone, payment_instructions, notice)
VALUES (
  1,
  'Banco BAI / BFA / Banco Sol',
  'O Mundo das Mocinhas (Configuração da Loja)',
  'AO06.0040.0000.1234.5678.9012.3',
  '+244 923 888 777',
  'Efectue a transferência bancária por Multicaixa Express ou no ATM/Internet Banking utilizando os dados acima. De seguida, tire uma foto ou salve o comprovativo em PDF e anexe nesta página para validação imediata da sua encomenda.',
  'O comprovativo será conferido pela administração antes do envio. Não são aceites comprovativos rasurados ou falsificados.'
)
ON CONFLICT (id) DO UPDATE SET
  bank_name = EXCLUDED.bank_name,
  account_holder = EXCLUDED.account_holder,
  iban = EXCLUDED.iban,
  multicaixa_express_phone = EXCLUDED.multicaixa_express_phone,
  payment_instructions = EXCLUDED.payment_instructions,
  notice = EXCLUDED.notice,
  updated_at = now();
