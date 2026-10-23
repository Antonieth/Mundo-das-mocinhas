import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { OrderStatus, PaymentStatus } from '../utils/orderStatus.js';

export interface User {
  id: string;
  name: string;
  phone: string;
  email: string;
  passwordHash: string;
  salt: string;
  role: 'client' | 'admin';
  createdAt: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  icon?: string;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  description: string;
  category: string;
  price: number;
  stock: number;
  isActive: boolean;
  isFeatured: boolean;
  images: string[];
  badge?: string;
  createdAt: string;
}

export interface OrderItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  subtotal: number;
  image?: string;
}

export interface OrderStatusHistoryItem {
  id: string;
  status: OrderStatus;
  title: string;
  description: string;
  timestamp: string;
  updatedBy: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  destinationProvince: string;
  destinationMunicipality: string;
  carrierId: string;
  carrierName: string;
  customCarrierName?: string;
  carrierTrackingCode?: string;
  pickupInstructions?: string;
  items: OrderItem[];
  subtotal: number;
  shippingFee: number;
  total: number;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  paymentMethod: string;
  receiptData?: string; // base64 or data URL
  receiptFilename?: string;
  receiptMimeType?: string;
  receiptUploadedAt?: string;
  receiptRejectionReason?: string;
  adminNotes?: string;
  statusHistory: OrderStatusHistoryItem[];
  createdAt: string;
  updatedAt: string;
}

export interface ShippingCarrier {
  id: string;
  name: string;
  active: boolean;
  isCustomCarrier?: boolean;
  note: string;
  contact?: string;
}

export interface ShippingDestination {
  province: string;
  baselineFee: number;
  estimatedDays: string;
  active: boolean;
  municipalities: string[];
}

export interface StorePaymentSettings {
  bankName: string;
  accountHolder: string;
  iban: string;
  multicaixaExpressPhone: string;
  paymentInstructions: string;
  notice: string;
}

export interface DatabaseSchema {
  users: User[];
  categories: Category[];
  products: Product[];
  orders: Order[];
  carriers: ShippingCarrier[];
  destinations: ShippingDestination[];
  paymentSettings: StorePaymentSettings;
}

const DB_FILE = path.resolve(process.cwd(), 'data', 'db.json');

export function hashPassword(password: string, salt?: string): { hash: string; salt: string } {
  const generatedSalt = salt || crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, generatedSalt, 64).toString('hex');
  return { hash, salt: generatedSalt };
}

export function verifyPassword(password: string, hash: string, salt: string): boolean {
  const testHash = crypto.scryptSync(password, salt, 64).toString('hex');
  return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(testHash, 'hex'));
}

const INITIAL_CATEGORIES: Category[] = [
  { id: 'cat-maquilhagem', name: 'Maquilhagem', slug: 'maquilhagem', icon: 'Sparkles', description: 'Bases, pós, iluminadores, batons e pincéis de qualidade' },
  { id: 'cat-skincare', name: 'Skincare', slug: 'skincare', icon: 'Smile', description: 'Cremes, séruns, esfoliantes e cuidados corporais' },
  { id: 'cat-cabelos', name: 'Cabelos', slug: 'cabelos', icon: 'Scissors', description: 'Kits capilares, gelatinas e cremes de pentear' },
  { id: 'cat-bolsas', name: 'Bolsas & Necessaires', slug: 'bolsas', icon: 'ShoppingBag', description: 'Necessaires metálicas, bolsas transparentes e kits' },
  { id: 'cat-acessorios', name: 'Acessórios', slug: 'acessorios', icon: 'Gem', description: 'Copos térmicos, garrafas com brilho e organizadores' },
  { id: 'cat-perfumes', name: 'Perfumes', slug: 'perfumes', icon: 'Heart', description: 'Fragrâncias e body mists encantadores' },
  { id: 'cat-moda', name: 'Moda', slug: 'moda', icon: 'Shirt', description: 'Roupas e looks elegantes seleccionados' },
  { id: 'cat-calcados', name: 'Calçados', slug: 'calcados', icon: 'Footprints', description: 'Calçados elegantes e confortáveis' },
];

