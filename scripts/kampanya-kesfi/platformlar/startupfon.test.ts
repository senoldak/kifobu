import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { startupfon } from './startupfon.ts';
import { PDF_AYRACI } from '../../../src/lib/kampanya-takip.ts';

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

// ---- Zincir: tanıtım sayfası -> platform sayfası (/startups/<id>, girişsiz) -> SPK bilgi formu PDF'i ----
// Platform sayfaları ve bilgi formları 18 Kasım'da girişsiz kaydedildi; PDF'ler `pdftotext -enc UTF-8` ile metne çevrildi.
const platformCitio = oku('startupfon-platform-citio.html');
const platformRuuf = oku('startupfon-platform-ruuf.html');
const formCitio = oku('startupfon-citio-bilgi-formu.txt');
const formRuuf = oku('startupfon-ruuf-bilgi-formu.txt');
const PLATFORM = 'https://platform.startupfon.com';

test('sonrakiSayfa: tanıtım sayfasından platform sayfasına, oradan bilgi formu PDF\'ine; PDF\'ten sonra durur', () => {
  const sonraki = startupfon.sonrakiSayfa!;
  assert.equal(sonraki(citio, `${KOK}citio`), `${PLATFORM}/startups/63`);
  assert.equal(sonraki(platformCitio, `${PLATFORM}/startups/63`), `${PLATFORM}/api/file/b2f83454-2aa9-456e-9172-3c68f36661b4.pdf`);
  assert.equal(sonraki(platformRuuf, `${PLATFORM}/startups/49`), `${PLATFORM}/api/file/db6ff288-1914-4c72-8864-1cc5f29d6e91.pdf`);
  assert.equal(sonraki(formCitio, `${PLATFORM}/api/file/b2f83454-2aa9-456e-9172-3c68f36661b4.pdf`), null);
});

test('sonrakiSayfa: platform bağlantısı ya da bilgi formu yoksa null', () => {
  const sonraki = startupfon.sonrakiSayfa!;
  assert.equal(sonraki(citio.replaceAll('platform.startupfon.com/startups/63', 'x'), `${KOK}citio`), null);
  assert.equal(sonraki(platformCitio.replaceAll('Bilgi formu', 'Sunum'), `${PLATFORM}/startups/63`), null);
});

const zincir = (...parcalar: string[]) => parcalar.join('\n');

test('detay (zincir): Citio hedefi platformdan, tarihler ve değerleme bilgi formundan', () => {
  const d = startupfon.detay(zincir(citio, platformCitio, PDF_AYRACI + formCitio));
  assert.equal(d.ad, 'Citio');
  assert.equal(d.hedef, 6_000_000);
  assert.equal(d.baslangic, '2026-11-17');
  assert.equal(d.bitis, '2027-01-14');
  // Fonlama öncesi 754.554.000 TL (formun TL karşılığı) + hedef 6.000.000 = fonlama sonrası; %20 ek satış katılmaz.
  assert.equal(d.degerleme, 760_554_000);
  assert.equal(d.arzOrani, null);
  assert.equal(d.toplanan, null); // platform toplanan tutarı yayımlamıyor (collectedAmount hep null)
  assert.equal(d.yatirimci, null);
  assert.equal(d.bitti, false);
  assert.equal(d.fonlandi, null);
});

test('detay (zincir): RUUF formu "TL değerleme baz alındığında" ve eğik çizgili tarih; platform durumu "fonlanmadı"', () => {
  const d = startupfon.detay(zincir(platformRuuf, PDF_AYRACI + formRuuf));
  assert.equal(d.ad, 'RUUF');
  assert.equal(d.hedef, 5_000_000);
  assert.equal(d.baslangic, '2025-06-10');
  assert.equal(d.bitis, '2025-08-09');
  assert.equal(d.degerleme, 194_909_000 + 5_000_000);
  assert.equal(d.bitti, true);
  assert.equal(d.fonlandi, false);
});

test('detay (zincir): PDF yoksa hedef platformdan gelir, tarih ve değerleme null kalır', () => {
  const d = startupfon.detay(zincir(citio, platformCitio));
  assert.equal(d.hedef, 6_000_000);
  assert.equal(d.baslangic, null);
  assert.equal(d.bitis, null);
  assert.equal(d.degerleme, null);
});

test('detay (zincir): formda değer yoksa null; ön talep tarihleri fonlama penceresi sayılmaz', () => {
  const bos = 'Kampanya Süresi : 60 gün Başlangıç Tarihi Bitiş Tarihi Çıkarılacak Payların Türü';
  const d = startupfon.detay(zincir(platformCitio, PDF_AYRACI + bos));
  assert.equal(d.baslangic, null); // platformdaki preInvestmentStartDate (2026-10-20) kullanılmaz
  assert.equal(d.bitis, null);
  assert.equal(d.degerleme, null);
  assert.equal(d.hedef, 6_000_000);
});

test('detay (zincir): platform hedefi okunamazsa formdaki "Hedeflenen Fon Tutarı"ndan; ikisi de yoksa null', () => {
  const hedefsiz = platformCitio.replace('"totalinvestmentamount":"6000000"', '"totalinvestmentamount":""');
  assert.equal(startupfon.detay(zincir(hedefsiz, PDF_AYRACI + formCitio)).hedef, 6_000_000);
  const d = startupfon.detay(zincir(hedefsiz, PDF_AYRACI + formCitio.replace('Hedeflenen Fon Tutarı', 'X')));
  assert.equal(d.hedef, null);
  assert.equal(d.degerleme, null); // hedef yoksa fonlama sonrası değer hesaplanmaz
});

test('detay (zincir): platform durumu "fonlandı" ise bitti, fonlandi true', () => {
  const d = startupfon.detay(zincir(citio, platformCitio.replace('"fundingstage":"fonlanıyor"', '"fundingstage":"fonlandı"')));
  assert.equal(d.bitti, true);
  assert.equal(d.fonlandi, true);
});

test('detay (zincir): bozuk __NEXT_DATA__ istisna atmaz', () => {
  const d = startupfon.detay(zincir(citio, '<script id="__NEXT_DATA__" type="application/json">{bozuk</script>'));
  assert.equal(d.ad, 'Citio');
  assert.equal(d.hedef, null);
});
