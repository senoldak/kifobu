import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { trinkfon } from './trinkfon.ts';

const oku = (ad: string) => readFileSync(new URL(`./__ornekler__/${ad}`, import.meta.url), 'utf8');
const liste = oku('trinkfon-liste.html');
const pupaq = oku('trinkfon-pupaq.html');
const LISTE_URL = 'https://kfs.trinkfon.com/projeler/';

test('okuyucu kimliği', () => {
  assert.equal(trinkfon.platform, 'trinkfon');
  assert.deepEqual(trinkfon.listeUrller, [LISTE_URL]);
});

test('detay: biten, hedefine ulaşamayan kampanya (Pupaq)', () => {
  const d = trinkfon.detay(pupaq);
  assert.equal(d.ad, 'Pupaq');
  assert.equal(d.hedef, 1000032);
  assert.equal(d.toplanan, 121782);
  assert.equal(d.yatirimci, 23);
  assert.equal(d.nitelikli, 0);
  assert.equal(d.baslangic, '2026-08-19');
  assert.equal(d.bitis, '2026-10-16');
  assert.equal(d.bitti, true);
  assert.equal(d.fonlandi, false);
  assert.equal(d.arzOrani, null);
  assert.equal(d.degerleme, null);
  assert.equal(d.kalanGun, null);
  assert.equal(d.sonGun, false);
});

test('detay: eski "Alınan:" etiketi desteklenir', () => {
  assert.equal(trinkfon.detay(pupaq.replace('Toplanan:', 'Alınan:')).toplanan, 121782);
});

test('detay: etiket silinince null döner, 0 değil; platform geneli sayılara düşmez', () => {
  assert.equal(trinkfon.detay(pupaq.replace('Toplanan:', 'X')).toplanan, null);
  assert.equal(trinkfon.detay(pupaq.replace('Toplam Yatırımcı:', 'X')).yatirimci, null);
});

test('detay: açık kampanyada kalan gün ve son gün', () => {
  const acik = pupaq.replace(/>\s*Fonlama sona erdi\s*</, '>5 gün kaldı<').replace(/Kampanya\s+Sona Erdi/, 'Devam Ediyor');
  const d = trinkfon.detay(acik);
  assert.equal(d.bitti, false);
  assert.equal(d.fonlandi, null);
  assert.equal(d.kalanGun, 5);
  assert.equal(d.sonGun, false);
  const son = trinkfon.detay(acik.replace('5 gün kaldı', 'SON GÜN'));
  assert.equal(son.sonGun, true);
  assert.equal(son.kalanGun, 0);
});

test('detay: açıklama metnindeki "sona erdi" kampanyayı bitirmez', () => {
  const acik = pupaq.replace(/>\s*Fonlama sona erdi\s*</, '>Yatırım Yap<').replace(/Kampanya\s+Sona Erdi/, 'Devam Ediyor');
  assert.equal(trinkfon.detay(acik.replace('Pupaq, yaşam', 'Fonlama sona erdi, yaşam')).bitti, false);
});

test('detay: bitip hedefe ulaşan kampanya fonlandı sayılır', () => {
  const d = trinkfon.detay(pupaq.replace('121.782 ₺', '1.200.000 ₺'));
  assert.equal(d.bitti, true);
  assert.equal(d.fonlandi, true);
});

test('detay: girişim adı h1den, profil başlığından, titledan; hiçbiri yoksa null', () => {
  const h2siz = pupaq.replace(/<h2[^>]*>Pupaq<\/h2>/, '');
  assert.equal(trinkfon.detay(h2siz).ad, 'Pupaq');
  assert.equal(trinkfon.detay(h2siz.replace(/<h1[\s\S]*?<\/h1>/gi, '')).ad, 'Pupaq');
  assert.equal(trinkfon.detay(h2siz.replace(/<title[\s\S]*?<\/title>/gi, '')).ad, null);
});

test('liste: örnekte yalnız bitmiş kampanyalar var, hiçbiri dönmez', () => {
  assert.deepEqual(trinkfon.liste(liste, LISTE_URL), []);
});

