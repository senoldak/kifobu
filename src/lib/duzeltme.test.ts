import test from 'node:test';
import assert from 'node:assert/strict';
import { duzeltmeNotu } from './duzeltme.ts';

test('duzeltmeNotu: alan yoksa null', () => {
  assert.equal(duzeltmeNotu({}), null);
  assert.equal(duzeltmeNotu({ duzeltme: undefined }), null);
});

test('duzeltmeNotu: dolu alan tr etiket ve düzeltme ilkesi bağlantısı verir', () => {
  const not = duzeltmeNotu({ duzeltme: '19.10.2026 14:00: Toplanan tutar düzeltildi.' }, 'tr');
  assert.deepEqual(not, {
    etiket: 'Düzeltme:',
    metin: '19.10.2026 14:00: Toplanan tutar düzeltildi.',
    baglanti: '/yayin-ilkeleri/#duzeltmeler',
  });
});

test('duzeltmeNotu: dil verilmezse tr', () => {
  const not = duzeltmeNotu({ duzeltme: '19.10.2026 14:00: Toplanan tutar düzeltildi.' });
  assert.equal(not?.etiket, 'Düzeltme:');
  assert.equal(not?.baglanti, '/yayin-ilkeleri/#duzeltmeler');
});

test('duzeltmeNotu: 10 karakterden kısa not şemadaki gibi reddedilir', () => {
  assert.equal(duzeltmeNotu({ duzeltme: 'kısa' }), null);
  assert.equal(duzeltmeNotu({ duzeltme: '123456789' }), null);
  assert.notEqual(duzeltmeNotu({ duzeltme: '1234567890' }), null);
});
