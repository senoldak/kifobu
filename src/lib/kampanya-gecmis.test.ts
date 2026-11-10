import { test } from 'node:test';
import assert from 'node:assert/strict';
import { degerleme, gecmisGirisimler, gerceklesme, kampanyaCapasi, ortalamaYatirim, type GecmisKampanya } from './kampanya-gecmis.ts';
import veri from '../data/kampanya-gecmis.json' with { type: 'json' };

const k = (o: Partial<GecmisKampanya>): GecmisKampanya => ({
  anahtar: 'A', ad: 'A', tur: null, platform: 'p', durum: 'fonlandi', baslangic: '2023-01-01', bitis: null, hedef: 100, alinan: 120,
  payArz: 0.1, yatirimci: 10, nitelikli: null, sermaye: null, payFiyati: null, payGrubu: null, fonAktarim: null, sirket: null, url: null, ...o,
});

test('hesaplar: gerçekleşme, değerleme, ortalama', () => {
  assert.equal(gerceklesme(k({})), 120);
  assert.equal(degerleme(k({})), 1000);
  assert.equal(degerleme(k({ payArz: null })), null);
  assert.equal(ortalamaYatirim(k({})), 12);
  assert.equal(ortalamaYatirim(k({ yatirimci: 0 })), null);
});

test('turlar aynı girişimde, tarih sırasıyla toplanır', () => {
  const g = gecmisGirisimler([k({ tur: 2, baslangic: '2024-01-01', ad: 'COPRİNT', anahtar: 'C' }), k({ tur: 1, baslangic: '2022-01-01', ad: 'COPRINT', anahtar: 'C', sirket: 'CO PRİNT A.Ş.' })]);
  assert.equal(g.length, 1);
  assert.deepEqual(g[0].kampanyalar.map((x) => x.tur), [1, 2]);
  assert.equal(g[0].sirket, 'CO PRİNT A.Ş.');
  assert.equal(g[0].slug, 'coprint');
});

test('aynı slug\'a düşen farklı girişimler platformla ayrılır', () => {
  const g = gecmisGirisimler([k({ anahtar: 'X1', ad: 'Ortak', platform: 'fonbulucu' }), k({ anahtar: 'X2', ad: 'ORTAK', platform: 'fongogo' })]);
  assert.deepEqual(g.map((x) => x.slug).sort(), ['ortak-fonbulucu', 'ortak-fongogo']);
});

test('çapa yalnız turlu kampanyada', () => {
  assert.equal(kampanyaCapasi({ tur: 3 }), '#tur-3');
  assert.equal(kampanyaCapasi({ tur: null }), '');
});

test('veri dosyası: zorunlu alanlar dolu, slug\'lar tekil, tarihler geçerli', () => {
  const ks = veri.kampanyalar as GecmisKampanya[];
  assert.ok(ks.length >= 264);
  for (const x of ks) {
    assert.match(x.baslangic, /^\d{4}-\d{2}-\d{2}$/, x.ad);
    assert.ok(x.hedef > 0 && x.alinan >= 0, x.ad);
    assert.ok(x.durum === 'fonlandi' || x.durum === 'fonlanamadi', x.ad);
    if (x.bitis) assert.ok(x.bitis >= x.baslangic, x.ad);
  }
  const g = gecmisGirisimler(ks);
  assert.equal(new Set(g.map((x) => x.slug)).size, g.length);
});
