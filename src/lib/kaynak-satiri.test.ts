import { test } from 'node:test';
import assert from 'node:assert/strict';
import { kaynakSatiri, KAYNAK_SATIRI } from './kaynak-satiri.ts';

test('kaynak izi dolu bot haberinde satır çıkar', () => {
  assert.equal(kaynakSatiri({ kaynakIzi: 'abc', category: 'yatirimlar', uretim: 'yapay-zeka', author: 'kifobu' }), KAYNAK_SATIRI);
});
test('boş iz, bülten, zincir ve sahip yazısında satır yok', () => {
  assert.equal(kaynakSatiri({ category: 'yatirimlar' }), undefined);
  assert.equal(kaynakSatiri({ kaynakIzi: 'abc', category: 'gunluk-bulten' }), undefined);
  assert.equal(kaynakSatiri({ kaynakIzi: 'abc', category: 'analiz', uretim: 'yazi-isleri' }), undefined);
  assert.equal(kaynakSatiri({ kaynakIzi: 'abc', category: 'analiz', author: 'Şenol Dak' }), undefined);
});
