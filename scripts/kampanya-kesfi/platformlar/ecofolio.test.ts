import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ecofolio } from './ecofolio.ts';

const oku = (ad: string) => readFileSync(new URL(`./__ornekler__/${ad}`, import.meta.url), 'utf8');
const liste = oku('ecofolio-liste.html');
const loopyon = oku('ecofolio-loopyon.html');
const LISTE_URL = 'https://ecofolio.com.tr/kampanyalar';

test('okuyucu kimliği', () => {
  assert.equal(ecofolio.platform, 'ecofolio');
  assert.deepEqual(ecofolio.listeUrller, [LISTE_URL]);
});

test('detay: LOOPYON (açık kampanya)', () => {
  const d = ecofolio.detay(loopyon);
  assert.equal(d.ad, 'Loopyon Su Teknolojileri');
  assert.equal(d.hedef, 35000000);
  assert.equal(d.toplanan, 1279600);
  assert.equal(d.yatirimci, 55);
  assert.equal(d.nitelikli, null);
  // Yatırım sonrası değer = öncesi 350.000.000 + hedef 35.000.000 (ek fonlu 392.000.000 kullanılmaz).
  assert.equal(d.degerleme, 385000000);
  assert.equal(d.arzOrani, 0.090909);
  assert.equal(d.baslangic, '2026-09-17');
  assert.equal(d.bitis, '2026-11-15');
  assert.equal(d.bitti, false);
  assert.equal(d.fonlandi, null);
  assert.equal(d.kalanGun, null);
  assert.equal(d.sonGun, false);
});

test('detay: eski bülten düzenli ifadesiyle aynı toplanan (gerileme tabanı)', () => {
  const eski = loopyon.match(/Toplanan Talep<\/div><div[^>]*>([0-9.,]+)<!-- -->\s*TL/i);
  assert.equal(Number(eski![1].replace(/\./g, '')), 1279600);
  assert.equal(ecofolio.detay(loopyon).toplanan, 1279600);
});

test('detay: etiket silinince null döner, 0 değil', () => {
  assert.equal(ecofolio.detay(loopyon.replace('Toplanan Talep', 'X')).toplanan, null);
  assert.equal(ecofolio.detay(loopyon.replace('Fonlama Hedefi', 'X')).hedef, null);
  assert.equal(ecofolio.detay(loopyon.replace('Yatırımcı Sayısı', 'X')).yatirimci, null);
});

test('detay: ondalıklı tutar yanlış sayıya dönmez', () => {
  assert.equal(ecofolio.detay(loopyon.replace('1.279.600<!-- --> TL', '1.279.600,50<!-- --> TL')).toplanan, null);
});

test('detay: durum alanındaki "Son N Gün" kalan gün olur; açıklamadaki etkilemez', () => {
  const durumlu = loopyon.replace('</h1>', '</h1><span>Son 3 Gün</span>');
  const d = ecofolio.detay(durumlu);
  assert.equal(d.kalanGun, 3);
  assert.equal(d.sonGun, false);
  assert.equal(ecofolio.detay(loopyon.replace('</h1>', '</h1><span>Son 1 Gün</span>')).sonGun, true);
  const aciklama = loopyon.replace('Sera işletmesinin su', 'Son 2 Gün! Kampanya sona erdi. Sera işletmesinin su');
  const a = ecofolio.detay(aciklama);
  assert.equal(a.kalanGun, null);
  assert.equal(a.sonGun, false);
  assert.equal(a.bitti, false);
});

test('detay: platformun durum alanında "Kampanya Sona Erdi" bitirir; hedefe ulaşmadıysa fonlanmadı', () => {
  const d = ecofolio.detay(loopyon.replace('</h1>', '</h1><div>Kampanya Sona Erdi</div>'));
  assert.equal(d.bitti, true);
  assert.equal(d.fonlandi, false);
  assert.equal(d.kalanGun, null);
  const ulasti = ecofolio.detay(
    loopyon.replace('</h1>', '</h1><div>Kampanya Sona Erdi</div>').replace('1.279.600<!-- --> TL', '36.000.000<!-- --> TL'),
  );
  assert.equal(ulasti.fonlandi, true);
});