const INITIAL_PRODUCTS: Product[] = [
  {
    id: 'prod-1',
    name: 'Kit Completo Rosa Mosqueta Porán',
    slug: 'kit-completo-rosa-mosqueta-poran',
    description: 'Kit de cuidado corporal e facial completo com Rosa Mosqueta Porán: Esfoliante Corporal (240g), Hidratante Intensivo (145g), Sabonete Facial Hidratante, Esfoliante Facial (100g) e Óleo de Rosa Mosqueta (120ml). Regenera, hidrata profundamente e deixa a pele aveludada.',
    category: 'Skincare',
    price: 17000,
    stock: 24,
    isActive: true,
    isFeatured: true,
    badge: 'Mais Vendido',
    images: ['/assets/aistudio/Captura_de_ecr__2026-10-23_001512_5162332e.png'],
    createdAt: '2026-10-20T10:00:00Z',
  },
  {
    id: 'prod-2',
    name: 'Paleta de Iluminador Colorfish Colour Spell 6 Pcs',
    slug: 'paleta-iluminador-colorfish-colour-spell',
    description: 'Paleta de iluminadores e blush em estojo luxuoso dourado com 6 tons radiantes para todos os tipos de pele. Alta pigmentação e brilho sofisticado.',
    category: 'Maquilhagem',
    price: 2500,
    stock: 35,
    isActive: true,
    isFeatured: true,
    badge: 'Destaque',
    images: ['/assets/aistudio/Captura_de_ecr__2026-10-23_002021_5405007b.png'],
    createdAt: '2026-10-20T10:00:00Z',
  },
  {
    id: 'prod-3',
    name: 'Kit Capilar Skala Expert #MaisCrespinhos & #MaisCachinhos',
    slug: 'kit-skala-expert-mais-crespinhos-mais-cachinhos',
    description: 'Combo especial Skala Expert com Shampoo e Condicionador formulado para cabelos crespos e crespíssimos. Brilho, nutrição e desembaraço suave com fórmula 100% vegana.',
    category: 'Cabelos',
    price: 5500,
    stock: 18,
    isActive: true,
    isFeatured: true,
    badge: 'Favorito Crespas',
    images: ['/assets/aistudio/Captura_de_ecr__2026-10-23_001143_43bf35ec.png'],
    createdAt: '2026-10-20T10:00:00Z',
  },
  {
    id: 'prod-4',
    name: 'Sérum Corporal Dove Pró-Ceramidas / Niacinamida 380ml',
    slug: 'serum-corporal-dove-pro-ceramidas-380ml',
    description: 'Sérum corporal de alta tecnologia dermatológica Dove: Pró-Ceramidas (Dermo Hidratante regenerativo com colágeno e pantenol) e Niacinamida Uniformizador (reduz manchas e ilumina). Hidratação profunda 48h.',
    category: 'Skincare',
    price: 16500,
    stock: 12,
    isActive: true,
    isFeatured: true,
    badge: 'Tratamento Avançado',
    images: ['/assets/aistudio/Captura_de_ecr__2026-10-23_001545_b13d1f77.png'],
    createdAt: '2026-10-20T10:00:00Z',
  },
  {
    id: 'prod-5',
    name: 'Kit Banho Muriel Umidiliz Baby Relaxante',
    slug: 'kit-banho-muriel-umidiliz-baby',
    description: 'Kit infantil Muriel Umidiliz Baby Hora do Banho com sabonete glicerinado cremoso e condicionador suave. Fórmula delicada testada dermatologicamente para os pequeninos.',
    category: 'Skincare',
    price: 5500,
    stock: 15,
    isActive: true,
    isFeatured: false,
    images: ['/assets/aistudio/Captura_de_ecr__2026-10-23_001159_bebc35ac.png'],
    createdAt: '2026-10-20T10:00:00Z',
  },
  {
    id: 'prod-6',
    name: 'Gelatina Capilar Skala Frutástica (Uva, Melancia ou Maracujá)',
    slug: 'gelatina-capilar-skala-frutastica',
    description: 'Gelatina capilar liberada Skala Frutástica com 72h de definição e protecção térmica. Disponível nas versões Uva (brilho), Melancia (definição extrema) e Maracujá (volume e leveza).',
    category: 'Cabelos',
    price: 5500,
    stock: 40,
    isActive: true,
    isFeatured: true,
    images: ['/assets/aistudio/Captura_de_ecr__2026-10-23_001316_6b233a24.png'],
    createdAt: '2026-10-20T10:00:00Z',
  },
  {
    id: 'prod-7',
    name: 'Desodorizante em Creme Herbíssimo Variados 55g',
    slug: 'desodorizante-creme-herbissimo-variados',
    description: 'Desodorizante antitranspirante em creme Herbíssimo com fórmula suave e protecção prolongada. Várias fragrâncias frescas disponíveis (Lavanda, Neutro, Cedro, etc.).',
    category: 'Skincare',
    price: 2800,
    stock: 50,
    isActive: true,
    isFeatured: false,
    images: ['/assets/aistudio/Captura_de_ecr__2026-10-23_001235_f3d9ee87.png'],
    createdAt: '2026-10-20T10:00:00Z',
  },
  {
    id: 'prod-8',
    name: 'Base Líquida Kiko Make Up Full Coverage 2-in-1',
    slug: 'base-liquida-kiko-full-coverage-2-in-1',
    description: 'Base e corretor 2-em-1 de alta cobertura com acabamento impecável acetinado. Longa duração e disfarce óptico perfeito para eventos e uso diário.',
    category: 'Maquilhagem',
    price: 3500,
    stock: 22,
    isActive: true,
    isFeatured: true,
    badge: 'Alta Cobertura',
    images: ['/assets/aistudio/Captura_de_ecr__2026-10-23_001512_5162332e.png'],
    createdAt: '2026-10-20T10:00:00Z',
  },
  {
    id: 'prod-9',
    name: 'Base Colour Director Skin High Coverage Matte',
    slug: 'base-colour-director-skin-high-coverage',
    description: 'Base com acabamento matte aveludado da Colour Director. Textura leve que constrói camadas e controla a oleosidade durante todo o dia sob o clima de Angola.',
    category: 'Maquilhagem',
    price: 2500,
    stock: 28,
    isActive: true,
    isFeatured: false,
    images: ['/assets/aistudio/Captura_de_ecr__2026-10-23_001545_b13d1f77.png'],
    createdAt: '2026-10-20T10:00:00Z',
  },
  {
    id: 'prod-10',
    name: 'Fixador de Maquilhagem Micolor Setting Spray',
    slug: 'fixador-maquilhagem-micolor-setting-spray',
    description: 'Spray fixador refrescante Micolor com aroma floral suave. Prolonga a duração da maquilhagem sem craquelar nem pesar na pele.',
    category: 'Maquilhagem',
    price: 1500,
    stock: 45,
    isActive: true,
    isFeatured: false,
    images: ['/assets/aistudio/Captura_de_ecr__2026-10-23_001618_134ad564.png'],
    createdAt: '2026-10-20T10:00:00Z',
  },
  {
    id: 'prod-11',
    name: 'Necessaire The Queen\'s Secret Metalizada Rosa',
    slug: 'necessaire-the-queens-secret-metalizada',
    description: 'Bolsa necessaire espaçosa com acabamento metalizado espelhado em tom pink vibrante e zíper dourado reforçado. Perfeita para levar maquiagens e produtos em viagens.',
    category: 'Bolsas & Necessaires',
    price: 3000,
    stock: 14,
    isActive: true,
    isFeatured: true,
    images: ['/assets/aistudio/Captura_de_ecr__2026-10-23_001708_95773561.png'],
    createdAt: '2026-10-20T10:00:00Z',
  },
  {
    id: 'prod-12',
    name: 'Bolsa Necessaire BG Beautiful Girl Listrada',
    slug: 'bolsa-necessaire-bg-beautiful-girl',
    description: 'Bolsa organizadora com alça superior e padrão listrado clássico rosa e branco. Design icónico de mala de viagem com amplo compartimento interno.',
    category: 'Bolsas & Necessaires',
    price: 3500,
    stock: 16,
    isActive: true,
    isFeatured: true,
    badge: 'Tendência',
    images: ['/assets/aistudio/Captura_de_ecr__2026-10-23_001749_e134467f.png'],
    createdAt: '2026-10-20T10:00:00Z',
  },
  {
    id: 'prod-13',
    name: 'Base Sérum Colour Director 24h Matt',
    slug: 'base-serum-colour-director-24h-matt',
    description: 'Base sérum ultra fluida com cobertura natural matte 24 horas. Enriquecida com ativos que tratam a textura da pele enquanto cobrem imperfeições.',
    category: 'Maquilhagem',
    price: 2500,
    stock: 20,
    isActive: true,
    isFeatured: false,
    images: ['/assets/aistudio/Captura_de_ecr__2026-10-23_001821_969a682a.png'],
    createdAt: '2026-10-20T10:00:00Z',
  },
  {
    id: 'prod-14',
    name: 'Copos Térmicos Stitch Edição Especial com Alça',
    slug: 'copos-termicos-stitch-edicao-especial',
    description: 'Copo térmico de aço inoxidável com tampa antivazamento e canudo. Mantém bebidas geladas por até 12h ou quentes por 6h. Estampa divertida do Stitch em várias cores.',
    category: 'Acessórios',
    price: 5500,
    stock: 19,
    isActive: true,
    isFeatured: true,
    badge: 'Popular',
    images: ['/assets/aistudio/Captura_de_ecr__2026-10-23_001942_c8fa5d64.png'],
    createdAt: '2026-10-20T10:00:00Z',
  },
  {
    id: 'prod-15',
    name: 'Copos Térmicos Grandes 40oz (Cores Candy Pastel)',
    slug: 'copos-termicos-grandes-40oz',
    description: 'Copo térmico de grande capacidade (1200ml) com alça ergonómica reforçada e isolamento a vácuo de parede dupla. Cores pastel vibrantes: rosa chiclete, lilás, menta e branco.',
    category: 'Acessórios',
    price: 8000,
    stock: 12,
    isActive: true,
    isFeatured: true,
    images: ['/assets/aistudio/Captura_de_ecr__2026-10-23_002046_21e2a29d.png'],
    createdAt: '2026-10-20T10:00:00Z',
  },
  {
    id: 'prod-16',
    name: 'Kit Labial LoveLiner + Gloss Franciny Ehlke',
    slug: 'kit-labial-loveliner-gloss-franciny-ehlke',
    description: 'Kit de lábios completo com delineador labial de precisão LoveLiner e gloss com efeito volumizador de alta hidratação. O clássico visual bocão das mocinhas!',
    category: 'Maquilhagem',
    price: 4500,
    stock: 25,
    isActive: true,
    isFeatured: true,
    badge: 'Oii Mocinhas!',
    images: ['/assets/aistudio/Captura_de_ecr__2026-10-23_002255_d5b341d4.png'],
    createdAt: '2026-10-20T10:00:00Z',
  },
  {
    id: 'prod-17',
    name: 'Garrafa Térmica com Brilho Strass Luxo Mundo das Mocinhas',
    slug: 'garrafa-termica-brilho-strass-luxo',
    description: 'Garrafa térmica exclusiva revestida manualmente com cristais de strass brilhantes. Sofisticação máxima para acompanhar o seu dia com hidratação gelada e muito charme.',
    category: 'Acessórios',
    price: 12000,
    stock: 8,
    isActive: true,
    isFeatured: true,
    badge: 'Edição Luxo',
    images: ['/assets/aistudio/Captura_de_ecr__2026-10-23_002348_dfbd86d6.png'],
    createdAt: '2026-10-20T10:00:00Z',
  },
  {
    id: 'prod-18',
    name: 'Kit Bolsa Beauty Transparente + Mini Necessaire Glitter',
    slug: 'kit-bolsa-beauty-transparente-glitter',
    description: 'Conjunto 2-em-1 com bolsa transparente resistente à água e bolsinha interna brilhante com zíper. Ideal para organizar cosméticos no trabalho ou viagens.',
    category: 'Bolsas & Necessaires',
    price: 4500,
    stock: 15,
    isActive: true,
    isFeatured: false,
    images: ['/assets/aistudio/Captura_de_ecr__2026-10-23_002417_d328ea02.png'],
    createdAt: '2026-10-20T10:00:00Z',
  },
  {
    id: 'prod-19',
    name: 'Paleta de Sombras Baby Got Peach Pink Key',
    slug: 'paleta-sombras-baby-got-peach-pink-key',
    description: 'Paleta de sombras compacta com 9 tons quentes entre matte e cintilante. Tons pêssego, terra e dourado para makes diurnas e noturnas.',
    category: 'Maquilhagem',
    price: 1500,
    stock: 32,
    isActive: true,
    isFeatured: false,
    images: ['/assets/aistudio/Captura_de_ecr__2026-10-23_002448_20e713d5.png'],
    createdAt: '2026-10-20T10:00:00Z',
  },
  {
    id: 'prod-20',
    name: 'Kit Presente Oii Mocinhas: Paleta Book + Hand Cream + Lip Mask',
    slug: 'kit-presente-oii-mocinhas-completo',
    description: 'Super combo queridinho: Paleta em formato de livro com iluminadores e sombras, Creme de Mãos Ushas perfumado e Fruit Hydrating Lip Mask de Abacate.',
    category: 'Maquilhagem',
    price: 6500,
    stock: 18,
    isActive: true,
    isFeatured: true,
    badge: 'Super Presente',
    images: ['/assets/aistudio/Captura_de_ecr__2026-10-23_002826_1fb9d21c.png'],
    createdAt: '2026-10-20T10:00:00Z',
  },
];

