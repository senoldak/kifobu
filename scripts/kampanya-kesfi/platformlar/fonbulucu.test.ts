import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fonbulucu } from './fonbulucu.ts';

const oku = (ad: string) => readFileSync(new URL(`./__ornekler__/${ad}`, import.meta.url), 'utf8');
// Örnekler 18 Kasım'da kaydedildi: ana sayfada "Aktif fonlama bulunmamaktadır" yazıyor, 3 bağlantısız "Yakında" kartı var.
const anasayfa = oku('fonbulucu-anasayfa.html');
// "Başaranlar Kulübü"ndeki biten kampanya (kod MRH6S3).
const shiftplanner = oku('fonbulucu-shiftplanner.html');
const LISTE = 'https://invest.fonbulucu.com/';

test('okuyucu kimliği', () => {
  assert.equal(fonbulucu.platform, 'fonbulucu');
  assert.deepEqual(fonbulucu.listeUrller, [LISTE]);
});

test('liste: aktif yok, biten Başaranlar kartları alınmaz, 3 bağlantısız yakında kartı detaysiz döner', () => {
  const k = fonbulucu.liste(anasayfa, LISTE);
  assert.deepEqual(k, [
    { ad: 'Dijital İkiz Platformu', url: `${LISTE}#yakinda-dijital-ikiz-platformu`, bolum: 'yakinda', detaysiz: true },
    { ad: 'Akıllı Yüzeyler', url: `${LISTE}#yakinda-akilli-yuzeyler`, bolum: 'yakinda', detaysiz: true },
    { ad: 'Giyilebilir Sağlık', url: `${LISTE}#yakinda-giyilebilir-saglik`, bolum: 'yakinda', detaysiz: true },
  ]);
});

// Açık kampanya kartı ana sayfada henüz görülmedi (bugün hiç yok): "Yatırım Fırsatları" bölümüne
// /kampanya/<KOD> bağlantılı kart konur. Biçim varsayımdır; tanınmayan başlık da fail-open 'aktif' sayılır.
const bos = '<div class="ivf-info-box ib-yellow" style="padding: 1rem 3rem;width: 100%">\n                    Aktif fonlama bulunmamaktadır.\n                </div>';
const aktifKart = (kod: string) => `<a class="detail-card" href="https://invest.fonbulucu.com/kampanya/${kod}">Kart</a>`;

test('liste: Yatırım Fırsatları bölümündeki /kampanya/<KOD> bağlantısı aktif, mutlak adresle döner', () => {
  assert.ok(anasayfa.includes(bos), 'örnek sayfada boş-durum kutusu beklenir');
  const html = anasayfa.replace(bos, aktifKart('AB12CD') + aktifKart('AB12CD') + aktifKart('ZZ99YY'));
  const k = fonbulucu.liste(html, LISTE).filter((x) => x.bolum === 'aktif');
  assert.deepEqual(k.map((x) => x.url), [`${LISTE}kampanya/AB12CD`, `${LISTE}kampanya/ZZ99YY`]);
  assert.equal(k[0].ad, 'AB12CD'); // geçici: kampanya kodu
  assert.equal(k[0].detaysiz, undefined);
  assert.equal(fonbulucu.liste(html, LISTE).filter((x) => x.bolum === 'yakinda').length, 3);
});

test('liste: tanınmayan başlık altındaki kampanya bağlantısı BİLEREK aktif sayılır (fail-open, detay().bitti eler)', () => {
  const html = anasayfa.replace('<div class="title">Yatırım Fırsatları', '<div class="title">Yeni Bölüm Adı').replace(bos, aktifKart('AB12CD'));
  assert.equal(fonbulucu.liste(html, LISTE).filter((x) => x.bolum === 'aktif').length, 1);
});

test('liste: biten başlıklar (Başaranlar Kulübü, Fonlandı, Fonlanamadı) ve "kayit" bağlantısı alınmaz', () => {
  const k = fonbulucu.liste(anasayfa, LISTE);
  assert.ok(!k.some((x) => x.url.includes('/kampanya/')), 'kayit ve biten kodlar yok');
  const html = anasayfa.replace('<div class="title">Yatırım Fırsatları', '<div class="title">Fonlanamayanlar').replace(bos, aktifKart('AB12CD'));
  assert.ok(!fonbulucu.liste(html, LISTE).some((x) => x.bolum === 'aktif'));
});

