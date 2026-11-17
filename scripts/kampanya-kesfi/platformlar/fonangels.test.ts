import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fonangels } from './fonangels.ts';

const oku = (ad: string) => readFileSync(new URL(`./__ornekler__/${ad}`, import.meta.url), 'utf8');
const liste = oku('fonangels-liste.html');
const visitextra = oku('fonangels-visitextra.html');
const athletic = oku('fonangels-athleticlabs.html');
// Örnek 17 Kasım akşamı kaydedildi; kayıtlı sayfadaki Toplam Yatırım değeri.
const TOPLANAN_VISITEXTRA = 195600;

test('okuyucu kimliği', () => {
  assert.equal(fonangels.platform, 'fonangels');
  assert.deepEqual(fonangels.listeUrller, ['https://fonangels.com/kampanyalar']);
});

test('detay: yatırıma açık kampanya (VisitExtra)', () => {
  const d = fonangels.detay(visitextra);
  assert.equal(d.hedef, 5000000);
  assert.equal(d.arzOrani, 0.1);
  assert.equal(d.degerleme, null);
  assert.equal(d.baslangic, '2026-11-16');
  assert.equal(d.bitis, '2027-01-14');
  assert.equal(d.toplanan, TOPLANAN_VISITEXTRA);
  assert.equal(d.yatirimci, 56);
  assert.equal(d.nitelikli, 10);
  assert.equal(d.bitti, false);
  assert.equal(d.fonlandi, null);
  assert.equal(d.sonGun, false);
  assert.equal(typeof d.kalanGun, 'number');
});

test('detay: biten ve hedefine ulaşan kampanya (Athletic Labs)', () => {
  const d = fonangels.detay(athletic);
  assert.equal(d.hedef, 7500000);
  assert.equal(d.toplanan, 7602500);
  assert.equal(d.yatirimci, 244);
  assert.equal(d.nitelikli, 74);
  assert.equal(d.baslangic, '2026-07-29');
  assert.equal(d.bitis, '2026-09-26');
  assert.equal(d.bitti, true);
  assert.equal(d.fonlandi, true);
  assert.equal(d.kalanGun, null);
});

// Ham HTML'de etiket varlık koduyla (Yat&#x131;r&#x131;m) yazılı; iki yazım da silinir.
test('detay: etiket silinince null döner, 0 değil', () => {
  const d = fonangels.detay(visitextra.replace(/Toplam Yat(?:ı|&#x131;)r(?:ı|&#x131;)m/g, 'X'));
  assert.equal(d.toplanan, null);
  assert.equal(d.yatirimci, null);
});

test('liste: yalnız aktif kartlar, biten kartlar atlanır', () => {
  const kayitlar = fonangels.liste(liste, 'https://fonangels.com/kampanyalar');
  const v = kayitlar.find((k) => k.url.includes('pid=1803'));
  assert.ok(v, 'VisitExtra listede olmalı');
  assert.equal(v.bolum, 'aktif');
  assert.equal(v.ad, 'VisitExtra');
  assert.equal(v.url, 'https://fonangels.com/kampanyalar/projehakkinda/visitextra?pid=1803');
  assert.ok(!kayitlar.some((k) => k.url.includes('pid=1689')), 'biten Athletic Labs alınmaz');
  assert.equal(kayitlar.length, 1);
});
