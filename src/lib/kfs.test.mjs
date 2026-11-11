import { test } from 'node:test';
import assert from 'node:assert/strict';
import { aylikIzgara, sonDeger, profil, tutar, yuzde, ondalik } from './kfs.mjs';
import genel from '../data/kfs/genel.json' with { type: 'json' };

test('aylikIzgara: eksik aylar null, sıra korunur', () => {
  const o = aylikIzgara({ '2022-11-01': 1, '2022-12-01': 2, '2023-02-01': 4 });
  assert.deepEqual(o, [['2022-11-01', 1], ['2022-12-01', 2], ['2023-01-01', null], ['2023-02-01', 4]]);
  assert.deepEqual(aylikIzgara({}), []);
});

test('sonDeger ve profil', () => {
  assert.equal(sonDeger({ '2026-01-02': 1, '2026-11-06': 9 }), 9);
  const p = profil({ cinsiyet: { haftalik: { '2026-11-06': { kadin: 2, erkek: 3 } } } });
  assert.deepEqual(p.cinsiyet, { kadin: 2, erkek: 3 });
  assert.deepEqual(p.yas, {});
});

test('biçim: aşağı kesilir, simge önde', () => {
  assert.equal(tutar(1597721921), '₺1,59 milyar');
  assert.equal(tutar(25100200), '₺25,10 milyon');
  assert.equal(tutar(32147516, '$'), '$32,14 milyon');
  assert.equal(tutar(850999), '₺850 bin');
  assert.equal(yuzde(201, 266), '%75,56');
  assert.equal(yuzde(1, 0), '—');
  assert.equal(ondalik(0.29, 2), '0,29');
});

test('veri: kartlar ve birikimli seriler tutarlı', () => {
  const k = genel.kartlar;
  for (const a of ['fonlanan_tutar', 'yatirimci', 'kayitli_sirket', 'basarili_proje', 'basarisiz_proje', 'suren_hedef', 'suren_net_fon']) {
    assert.ok(Number.isFinite(k[a]?.son), a);
  }
  const s = genel.seriler.fonlanan_tutar;
  assert.equal(sonDeger(s.haftalik), k.fonlanan_tutar.son);
  // veride adres geçmez
  assert.ok(!/https?:\/\//.test(JSON.stringify(genel)));
});
