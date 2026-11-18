import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fonventure } from './fonventure.ts';

const oku = (ad: string) => readFileSync(new URL(`./__ornekler__/${ad}`, import.meta.url), 'utf8');
const liste = oku('fonventure-liste.html');
const offgrid = oku('fonventure-offgrid.html'); // biten, hedefine ulaşan
const quad = oku('fonventure-quad.html'); // ön talep dönemi
const LISTE_URL = 'https://fonventure.com/';
const QUAD_URL = 'https://fonventure.com/kampanya/9eade97b-9d7a-4962-bf2a-c49f9a312ee5';

test('okuyucu kimliği', () => {
  assert.equal(fonventure.platform, 'fonventure');
  assert.deepEqual(fonventure.listeUrller, [LISTE_URL]);
});

test('detay: biten ve hedefine ulaşan kampanya (Off Grid)', () => {
  const d = fonventure.detay(offgrid);
  assert.equal(d.ad, 'Off Grid Yüzer Desalinizasyon Teknolojileri');
  assert.equal(d.hedef, 7500000);
  assert.equal(d.arzOrani, 0.05);
  assert.equal(d.degerleme, null);
  assert.equal(d.baslangic, '2026-04-13');
  assert.equal(d.bitis, '2026-06-11');
  assert.equal(d.toplanan, 7577854);
  assert.equal(d.yatirimci, 151);
  assert.equal(d.nitelikli, 56);
  assert.equal(d.bitti, true);
  assert.equal(d.fonlandi, true);
  assert.equal(d.kalanGun, null);
  assert.equal(d.sonGun, false);
});

test('detay: ön talep dönemindeki kampanya yatırım toplamış sayılmaz', () => {
  const d = fonventure.detay(quad);
  assert.equal(d.ad, 'Quad Robotics');
  assert.equal(d.hedef, 25000000);
  assert.equal(d.arzOrani, 0.13);
  assert.equal(d.toplanan, null); // 3.466.500 ön talep toplamıdır, yatırım değil
  assert.equal(d.yatirimci, null);
  assert.equal(d.baslangic, null);
  assert.equal(d.bitis, null);
  assert.equal(d.bitti, false);
  assert.equal(d.fonlandi, null);
});

test('detay: durum rozeti başarısız ise bitti ve fonlanmadı', () => {
  const d = fonventure.detay(offgrid.replace('Tamamlanmış – Başarılı Projeler', 'Tamamlanmış – Başarısız Projeler'));
  assert.equal(d.bitti, true);
  assert.equal(d.fonlandi, false);
});

test('detay: açıklamada geçen "Tamamlanmış" bitti saymaz, yalnız durum rozeti', () => {
  const html = quad.replace('Ön talep döneminde %20 bedelsiz pay', 'Tamamlanmış – Başarılı Projeler gibi sona erdi');
  assert.equal(fonventure.detay(html).bitti, false);
});

test('detay: etiket silinince null döner, 0 değil', () => {
  const d = fonventure.detay(offgrid.replace(/Toplam Yatırım/g, 'X').replace(/Yatırımcı Sayısı/g, 'Y'));
  assert.equal(d.toplanan, null);
  assert.equal(d.yatirimci, null);
});

test('detay: girişim adı h1.fv-page-title, yoksa title, ikisi de yoksa null', () => {
  const h1siz = offgrid.replace(/<h1[\s\S]*?<\/h1>/gi, '');
  assert.equal(fonventure.detay(h1siz).ad, 'Off Grid Yüzer Desalinizasyon Teknolojileri');
  const ikisiz = h1siz.replace(/<title[\s\S]*?<\/title>/gi, '');
  assert.equal(fonventure.detay(ikisiz).ad, null);
});

test('liste: ön talep kartı yakinda, mükerrer kart tek kayıt, biten projeler yok', () => {
  const k = fonventure.liste(liste, LISTE_URL);
  assert.equal(k.length, 1);
  assert.equal(k[0].url, QUAD_URL);
  assert.equal(k[0].bolum, 'yakinda');
  assert.equal(k[0].ad, '9eade97b-9d7a-4962-bf2a-c49f9a312ee5'); // geçici: URL sluğu
  assert.ok(!k.some((x) => x.url.includes('a5a5e508') || x.url.includes('4c66a7ae')), 'biten kartlar alınmaz');
  assert.ok(!k.some((x) => x.url.includes('on-yatirim-yap')), 'ön talep formu bağlantısı kayıt olmaz');
});

// Açık kampanya örneği kaydedilemedi (kayıt anında açık kampanya yoktu): bilinmeyen durum
// BİLEREK aktif sayılır (fail-open); keşif adımı detay().bitti ile eler.
test('liste: tanınmayan durumlu kart aktif, bilinen biten durumlar atlanır', () => {
  const kart = (durum: string, rozet = 'Yatırıma Açık') =>
    `<article class="pl-card" data-status="${durum}"><span class="pl-badge">${rozet}</span><a href="/kampanya/abc-${durum}" class="pl-btn">İncele</a></article>`;
  const html = kart('open') + kart('success', 'Başarılı') + kart('failed', 'Başarısız') + kart('cancelled', 'İptal') + kart('x', 'Tamamlanmış');
  const k = fonventure.liste(html, LISTE_URL);
  assert.deepEqual(k.map((x) => [x.url, x.bolum]), [['https://fonventure.com/kampanya/abc-open', 'aktif']]);
});

test('liste: bağlantısı olmayan kart atlanır, bozuk slug düşürmez', () => {
  const bagsiz = '<article class="pl-card" data-status="pre_demand"><span>Yakında</span></article>';
  const bozuk = '<article class="pl-card" data-status="pre_demand"><a href="/kampanya/bozuk%E0%A4%A">İncele</a></article>';
  const k = fonventure.liste(bagsiz + bozuk, LISTE_URL);
  assert.equal(k.length, 1);
  assert.equal(k[0].ad, 'bozuk%E0%A4%A');
});

// Ön talep penceresi fonlama penceresi değildir; bitis < bugün kuralı yaklaşan kampanyayı kapatmasın.
test('detay: Ön Talep Başlangıcı/Bitişi tarihleri baslangic ve bitis olarak okunmaz', () => {
  const html = quad
    .replace(/(Ön Talep Başlangıcı[\s\S]*?)-(\s*<\/span>)/, '$101.12.2026$2')
    .replace(/(Ön Talep Bitişi[\s\S]*?<\/h5>[\s\S]*?)-(\s*<\/span>)/, '$115.12.2026$2');
  assert.ok(html.includes('01.12.2026') && html.includes('15.12.2026'), 'mutasyon uygulanmalı');
  const d = fonventure.detay(html);
  assert.equal(d.baslangic, null);
  assert.equal(d.bitis, null);
});

test('detay: ön talep tutarı ve kişi sayısı (Quad Robotics); etiket silinince null', () => {
  const d = fonventure.detay(quad);
  assert.equal(d.onTalep, 3466500);
  assert.equal(d.onTalepKisi, 112);
  const e = fonventure.detay(quad.replace(/Toplam Ön Talep/g, 'X').replace(/Ön Talep Sayısı/g, 'Y'));
  assert.equal(e.onTalep, null);
  assert.equal(e.onTalepKisi, null);
  assert.equal(fonventure.detay(offgrid).onTalep, null);
});