const INITIAL_CARRIERS: ShippingCarrier[] = [
  { id: 'carrier-real-express', name: 'Real Express', active: true, note: 'Entregas regulares nas principais capitais de província', contact: '+244 923 000 111' },
  { id: 'carrier-macon', name: 'Macon', active: true, note: 'Rede nacional com terminais de encomendas em todo o país', contact: '+244 923 000 222' },
  { id: 'carrier-huambo-express', name: 'Huambo Express', active: true, note: 'Especialista na rota Luanda - Benguela - Huambo - Huíla', contact: '+244 923 000 333' },
  { id: 'carrier-rosalina-express', name: 'Rosalina Express', active: true, note: 'Serviço rápido de encomendas interprovinciais', contact: '+244 923 000 444' },
  { id: 'carrier-other', name: 'Outra transportadora', active: true, isCustomCarrier: true, note: 'Indique a transportadora da sua preferência no checkout' },
];

const INITIAL_DESTINATIONS: ShippingDestination[] = [
  { province: 'Luanda', baselineFee: 2000, estimatedDays: '1 a 2 dias úteis', active: true, municipalities: ['Luanda', 'Belas', 'Cazenga', 'Cacuaco', 'Viana', 'Talatona', 'Kilamba Kiaxi', 'Icolo e Bengo', 'Quiçama'] },
  { province: 'Benguela', baselineFee: 3500, estimatedDays: '2 a 4 dias úteis', active: true, municipalities: ['Benguela', 'Lobito', 'Baía Farta', 'Catumbela', 'Ganda'] },
  { province: 'Huambo', baselineFee: 3500, estimatedDays: '2 a 4 dias úteis', active: true, municipalities: ['Huambo', 'Caála', 'Bailundo', 'Ekunha'] },
  { province: 'Huíla', baselineFee: 3500, estimatedDays: '3 a 5 dias úteis', active: true, municipalities: ['Lubango', 'Chibia', 'Matala', 'Humpata'] },
  { province: 'Cabinda', baselineFee: 4500, estimatedDays: '3 a 5 dias úteis', active: true, municipalities: ['Cabinda', 'Cacongo', 'Buco-Zau', 'Belize'] },
  { province: 'Namibe', baselineFee: 4000, estimatedDays: '3 a 5 dias úteis', active: true, municipalities: ['Moçâmedes', 'Tômbwa', 'Bibala', 'Virei', 'Camucuio'] },
  { province: 'Bié', baselineFee: 4000, estimatedDays: '3 a 5 dias úteis', active: true, municipalities: ['Cuíto', 'Andulo', 'Camacupa', 'Catabola'] },
  { province: 'Cuanza Sul', baselineFee: 3500, estimatedDays: '2 a 4 dias úteis', active: true, municipalities: ['Sumbe', 'Porto Amboim', 'Gabela', 'Libolo'] },
  { province: 'Cuanza Norte', baselineFee: 3500, estimatedDays: '2 a 4 dias úteis', active: true, municipalities: ['N\'dalatando', 'Cambambe', 'Golungo Alto'] },
  { province: 'Malanje', baselineFee: 4000, estimatedDays: '2 a 4 dias úteis', active: true, municipalities: ['Malanje', 'Calandula', 'Cacuso', 'Cangandala'] },
  { province: 'Uíge', baselineFee: 4000, estimatedDays: '2 a 4 dias úteis', active: true, municipalities: ['Uíge', 'Negage', 'Sanza Pombo', 'Damba'] },
  { province: 'Zaire', baselineFee: 4500, estimatedDays: '3 a 5 dias úteis', active: true, municipalities: ['M\'banza Kongo', 'Soyo', 'Nzeto', 'Noqui'] },
  { province: 'Lunda Norte', baselineFee: 5000, estimatedDays: '4 a 6 dias úteis', active: true, municipalities: ['Dundo', 'Chitato', 'Cambulo', 'Lucapa'] },
  { province: 'Lunda Sul', baselineFee: 5000, estimatedDays: '4 a 6 dias úteis', active: true, municipalities: ['Saurimo', 'Muconda', 'Dala', 'Cacolo'] },
  { province: 'Moxico', baselineFee: 5000, estimatedDays: '4 a 6 dias úteis', active: true, municipalities: ['Luena', 'Camanongue', 'Léua', 'Cameia'] },
  { province: 'Cuando Cubango', baselineFee: 5500, estimatedDays: '4 a 7 dias úteis', active: true, municipalities: ['Menongue', 'Cuito Cuanavale', 'Cuchi'] },
  { province: 'Cunene', baselineFee: 4500, estimatedDays: '4 a 6 dias úteis', active: true, municipalities: ['Ondjiva', 'Cuanhama', 'Ombadja', 'Namacunde'] },
  { province: 'Bengo', baselineFee: 2500, estimatedDays: '1 a 2 dias úteis', active: true, municipalities: ['Caxito', 'Dande', 'Ambriz', 'Nambuangongo'] },
];

