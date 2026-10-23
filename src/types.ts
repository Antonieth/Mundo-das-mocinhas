import { OrderStatus, PaymentStatus } from './utils/orderStatus.js';

export interface User {
  id: string;
  name: string;
  phone: string;
  email: string;
  role: 'client' | 'admin';
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  icon?: string;
  description?: string;
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

export interface CartItem {
  product: Product;
  quantity: number;
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
  receiptData?: string;
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
