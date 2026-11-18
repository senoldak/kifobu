import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { startupfon } from './startupfon.ts';

const oku = (ad: string) => readFileSync(new URL(`./__ornekler__/${ad}`, import.meta.url), 'utf8');
// Örnekler 18 Kasım'da kaydedildi. Liste (/yatirim): Rownd Precision ve Bucked Games "Ön Yatırım", Citio ve DSALTA
// "Fonlanıyor"; Ingosa'nın rozeti "Fonlama Bitti" ama DURUM alanı hâlâ "Ön Yatırım"; ötekiler Fonlandı / Fonlama Bitti.
const listeHtml = oku('startupfon-liste.html');
const citio = oku('startupfon-citio.html'); // fonlanıyor
const aalo = oku('startupfon-aalo-atomics.html'); // fonlandı (Startupfon Fund Coop)
const LISTE = 'https://www.startupfon.com/yatirim';
const KOK = 'https://www.startupfon.com/girisimler/';

test('okuyucu kimliği', () => {
  assert.equal(startupfon.platform, 'startupfon');
  assert.deepEqual(startupfon.listeUrller, [LISTE]);
});

test('liste: fonlananlar aktif, ön yatırımdakiler yakında; bitenler, Fund Coop ve çift kopya alınmaz', () => {
  assert.deepEqual(startupfon.liste(listeHtml, LISTE), [
    { ad: 'Rownd Precision', url: `${KOK}rownd-precision`, bolum: 'yakinda' },
    { ad: 'Citio', url: `${KOK}citio`, bolum: 'aktif' },
    { ad: 'DSALTA', url: `${KOK}dsalta`, bolum: 'aktif' },
    { ad: 'Bucked Games', url: `${KOK}bucked-games`, bolum: 'yakinda' },
  ]);
});

test('liste: rozet ile DURUM çelişirse biten durum kazanır (Ingosa: rozet "Fonlama Bitti", DURUM "Ön Yatırım")', () => {
  assert.ok(listeHtml.includes('girisimler/ingosa'));
  assert.ok(!startupfon.liste(listeHtml, LISTE).some((k) => k.url.endsWith('/ingosa')));
});

/** Rownd Precision kartının (sayfada masaüstü + mobil, iki kopya) DURUM alanını değiştirir; rozet olduğu gibi kalır. */
const durumuDegistir = (html: string, yeni: string) =>
  html.replace(/(<h6\b[^>]*>Rownd Precision<\/h6>[\s\S]*?>)Ön Yatırım(<\/h6>)/g, `$1${yeni}$2`);

test('liste: tanınmayan durum BİLEREK aktif sayılır (fail-open, detay().bitti eler)', () => {
  const html = durumuDegistir(listeHtml, 'Yeni Aşama');
  const k = startupfon.liste(html, LISTE).find((x) => x.url.endsWith('/rownd-precision'));
  // Rozet hâlâ "Ön Yatırım" diyor; yakında sayılır. Rozet de tanınmazsa aktif.
  assert.equal(k?.bolum, 'yakinda');
  const kart = '<div data-framer-name="Post"><p class="framer-text">Gizemli</p><h6 class="framer-text">Yeni Girişim</h6>'
    + '<p class="framer-text">DURUM</p></div><div><h6 class="framer-text">Bambaşka</h6></div>'
    + '<p class="framer-text">FON</p></div><div><h6 class="framer-text">Bir GSYF</h6></div>'
    + '<a href="./girisimler/yeni-girisim">İncele</a></div>';
  assert.deepEqual(startupfon.liste(kart, LISTE), [{ ad: 'Yeni Girişim', url: `${KOK}yeni-girisim`, bolum: 'aktif' }]);
});

test('liste: DURUM "Fonlandı" olan kart alınmaz', () => {
  const html = durumuDegistir(listeHtml, 'Fonlandı');
  assert.ok(!startupfon.liste(html, LISTE).some((k) => k.url.endsWith('/rownd-precision')));
});

test('liste: bağlantısız ön yatırım kartı detaysiz döner', () => {
  const kart = '<div data-framer-name="Post"><p class="framer-text">Ön Yatırım</p><h6 class="framer-text">Gizli Girişim</h6>'
    + '<p class="framer-text">DURUM</p></div><div><h6 class="framer-text">Ön Yatırım</h6></div>'
    + '<p class="framer-text">FON</p></div><div><h6 class="framer-text">Bir GSYF</h6></div></div>';
  assert.deepEqual(startupfon.liste(kart, LISTE), [
    { ad: 'Gizli Girişim', url: `${LISTE}#yakinda-gizli-girisim`, bolum: 'yakinda', detaysiz: true },
  ]);
});

test('liste: kart yoksa boş döner, istisna atmaz', () => {
  assert.deepEqual(startupfon.liste('<html><body>bakım</body></html>', LISTE), []);
});

test('detay: fonlanan kampanya (Citio): ad ve durum okunur, rakamlar giriş arkasında olduğundan null', () => {
  const d = startupfon.detay(citio);
  assert.equal(d.ad, 'Citio');
  assert.equal(d.bitti, false);
  assert.equal(d.fonlandi, null);
  for (const alan of ['hedef', 'arzOrani', 'degerleme', 'baslangic', 'bitis', 'toplanan', 'yatirimci', 'nitelikli', 'kalanGun', 'onTalep', 'onTalepKisi'] as const) {
    assert.equal(d[alan], null, alan);
  }
  assert.equal(d.sonGun, false);
});

test('detay: fonlandı durumu bitti ve fonlandi true', () => {
  const d = startupfon.detay(aalo);
  assert.equal(d.ad, 'Aalo Atomics');
  assert.equal(d.bitti, true);
  assert.equal(d.fonlandi, true);
  assert.equal(d.kalanGun, null);
});

test('detay: "Fonlama Bitti" bitti, sonuç bilinmediğinden fonlandi null', () => {
  const d = startupfon.detay(citio.replaceAll('>Fonlanıyor</p>', '>Fonlama Bitti</p>'));
  assert.equal(d.bitti, true);
  assert.equal(d.fonlandi, null);
});

test('detay: açıklama metninde "fonlandı / fonlama bitti" geçmesi bitti yapmaz', () => {
  const d = startupfon.detay(citio.replace('Citio, Türkiye’ye gelen', 'Fonlandı, fonlama bitti, tamamlandı. Citio, Türkiye’ye gelen'));
  assert.equal(d.bitti, false);
});

test('detay: ad öğesi yoksa null', () => {
  assert.equal(startupfon.detay(citio.replaceAll('DETAYLAR İÇİN GİRİŞ YAP', 'X')).ad, null);
});
