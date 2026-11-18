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

test('liste: aktif kartlar ve bağlantısız yakında kartı gelir, biten kartlar atlanır', () => {
  const kayitlar = fonangels.liste(liste, 'https://fonangels.com/kampanyalar');
  const v = kayitlar.find((k) => k.url.includes('pid=1803'));
  assert.ok(v, 'VisitExtra listede olmalı');
  assert.equal(v.bolum, 'aktif');
  assert.equal(v.ad, 'visitextra'); // geçici: URL sluğu
  assert.equal(v.url, 'https://fonangels.com/kampanyalar/projehakkinda/visitextra?pid=1803');
  assert.ok(!kayitlar.some((k) => k.url.includes('pid=1689')), 'biten Athletic Labs alınmaz');
  assert.equal(kayitlar.length, 2); // VisitExtra + bağlantısız yakında kartı (Neurox)
});

test('liste: bağlantısız yakında kartı ad açıklamanın ilk öbeğinden, detaysiz olarak döner', () => {
  const kayitlar = fonangels.liste(liste, 'https://fonangels.com/kampanyalar');
  const n = kayitlar.find((k) => k.bolum === 'yakinda');
  assert.deepEqual(n, { ad: 'Neurox', url: 'https://fonangels.com/kampanyalar#yakinda-neurox', bolum: 'yakinda', detaysiz: true });
});

const bagsizKart = (baslik: string, aciklama: string) =>
  `<div class="invest-box yakinda"><div class="fw-bold">&#x200B;${baslik}</div>` +
  `<div class="genislige-x-satir x-5">&#x200B;${aciklama}</div><a class="btn btn-yakinda"><span>YAKINDA</span></a></div>`;

test('liste: açıklamanın ilk öbeği 1-3 sözcük değilse başlığa düşülür; ikisi de yoksa kart atlanır', () => {
  const l = (h: string) => fonangels.liste(h, 'https://fonangels.com/kampanyalar');
  assert.equal(l(bagsizKart('Dijital Dönüşüm', 'Bu çok uzun bir ilk öbek olarak yazılmış açıklama, devamı var'))[0].ad, 'Dijital Dönüşüm');
  assert.equal(l(bagsizKart('Slogan', 'Ali Veli Can Deniz; dört sözcüklü'))[0].ad, 'Slogan');
  assert.equal(l(bagsizKart('Slogan', 'Mavi Kuş, uçan bir girişim'))[0].ad, 'Mavi Kuş');
  assert.equal(l(bagsizKart('Slogan', 'Açıklama noktalama içermiyor'))[0].ad, 'Slogan');
  assert.equal(l('<div class="invest-box yakinda"><a class="btn btn-yakinda"></a></div>').length, 0);
});

test('detay: girişim adı h1den, yoksa titledan, ikisi de yoksa null', () => {
  assert.equal(fonangels.detay(visitextra).ad, 'VisitExtra');
  assert.equal(fonangels.detay(athletic).ad, 'Athletic Labs');
  const h1siz = athletic.replace(/<h1[\s\S]*?<\/h1>/gi, '');
  assert.equal(fonangels.detay(h1siz).ad, 'Athletic Labs');
  const ikisiz = h1siz.replace(/<title[\s\S]*?<\/title>/gi, '');
  assert.equal(fonangels.detay(ikisiz).ad, null);
});

test('liste: bozuk yüzde kodlu slug liste()yi düşürmez', () => {
  const html = '<div class="invest-box acik"><a href="/kampanyalar/projehakkinda/bozuk%E0%A4%A?pid=7">İncele</a></div>';
  const k = fonangels.liste(html, 'https://fonangels.com/kampanyalar');
  assert.equal(k.length, 1);
  assert.equal(k[0].ad, 'bozuk%E0%A4%A');
});

test('liste: açıklamasında "Tamamlandı" geçen açık kart atlanmaz', () => {
  const html = '<div class="invest-box acik"><div class="genislige-x-satir">Proje Tamamlandı, Hedefine Ulaştı</div><a href="/kampanyalar/projehakkinda/x?pid=9">İncele</a></div>';
  const k = fonangels.liste(html, 'https://fonangels.com/kampanyalar');
  assert.equal(k.length, 1);
  assert.equal(k[0].bolum, 'aktif');
});

test('detay: ön talep tutarı ve kişi sayısı (VisitExtra); etiket silinince null', () => {
  const d = fonangels.detay(visitextra);
  assert.equal(d.onTalep, 4087000);
  assert.equal(d.onTalepKisi, 255);
  const e = fonangels.detay(visitextra.replace(/Toplam (?:Ö|&#xD6;)n Talep/g, 'X').replace(/(?:Ö|&#xD6;)n Talep Say(?:ı|&#x131;)s(?:ı|&#x131;)/g, 'Y'));
  assert.equal(e.onTalep, null);
  assert.equal(e.onTalepKisi, null);
});