const kart = (yol: string, rozet: string) =>
  `<article><span class="px-2.5 rounded-full">${rozet}</span><h3><a href="${yol}">X</a></h3></article>`;
const bolum = (n: number, baslik: string, ...kartlar: string[]) =>
  `<section aria-labelledby="grid-heading-${n}"><h2 id="grid-heading-${n}">${baslik}</h2>${kartlar.join('')}</section>`;

test('liste: açık ve yakında bölümleri, mutlak url; bitmiş bölümler ve tablo kopyaları atlanır', () => {
  const html =
    bolum(1, 'Aktif Kampanyalar', kart('/projeler/Acik%20Ad/kampanya/', 'Aktif')) +
    bolum(2, 'Yakında Başlayacak Kampanyalar', kart('/projeler/yakin/kampanya/', 'Yakında')) +
    bolum(3, 'Tamamlanan Kampanyalar', kart('/projeler/bitmis/kampanya/', 'Tamamlandı')) +
    '<section aria-labelledby="table-heading-1"><h2>Aktif Kampanyalar</h2><a href="/projeler/tablo/kampanya/">T</a></section>';
  const k = trinkfon.liste(html, LISTE_URL);
  assert.deepEqual(k, [
    { ad: 'Acik Ad', url: 'https://kfs.trinkfon.com/projeler/Acik%20Ad/kampanya/', bolum: 'aktif' },
    { ad: 'yakin', url: 'https://kfs.trinkfon.com/projeler/yakin/kampanya/', bolum: 'yakinda' },
  ]);
  for (const x of k) assert.match(new URL(x.url).pathname, /^\/projeler\/[^/]+\/kampanya\/$/);
});

test('liste: "Hedefine Ulaşan" gibi bitmiş başlıklar ve bitmiş rozetler atlanır', () => {
  for (const baslik of ['Hedefine Ulaşan Kampanyalar', 'Fonlanan', 'Sonuçlanan', 'Kapanan', 'Geçmiş', 'Arşiv', 'Reddedilen']) {
    assert.deepEqual(trinkfon.liste(bolum(1, baslik, kart('/projeler/x/kampanya/', 'Aktif')), LISTE_URL), [], baslik);
  }
  for (const rozet of ['Hedefine Ulaşan', 'Kapandı', 'Reddedilen']) {
    assert.deepEqual(trinkfon.liste(bolum(1, 'Kampanyalar', kart('/projeler/x/kampanya/', rozet)), LISTE_URL), [], rozet);
  }
});

test('liste: bilinmeyen başlık bilerek aktif sayılır (fail-open)', () => {
  const k = trinkfon.liste(bolum(1, 'Öne Çıkanlar', kart('/projeler/yeni/kampanya/', 'Aktif')), LISTE_URL);
  assert.deepEqual(k, [{ ad: 'yeni', url: 'https://kfs.trinkfon.com/projeler/yeni/kampanya/', bolum: 'aktif' }]);
});

test('detay: açıklamadaki "son gün" ve "3 gün kaldı" durum sayılmaz', () => {
  const acik = pupaq.replace(/>\s*Fonlama sona erdi\s*</, '>Yatırım Yap<').replace(/Kampanya\s+Sona Erdi/, 'Devam Ediyor');
  const d = trinkfon.detay(acik.replace('Pupaq, yaşam', 'Son Gün! 3 gün kaldı. Pupaq, yaşam'));
  assert.equal(d.bitti, false);
  assert.equal(d.sonGun, false);
  assert.equal(d.kalanGun, null);
});

test('liste: bağlantısız kart atlanır, bozuk yüzde kodlu slug düşürmez', () => {
  const html = bolum(1, 'Aktif Kampanyalar', '<article><span class="rounded-full">Aktif</span>YAKINDA</article>', kart('/projeler/bozuk%E0%A4%A/kampanya/', 'Aktif'));
  const k = trinkfon.liste(html, LISTE_URL);
  assert.equal(k.length, 1);
  assert.equal(k[0].ad, 'bozuk%E0%A4%A');
});