test('liste: yakında kartının düğmesi gerçek /kampanya/<KOD> adresi taşıyorsa detaysiz değil, o adresle döner', () => {
  const kod = 'https://invest.fonbulucu.com/kampanya/NEW123';
  const html = anasayfa.replace('<a href="#" class="simple-cards-w-button-card_button type-2">', `<a href="${kod}" class="simple-cards-w-button-card_button type-2">`);
  const y = fonbulucu.liste(html, LISTE).filter((x) => x.bolum === 'yakinda');
  assert.equal(y.length, 3);
  assert.deepEqual(y[0], { ad: 'NEW123', url: kod, bolum: 'yakinda' });
  assert.equal(y[1].detaysiz, true);
});

test('liste: hiç bölüm yoksa boş döner, istisna atmaz', () => {
  assert.deepEqual(fonbulucu.liste('<html><body>bakım</body></html>', LISTE), []);
});

test('detay: biten ve hedefine ulaşan kampanya (Shiftplanner)', () => {
  const d = fonbulucu.detay(shiftplanner);
  assert.equal(d.ad, 'Shiftplanner');
  assert.equal(d.hedef, 1560000);
  assert.equal(d.arzOrani, 0.08);
  assert.equal(d.degerleme, null); // sayfa değerleme yazmıyor; keşif hedef ÷ arz hesaplar
  assert.equal(d.baslangic, '2022-04-25');
  assert.equal(d.bitis, '2022-06-24');
  assert.equal(d.toplanan, 1875952);
  assert.equal(d.yatirimci, 1024);
  assert.equal(d.nitelikli, 63);
  assert.equal(d.bitti, true);
  assert.equal(d.fonlandi, true);
  assert.equal(d.kalanGun, null);
  assert.equal(d.sonGun, false);
});

test('detay: etiket silinince null döner, 0 değil', () => {
  const d = fonbulucu.detay(shiftplanner.replaceAll('Alınan Toplam Yatırım', 'X').replaceAll('Yatırımcı Sayısı', 'X'));
  assert.equal(d.toplanan, null);
  assert.equal(d.yatirimci, null);
});

test('detay: ondalıklı tutar null olur, diğer alanlar etkilenmez', () => {
  const d = fonbulucu.detay(shiftplanner.replace('₺ 1.560.000</div>', '₺ 1.560.000,50</div>'));
  assert.equal(d.hedef, null);
  assert.equal(d.toplanan, 1875952);
});

test('detay: başarısız/fonlanamadı kampanya bitti, fonlandi false', () => {
  const d = fonbulucu.detay(shiftplanner.replace('<span class="detail">Başarılı</span>', '<span class="detail">Fonlanamadı</span>'));
  assert.equal(d.bitti, true);
  assert.equal(d.fonlandi, false);
});

test('detay: durum Fonlamada ise bitmedi; açıklamada "sona erdi, tamamlandı" geçmesi etkilemez', () => {
  const acik = shiftplanner
    .replace('<span class="detail">Başarılı</span>', '<span class="detail">Fonlamada</span>')
    .replace('Fonlama süresi sona ermiştir. Fonlama başarılı olarak sonlanmıştır.', '')
    .replace('<h3>Bedelsiz Pay Hediye Kampanyası</h3>', '<h3>Kampanya sona erdi, tamamlandı, hedefine ulaştı</h3>');
  const d = fonbulucu.detay(acik);
  assert.equal(d.bitti, false);
  assert.equal(d.fonlandi, null);
  assert.equal(d.sonGun, false);
});

test('detay: durum Sonlandırmada ise bitti; fonlandi toplanan >= hedeften', () => {
  const d = fonbulucu.detay(shiftplanner.replace('<span class="detail">Başarılı</span>', '<span class="detail">Sonlandırmada</span>'));
  assert.equal(d.bitti, true);
  assert.equal(d.fonlandi, true);
});

test('detay: girişim adı h1den, yoksa titledan, ikisi de yoksa null', () => {
  assert.equal(fonbulucu.detay(shiftplanner.replace('<body', '<h1>Başka Ad</h1><body')).ad, 'Başka Ad');
  assert.equal(fonbulucu.detay(shiftplanner).ad, 'Shiftplanner');
  assert.equal(fonbulucu.detay(shiftplanner.replace(/<title[\s\S]*?<\/title>/i, '')).ad, null);
});

test('detay: tarihler yalnız fonlama penceresinden (kampanya kapanış tarihi değil)', () => {
  const d = fonbulucu.detay(shiftplanner.replaceAll('Fonlama Bitiş', 'X').replaceAll('Fonlama Başlangıç', 'X'));
  assert.equal(d.baslangic, null);
  assert.equal(d.bitis, null);
});
