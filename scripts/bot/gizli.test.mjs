import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { adresiSil, coz, gizliId, gizliKaynaklar, kaynakIzi, kaynakKodu, ozet, sifrele } from './gizli.mjs';

const A = Buffer.alloc(32, 1);
const B = Buffer.alloc(32, 2);

test('şifrele/çöz gidiş-dönüş; her şifreleme farklı metin, yanlış anahtar reddedilir', () => {
  const v = [{ ad: 'Örnek', url: 'https://haber.example.com/a' }];
  const s1 = sifrele(v, A);
  assert.match(s1, /^v1\./);
  assert.notEqual(s1, sifrele(v, A));
  assert.deepEqual(coz(s1, A), v);
  assert.throws(() => coz(s1, B));
  assert.ok(!s1.includes('example'));
});

test('kod ve özet: kararlı, anahtara bağlı, adı içermez', () => {
  assert.equal(kaynakKodu('ornekhaber', A), kaynakKodu('ornekhaber', A));
  assert.notEqual(kaynakKodu('ornekhaber', A), kaynakKodu('ornekhaber', B));
  assert.match(kaynakKodu('ornekhaber', A), /^k[0-9a-f]{6}$/);
  assert.match(ozet('ornekhaber:https://haber.example.com/a', A), /^[0-9a-f]{16}$/);
});

test('gizliId: açık kimliği anahtarlı özete çevirir, özeti olduğu gibi bırakır (yükleme = çalışma anı)', () => {
  const acik = 'ornekhaber:https://haber.example.com/?p=1';
  const id = gizliId(acik, { a: A });
  assert.equal(id, ozet(acik, A));
  assert.equal(gizliId(id, { a: A }), id);
  assert.notEqual(gizliId(acik, { a: B }), id);
  assert.equal(gizliId('', { a: A }), '');
  // map ile çağrıda sıra numarası anahtar sayılmaz.
  assert.deepEqual(['x', 'y'].map(gizliId), [gizliId('x'), gizliId('y')]);
  // Çift anahtarı: biri açık biri özet de olsa aynı sonuç.
  const cift = (x, y) => [x, y].map((s) => gizliId(s, { a: A })).sort().join('|');
  assert.equal(cift('haber:ornek-slug', acik), cift(id, gizliId('haber:ornek-slug', { a: A })));
});

test('adresiSil hata mesajındaki adresleri siler', () => {
  assert.equal(adresiSil('403 Forbidden: https://haber.example.com/feed/?x=1'), '403 Forbidden: [adres]');
});

test('gizliKaynaklar: dosyadan okur; anahtar yoksa boş; anahtar varken dosya yoksa ya da liste boşsa hata', () => {
  const dizin = mkdtempSync(path.join(tmpdir(), 'gizli-'));
  const dosya = path.join(dizin, 'k.sifreli');
  const icerik = { kaynaklar: [{ ad: 'Örnek Haber', kisa: 'ornekhaber', akis: 'https://haber.example.com/feed/', yerli: true }], medya: ['Ajans Örnek'] };
  writeFileSync(dosya, sifrele(icerik, A));
  assert.deepEqual(gizliKaynaklar({ dosya, a: A }), icerik);
  assert.deepEqual(gizliKaynaklar({ dosya, a: null, uyar: () => {} }), { kaynaklar: [], medya: [] });
  assert.throws(() => gizliKaynaklar({ dosya, a: B }), /çözülemedi/);
  assert.throws(() => gizliKaynaklar({ dosya: path.join(dizin, 'yok.sifreli'), a: A }), /yok/);
  const bos = path.join(dizin, 'bos.sifreli');
  writeFileSync(bos, sifrele({ kaynaklar: [], medya: [] }, A));
  assert.throws(() => gizliKaynaklar({ dosya: bos, a: A }), /kaynak yok/);
});

test('kaynakIzi: tekilleştirip şifreler, boş listede alan yazılmaz', () => {
  assert.equal(kaynakIzi([]), undefined);
  const iz = kaynakIzi([
    { ad: 'X', url: 'https://x.example.com/1' },
    { ad: 'X', url: 'https://x.example.com/1' },
  ]);
  assert.deepEqual(coz(iz), [{ ad: 'X', url: 'https://x.example.com/1' }]);
});
