/**
 * Pure calculation and validation logic for O Mundo das Mocinhas
 */

export interface CartItemInput {
  productId: string;
  quantity: number;
}

export interface ProductPriceRef {
  id: string;
  name: string;
  price: number;
  stock: number;
  isActive: boolean;
}

export interface VerifiedOrderItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  subtotal: number;
}

export interface OrderTotals {
  itemCount: number;
  subtotal: number;
  shippingFee: number;
  total: number;
  formattedSubtotal: string;
  formattedShipping: string;
  formattedTotal: string;
}

/**
 * Format a numeric amount to Angolan Kwanzas (Kz)
 * E.g. 5500 -> "5.500 Kz"
 */
export function formatKz(amount: number): string {
  if (isNaN(amount) || amount === null || amount === undefined) {
    return '0 Kz';
  }
  const rounded = Math.round(amount);
  const formatted = rounded.toLocaleString('de-DE'); // uses dots for thousands
  return `${formatted} Kz`;
}

/**
 * Parse a price string or number to a clean integer
 */
export function parseKz(value: string | number): number {
  if (typeof value === 'number') return Math.max(0, Math.round(value));
  const cleaned = value.replace(/[^0-9]/g, '');
  return parseInt(cleaned, 10) || 0;
}

/**
 * Validates cart items against database prices and stock, preventing client price tampering.
 */
export function verifyAndCalculateItems(
  cartItems: CartItemInput[],
  productsDb: Record<string, ProductPriceRef>
): { items: VerifiedOrderItem[]; subtotal: number } {
  if (!cartItems || !Array.isArray(cartItems) || cartItems.length === 0) {
    throw new Error('O carrinho está vazio.');
  }

  let subtotal = 0;
  const items: VerifiedOrderItem[] = [];

  for (const item of cartItems) {
    if (!item.productId || typeof item.productId !== 'string') {
      throw new Error('Produto inválido no carrinho.');
    }
    const qty = Math.max(1, Math.floor(Number(item.quantity) || 1));
    const product = productsDb[item.productId];

    if (!product) {
      throw new Error(`Produto com ID "${item.productId}" não encontrado.`);
    }

    if (!product.isActive) {
      throw new Error(`O produto "${product.name}" não está disponível no momento.`);
    }

    if (product.stock < qty) {
      throw new Error(
        `Stock insuficiente para "${product.name}". Disponível: ${product.stock}, solicitado: ${qty}.`
      );
    }

    const itemSubtotal = product.price * qty;
    subtotal += itemSubtotal;

    items.push({
      productId: product.id,
      name: product.name,
      price: product.price,
      quantity: qty,
      subtotal: itemSubtotal,
    });
  }

  return { items, subtotal };
}

/**
 * Calculate final order totals with shipping fee
 */
export function calculateOrderTotals(subtotal: number, shippingFee: number = 0): OrderTotals {
  const safeSubtotal = Math.max(0, subtotal);
  const safeShipping = Math.max(0, shippingFee);
  const total = safeSubtotal + safeShipping;

  return {
    itemCount: 0,
    subtotal: safeSubtotal,
    shippingFee: safeShipping,
    total,
    formattedSubtotal: formatKz(safeSubtotal),
    formattedShipping: safeShipping === 0 ? 'A confirmar / Grátis' : formatKz(safeShipping),
    formattedTotal: formatKz(total),
  };
}

/**
 * Generate unique order tracking code
 * Format: MDM-{YEAR}-{4-DIGIT-RANDOM}
 */
export function generateOrderNumber(prefix = 'MDM'): string {
  const year = new Date().getFullYear();
  const randomPart = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}-${year}-${randomPart}`;
}