const INITIAL_PAYMENT_SETTINGS: StorePaymentSettings = {
  bankName: 'Banco BAI / BFA / Banco Sol',
  accountHolder: 'O Mundo das Mocinhas (Configuração da Loja)',
  iban: 'AO06.0040.0000.1234.5678.9012.3',
  multicaixaExpressPhone: '+244 923 888 777',
  paymentInstructions: 'Efectue a transferência bancária por Multicaixa Express ou no ATM/Internet Banking utilizando os dados acima. De seguida, tire uma foto ou salve o comprovativo em PDF e anexe nesta página para validação imediata da sua encomenda.',
  notice: 'O comprovativo será conferido pela administração antes do envio. Não são aceites comprovativos rasurados ou falsificados.',
};

class Database {
  private data: DatabaseSchema;

  constructor() {
    this.data = this.load();
  }

  private load(): DatabaseSchema {
    try {
      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        return JSON.parse(raw);
      }
    } catch (err) {
      console.error('Error reading DB_FILE, fallback to initial schema:', err);
    }

    // In accordance with zero-dummy credentials policy: No default admin accounts exist.
    // The first administrator must be onboarded securely via ADMIN_SETUP_TOKEN.
    const demoClientPass = hashPassword('cliente123');

    const initialDb: DatabaseSchema = {
      users: [
        {
          id: 'user-client-demo',
          name: 'Ana Sofia Mendes',
          phone: '+244 923 456 789',
          email: 'cliente@exemplo.ao',
          passwordHash: demoClientPass.hash,
          salt: demoClientPass.salt,
          role: 'client',
          createdAt: new Date().toISOString(),
        },
      ],
      categories: INITIAL_CATEGORIES,
      products: INITIAL_PRODUCTS,
      orders: [],
      carriers: INITIAL_CARRIERS,
      destinations: INITIAL_DESTINATIONS,
      paymentSettings: INITIAL_PAYMENT_SETTINGS,
    };

