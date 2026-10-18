import { test } from 'node:test';
import assert from 'node:assert/strict';
import { percentOf } from './site.ts';
import { yuzdeSonda } from './kimlik.ts';

test('percentOf: iki ondalık, kesilerek, % önde; 99,996 asla %100,00 olmaz', () => {
  assert.equal(percentOf(2_840_000, 4_000_000), '%71,00');
  assert.equal(percentOf(9_999_960, 10_000_000), '%99,99');
  assert.equal(percentOf(4_000_000, 4_000_000), '%100,00');
  assert.equal(percentOf(undefined, 4), undefined);
  assert.equal(percentOf(1, 0), undefined);
});

test('bülten yazımı (yüzde işareti sonda) de kesilerek', () => {
  assert.equal(yuzdeSonda(99.996), '99,99%');
  assert.equal(yuzdeSonda(101.37), '101,37%');
  assert.equal(yuzdeSonda(1.19), '1,19%');
});

test('bot verisindeki yüzde iki ondalığa kesilir (99,996 → 99,99, 100 → 100)', async () => {
  const { hedefeOran } = await import('./kimlik.ts');
  assert.equal(hedefeOran(9_999_960, 10_000_000), 99.99);
  assert.equal(hedefeOran(10_000_000, 10_000_000), 100);
  assert.equal(hedefeOran(7_602_500, 7_500_000), 101.36);
});
