import test from 'node:test';
import assert from 'node:assert/strict';
import {
  formatKz,
  parseKz,
  calculateOrderTotals,
  verifyAndCalculateItems,
  ProductPriceRef,
} from './pricing.js';

test('formatKz formats number with thousands separator and Kz suffix', () => {
  assert.equal(formatKz(5500), '5.500 Kz');
  assert.equal(formatKz(17000), '17.000 Kz');
  assert.equal(formatKz(2500), '2.500 Kz');
  assert.equal(formatKz(0), '0 Kz');
  assert.equal(formatKz(1250000), '1.250.000 Kz');
});

test('parseKz extracts integer value from formatted string', () => {
  assert.equal(parseKz('5.500 Kz'), 5500);
  assert.equal(parseKz('17000'), 17000);
  assert.equal(parseKz(3500), 3500);
});

test('calculateOrderTotals sums items and shipping correctly', () => {
  const totals = calculateOrderTotals(35000, 2500);
  assert.equal(totals.subtotal, 35000);
  assert.equal(totals.shippingFee, 2500);
  assert.equal(totals.total, 37500);
  assert.equal(totals.formattedTotal, '37.500 Kz');
  assert.equal(totals.formattedShipping, '2.500 Kz');
});

test('calculateOrderTotals handles 0 shipping with notice', () => {
  const totals = calculateOrderTotals(20000, 0);
  assert.equal(totals.total, 20000);
  assert.equal(totals.formattedShipping, 'A confirmar / Grátis');
});

test('verifyAndCalculateItems prevents price tampering and verifies stock', () => {
  const mockDb: Record<string, ProductPriceRef> = {
    'prod-1': {
      id: 'prod-1',
      name: 'Kit Rosa Mosqueta Porán',
      price: 17000,
      stock: 10,
      isActive: true,
    },
    'prod-2': {
      id: 'prod-2',
      name: 'Paleta Iluminador Colorfish',
      price: 2500,
      stock: 2,
      isActive: true,
    },
  };

  const cart = [
    { productId: 'prod-1', quantity: 2 },
    { productId: 'prod-2', quantity: 1 },
  ];

  const result = verifyAndCalculateItems(cart, mockDb);
  assert.equal(result.items.length, 2);
  assert.equal(result.subtotal, 17000 * 2 + 2500);
  assert.equal(result.items[0].subtotal, 34000);
});

test('verifyAndCalculateItems throws error when stock is exceeded', () => {
  const mockDb: Record<string, ProductPriceRef> = {
    'prod-2': {
      id: 'prod-2',
      name: 'Paleta Iluminador Colorfish',
      price: 2500,
      stock: 2,
      isActive: true,
    },
  };

  assert.throws(
    () => {
      verifyAndCalculateItems([{ productId: 'prod-2', quantity: 5 }], mockDb);
    },
    {
      message: /Stock insuficiente/,
    }
  );
});