    this.save(initialDb);
    return initialDb;
  }

  private save(dataToSave?: DatabaseSchema): void {
    try {
      const dir = path.dirname(DB_FILE);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(DB_FILE, JSON.stringify(dataToSave || this.data, null, 2), 'utf-8');
    } catch (err) {
      console.error('Error writing DB_FILE:', err);
    }
  }

  // --- Users ---
  getUsers(): User[] {
    return this.data.users;
  }

  getUserById(id: string): User | undefined {
    return this.data.users.find((u) => u.id === id);
  }

  getUserByEmail(email: string): User | undefined {
    return this.data.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
  }

  getUserByPhone(phone: string): User | undefined {
    return this.data.users.find((u) => u.phone.trim() === phone.trim());
  }

  createUser(user: User): User {
    this.data.users.push(user);
    this.save();
    return user;
  }

  updateUser(id: string, updates: Partial<User>): User | undefined {
    const index = this.data.users.findIndex((u) => u.id === id);
    if (index === -1) return undefined;
    this.data.users[index] = { ...this.data.users[index], ...updates };
    this.save();
    return this.data.users[index];
  }

  deleteUser(id: string): boolean {
    const len = this.data.users.length;
    this.data.users = this.data.users.filter((u) => u.id !== id);
    const changed = this.data.users.length < len;
    if (changed) this.save();
    return changed;
  }

  getAdmins(): User[] {
    return this.data.users.filter((u) => u.role === 'admin');
  }

  ensureRecognizedAdmin(
    targetEmail = 'admin@gmai.com',
    options?: {
      name?: string;
      phone?: string;
      password?: string;
    }
  ): { user: User; created: boolean; updated: boolean } {
    const cleanEmail = targetEmail.trim().toLowerCase();
    const existing = this.getUserByEmail(cleanEmail);

    if (existing) {
      let wasUpdated = false;
      const updates: Partial<User> = {};

      if (existing.role !== 'admin') {
        updates.role = 'admin';
        wasUpdated = true;
      }
      if (options?.name && options.name !== existing.name) {
        updates.name = options.name;
        wasUpdated = true;
      }
      if (options?.phone && options.phone !== existing.phone) {
        updates.phone = options.phone;
        wasUpdated = true;
      }
      if (options?.password) {
        const { hash, salt } = hashPassword(options.password);
        updates.passwordHash = hash;
        updates.salt = salt;
        wasUpdated = true;
      }

      if (wasUpdated) {
        const updatedUser = this.updateUser(existing.id, updates)!;
        return { user: updatedUser, created: false, updated: true };
      }
      return { user: existing, created: false, updated: false };
    }

    // Account does not exist yet: create with secure hash
    const initialPassword = options?.password || process.env.ADMIN_INITIAL_PASSWORD || 'AdminMocinhas2026!';
    const { hash, salt } = hashPassword(initialPassword);

    const newAdmin: User = {
      id: `user-admin-${crypto.randomUUID()}`,
      name: options?.name || 'Administradora Geral',
      phone: options?.phone || '+244 923 000 000',
      email: cleanEmail,
      passwordHash: hash,
      salt,
      role: 'admin',
      createdAt: new Date().toISOString(),
    };

    this.createUser(newAdmin);
    return { user: newAdmin, created: true, updated: false };
  }

  // --- Products ---
  getProducts(): Product[] {
    return this.data.products;
  }

  getProductById(id: string): Product | undefined {
    return this.data.products.find((p) => p.id === id);
  }

  createProduct(product: Product): Product {
    this.data.products.unshift(product);
    this.save();
    return product;
  }

  updateProduct(id: string, updates: Partial<Product>): Product | undefined {
    const index = this.data.products.findIndex((p) => p.id === id);
    if (index === -1) return undefined;
    this.data.products[index] = { ...this.data.products[index], ...updates };
    this.save();
    return this.data.products[index];
  }

  deleteProduct(id: string): boolean {
    const initialLen = this.data.products.length;
    this.data.products = this.data.products.filter((p) => p.id !== id);
    const changed = this.data.products.length < initialLen;
    if (changed) this.save();
    return changed;
  }

  decrementProductStock(id: string, quantity: number): boolean {
    const product = this.getProductById(id);
    if (!product || product.stock < quantity) return false;
    product.stock -= quantity;
    this.save();
    return true;
  }

  // --- Categories ---
  getCategories(): Category[] {
    return this.data.categories;
  }

  addCategory(category: Category): Category {
    this.data.categories.push(category);
    this.save();
    return category;
  }

  deleteCategory(id: string): boolean {
    const len = this.data.categories.length;
    this.data.categories = this.data.categories.filter((c) => c.id !== id);
    const changed = this.data.categories.length < len;
    if (changed) this.save();
    return changed;
  }

  // --- Orders ---
  getOrders(): Order[] {
    return this.data.orders;
  }

  getOrderById(id: string): Order | undefined {
    return this.data.orders.find((o) => o.id === id || o.orderNumber === id);
  }

  getOrdersByCustomerId(customerId: string): Order[] {
    return this.data.orders.filter((o) => o.customerId === customerId);
  }

  createOrder(order: Order): Order {
    this.data.orders.unshift(order);
    this.save();
    return order;
  }

  updateOrder(id: string, updates: Partial<Order>): Order | undefined {
    const index = this.data.orders.findIndex((o) => o.id === id || o.orderNumber === id);
    if (index === -1) return undefined;
    this.data.orders[index] = {
      ...this.data.orders[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    this.save();
    return this.data.orders[index];
  }

  addOrderStatusHistory(orderId: string, historyItem: OrderStatusHistoryItem): Order | undefined {
    const order = this.getOrderById(orderId);
    if (!order) return undefined;
    if (!order.statusHistory) order.statusHistory = [];
    order.statusHistory.push(historyItem);
    order.status = historyItem.status;
    order.updatedAt = new Date().toISOString();
    this.save();
    return order;
  }

  // --- Carriers & Destinations ---
  getCarriers(): ShippingCarrier[] {
    return this.data.carriers;
  }

  updateCarrier(id: string, updates: Partial<ShippingCarrier>): ShippingCarrier | undefined {
    const index = this.data.carriers.findIndex((c) => c.id === id);
    if (index === -1) return undefined;
    this.data.carriers[index] = { ...this.data.carriers[index], ...updates };
    this.save();
    return this.data.carriers[index];
  }

  getDestinations(): ShippingDestination[] {
    return this.data.destinations;
  }

  updateDestination(province: string, updates: Partial<ShippingDestination>): ShippingDestination | undefined {
    const index = this.data.destinations.findIndex((d) => d.province.toLowerCase() === province.toLowerCase());
    if (index === -1) return undefined;
    this.data.destinations[index] = { ...this.data.destinations[index], ...updates };
    this.save();
    return this.data.destinations[index];
  }

  // --- Payment Settings ---
  getPaymentSettings(): StorePaymentSettings {
    return this.data.paymentSettings;
  }

  updatePaymentSettings(settings: Partial<StorePaymentSettings>): StorePaymentSettings {
    this.data.paymentSettings = { ...this.data.paymentSettings, ...settings };
    this.save();
    return this.data.paymentSettings;
  }

  // --- Diagnostics & Export ---
  getDbFilePath(): string {
    return DB_FILE;
  }

  isPersistentOnDisk(): boolean {
    return fs.existsSync(DB_FILE);
  }

  getStatsSummary() {
    return {
      usersCount: this.data.users.length,
      productsCount: this.data.products.length,
      ordersCount: this.data.orders.length,
      categoriesCount: this.data.categories.length,
      carriersCount: this.data.carriers.length,
      destinationsCount: this.data.destinations.length,
      totalRevenue: this.data.orders
        .filter((o) => o.status === 'entregue' || o.paymentStatus === 'confirmado')
        .reduce((sum, o) => sum + o.total, 0),
    };
  }

  exportAllData(): DatabaseSchema {
    return JSON.parse(JSON.stringify(this.data));
  }
}

export const db = new Database();

