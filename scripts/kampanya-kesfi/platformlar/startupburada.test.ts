import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { startupburada } from './startupburada.ts';

const oku = (ad: string) => readFileSync(new URL(`./__ornekler__/${ad}`, import.meta.url), 'utf8');
const liste = oku('startupburada-liste.html');
const tekbas = oku('startupburada-tekbas-teknoloji.html'); // biten, hedefi aşan kampanya
const LISTE_URL = 'https://www.startupburada.com/';
const BASLIK = 'Hedefine Ulaşan Kampanyalar';

// Özet kartındaki tarih/durum bloğunu ("Bitiyor: ..." + durum satırı) değiştirir.
const TARIH_BLOGU = /<div class="date">[\s\S]*?<\/div><\/div><div class="main">/;
const tarihBlogu = (html: string, satirlar: string[]) =>
  html.replace(
    TARIH_BLOGU,
    `<div class="date">${satirlar.map((s) => `<div class="text-default  date-info">${s}</div>`).join('')}</div><div class="main">`,
  );
const ACIK = (durum: string) => ['Bitiyor: 30.11.2026', durum];

test('okuyucu kimliği', () => {
  assert.equal(startupburada.platform, 'startupburada');
  assert.deepEqual(startupburada.listeUrller, [LISTE_URL]);
});

test('detay: biten ve hedefi aşan kampanya (Tekbaş Teknoloji)', () => {
  const d = startupburada.detay(tekbas);
  assert.equal(d.ad, 'Tekbaş Teknoloji');
  assert.equal(d.hedef, 17000000);
  assert.equal(d.arzOrani, 0.0572);
  assert.equal(d.degerleme, 297000000); // "Şirket Değerlemesi" = yatırım sonrası, ek fonlama hariç (17/297 = %5,72)
  assert.equal(d.baslangic, '2026-02-25');
  assert.equal(d.bitis, '2026-04-03');
  assert.equal(d.toplanan, 17136310);
  assert.equal(d.yatirimci, 78);
  assert.equal(d.nitelikli, 27);
  assert.equal(d.kalanGun, null);
  assert.equal(d.sonGun, false);
  assert.equal(d.bitti, true);
  assert.equal(d.fonlandi, true);
});

test('detay: kapanmış ama hedefe ulaşamamış kampanya fonlanmadı sayılır', () => {
  const d = startupburada.detay(tekbas.replace(/17\.136\.310/g, '9.000.000'));
  assert.equal(d.bitti, true);
  assert.equal(d.toplanan, 9000000);
  assert.equal(d.fonlandi, false);
});

test('detay: açık kampanya, kalan gün sayısı ve bitmedi', () => {
  const d = startupburada.detay(tarihBlogu(tekbas, ACIK('12 Gün Kaldı')));
  assert.equal(d.bitti, false);
  assert.equal(d.fonlandi, null);
  assert.equal(d.kalanGun, 12);
  assert.equal(d.sonGun, false);
});

test('detay: durum alanında "Son Gün" yazıyorsa sonGun', () => {
  const d = startupburada.detay(tarihBlogu(tekbas, ACIK('Son Gün')));
  assert.equal(d.sonGun, true);
  assert.equal(d.bitti, false);
  assert.equal(d.kalanGun, null);
});

test('detay: açıklamada geçen "Fonlama Kapanmıştır / Son Gün / Gün Kaldı" durumu etkilemez', () => {
  const acik = tarihBlogu(tekbas, ACIK('12 Gün Kaldı'));
  const html = acik.replace('Kampanya Hakkında</', 'Kampanya Hakkında Fonlama Kapanmıştır Son Gün 3 Gün Kaldı</');
  assert.notEqual(html, acik, 'mutasyon uygulanmalı');
  const d = startupburada.detay(html);
  assert.equal(d.bitti, false);
  assert.equal(d.sonGun, false);
  assert.equal(d.kalanGun, 12);
});

test('detay: etiket silinince null döner, 0 değil', () => {
  const d = startupburada.detay(tekbas.replace(/Toplanan/g, 'X').replace(/Alınan Yatırım/g, 'Y').replace(/Yatırımcı Sayısı/g, 'Z'));
  assert.equal(d.toplanan, null);
  assert.equal(d.yatirimci, null);
});