test('detay: girişim adı h1den, h2den, titledan; hiçbiri yoksa null', () => {
  const h1siz = loopyon.replace(/<h1[\s\S]*?<\/h1>/gi, '');
  assert.equal(ecofolio.detay(h1siz).ad, 'Loopyon Su Teknolojileri');
  const h2siz = h1siz.replace(/<h2[^>]*>Loopyon Su Teknolojileri<\/h2>/, '');
  assert.equal(ecofolio.detay(h2siz).ad, 'Loopyon Su Teknolojileri');
  assert.equal(ecofolio.detay(h2siz.replace(/<title[\s\S]*?<\/title>/gi, '')).ad, null);
});

test('detay: JSON verisi yoksa tarih, değerleme ve oran null', () => {
  const d = ecofolio.detay(loopyon.replace(/enterprise_amount/g, 'x').replace(/supply_rate/g, 'y').replace(/start_date/g, 'z'));
  assert.equal(d.degerleme, null);
  assert.equal(d.arzOrani, null);
  assert.equal(d.baslangic, null);
});

test('liste: örnekte yalnız LOOPYON açık, başarılılar dönmez', () => {
  assert.deepEqual(ecofolio.liste(liste, LISTE_URL), [
    { ad: 'loopyon', url: 'https://ecofolio.com.tr/kampanyalar/loopyon', bolum: 'aktif' },
  ]);
});

const kart = (yol: string, rozet: string) =>
  `<article><a class="block" href="${yol}"><div><span class="inline-block px-3 py-1 text-xs">${rozet}</span></div></a></article>`;

test('liste: Yakında rozeti yakinda, Aktif aktif; mutlak url', () => {
  const k = ecofolio.liste(kart('/kampanyalar/acik%20ad', 'Aktif') + kart('/kampanyalar/yakin', 'Yakında'), LISTE_URL);
  assert.deepEqual(k, [
    { ad: 'acik ad', url: 'https://ecofolio.com.tr/kampanyalar/acik%20ad', bolum: 'aktif' },
    { ad: 'yakin', url: 'https://ecofolio.com.tr/kampanyalar/yakin', bolum: 'yakinda' },
  ]);
});

test('liste: bitmiş rozetler atlanır', () => {
  for (const rozet of ['Başarılı', 'Başarısız', 'İptal Edildi', 'Tamamlandı', 'Sona Erdi', 'Hedefine Ulaştı', 'Kapandı', 'Reddedildi']) {
    assert.deepEqual(ecofolio.liste(kart('/kampanyalar/x', rozet), LISTE_URL), [], rozet);
  }
});

test('liste: bilinmeyen rozet bilerek aktif sayılır (fail-open)', () => {
  const k = ecofolio.liste(kart('/kampanyalar/yeni', 'Öne Çıkan'), LISTE_URL);
  assert.deepEqual(k, [{ ad: 'yeni', url: 'https://ecofolio.com.tr/kampanyalar/yeni', bolum: 'aktif' }]);
});

test('liste: bağlantısız kart atlanır, bozuk yüzde kodlu slug düşürmez', () => {
  const html = '<article><span class="inline-block px-3 py-1">Aktif</span></article>' + kart('/kampanyalar/bozuk%E0%A4%A', 'Aktif');
  const k = ecofolio.liste(html, LISTE_URL);
  assert.equal(k.length, 1);
  assert.equal(k[0].ad, 'bozuk%E0%A4%A');
});

test('liste: fon türü SHRE olmayan kampanya atlanır; türü bilinmeyen korunur', () => {
  const veri = (tur: string, slug: string) => `\\"fund_collection_type\\":\\"${tur}\\",\\"seo\\":{\\"id\\":1,\\"slug\\":\\"${slug}\\"}`;
  const html =
    `<script>${veri('SHRE', 'pay')}${veri('DEBT', 'borc')}</script>` +
    kart('/kampanyalar/pay', 'Aktif') + kart('/kampanyalar/borc', 'Aktif') + kart('/kampanyalar/bilinmeyen', 'Aktif');
  assert.deepEqual(ecofolio.liste(html, LISTE_URL).map((k) => k.ad), ['pay', 'bilinmeyen']);
});