test('detay: eksik etiketler null', () => {
  const d = startupburada.detay(
    tekbas
      .replace(/Fonlama Hedefi/g, 'A')
      .replace(/Pay Arz Oranı/g, 'B')
      .replace(/Şirket Değerlemesi/g, 'C')
      .replace(/Fonlama Başlangıç Tarihi/g, 'D')
      .replace(/Fonlama Bitiş Tarihi/g, 'E')
      .replace(/Nitelikli Yatırımcı/g, 'F'),
  );
  assert.equal(d.hedef, null);
  assert.equal(d.arzOrani, null);
  assert.equal(d.degerleme, null);
  assert.equal(d.baslangic, null);
  assert.equal(d.bitis, null);
  assert.equal(d.nitelikli, null);
  assert.equal(d.fonlandi, null); // hedef yok: hedefe ulaştı mı bilinmez
});

test('detay: değerleme hedef÷arz ile tutmuyorsa (yatırım öncesi olabilir) null', () => {
  const d = startupburada.detay(tekbas.replace(/297.000.000/g, '280.000.000'));
  assert.equal(d.degerleme, null);
  assert.equal(d.arzOrani, 0.0572);
});

test('detay: ondalıklı tutar null döner', () => {
  const d = startupburada.detay(tekbas.replace(/17\.136\.310/g, '17.136,50'));
  assert.equal(d.toplanan, null);
});

test('detay: girişim adı kart başlığı, yoksa <title>, ikisi de yoksa null', () => {
  const kartsiz = tekbas.replace(/<div class="top"[\s\S]*?<div class="text-default  campaign-info/, '<div class="text-default  campaign-info');
  assert.notEqual(kartsiz, tekbas);
  assert.equal(startupburada.detay(kartsiz).ad, 'Tekbaş Teknoloji'); // <title> "Tekbaş Teknoloji Fonlaması"
  const ikisiz = kartsiz.replace(/<title[\s\S]*?<\/title>/gi, '');
  assert.equal(startupburada.detay(ikisiz).ad, null);
});

test('liste: kayıtlı ana sayfada yalnız "Hedefine Ulaşan Kampanyalar" var, açık/yakında kart yok', () => {
  assert.ok(liste.includes(BASLIK));
  assert.deepEqual(startupburada.liste(liste, LISTE_URL), []);
});

// Aktif/Yakında sekme bloğu tarayıcıda çizilir; kayıt anında statik HTML'de yoktu. Bölüm başlığı
// biten sözlüğünde olmayan bir kart bloğu BİLEREK aktif sayılır (fail-open); keşif adımı detay().bitti ile eler.
test('liste: tanınmayan başlıklı kart bloğu aktif, adresler mutlak, mükerrer kart tek kayıt', () => {
  const k = startupburada.liste(liste.replace(BASLIK, 'Açık Yatırım Fırsatları'), LISTE_URL);
  assert.equal(k.length, 9);
  assert.ok(k.every((x) => x.bolum === 'aktif'));
  const kayit = k.find((x) => x.url === 'https://www.startupburada.com/kampanyalar/tekbas-teknoloji');
  assert.ok(kayit);
  assert.equal(kayit.ad, 'tekbas-teknoloji'); // geçici: URL sluğu
  assert.equal(new Set(k.map((x) => x.url)).size, 9);
});

test('liste: "Yakında" başlıklı blok yakinda; bilinen biten başlıklar atlanır', () => {
  const yakinda = startupburada.liste(liste.replace(BASLIK, 'Yakında Başlayacaklar'), LISTE_URL);
  assert.equal(yakinda.length, 9);
  assert.ok(yakinda.every((x) => x.bolum === 'yakinda'));
  const biten = ['Sona Eren Kampanyalar', 'Tamamlanan Kampanyalar', 'Hedefine Ulaşan Kampanyalar', 'Arşiv', 'İptal Edilenler', 'Başarısız Kampanyalar', 'Fonlanan Projeler'];
  for (const b of biten) assert.deepEqual(startupburada.liste(liste.replace(BASLIK, b), LISTE_URL), [], b);
});

test('liste: bağlantısı olmayan kart atlanır, bozuk slug düşürmez', () => {
  const kart = (ic: string) => `<section class="x"><div class="text-default  d32">Açık</div><div class="card-main">${ic}</div></section>`;
  const bagsiz = kart('<div class="content">Başlıksız</div>');
  const bozuk = kart('<a href="kampanyalar/bozuk%E0%A4%A">Bozuk</a>');
  const k = startupburada.liste(bagsiz + bozuk, LISTE_URL);
  assert.equal(k.length, 1);
  assert.equal(k[0].ad, 'bozuk%E0%A4%A');
});
