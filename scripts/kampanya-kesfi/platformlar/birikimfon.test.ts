import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { birikimfon } from './birikimfon.ts';

const oku = (ad: string) => readFileSync(new URL(`./__ornekler__/${ad}`, import.meta.url), 'utf8');
const liste = oku('birikimfon-liste.html');
const haykip = oku('birikimfon-haykip.html');
const LISTE_URL = 'https://birikimfon.com/pay-projeler';

test('okuyucu kimliği: paya dayalı projeler sayfası', () => {
  assert.equal(birikimfon.platform, 'birikimfon');
  assert.deepEqual(birikimfon.listeUrller, [LISTE_URL]);
});

test('detay: biten, hedefine ulaşan kampanya (Haykip)', () => {
  const d = birikimfon.detay(haykip);
  assert.equal(d.ad, 'Haykip');
  assert.equal(d.hedef, 2500000);
  assert.equal(d.toplanan, 2525371);
  assert.equal(d.arzOrani, 0.125);
  assert.equal(d.baslangic, '2024-10-11');
  assert.equal(d.bitis, '2024-12-09');
  assert.equal(d.bitti, true);
  assert.equal(d.fonlandi, true);
  assert.equal(d.degerleme, null);
  assert.equal(d.yatirimci, null); // sayı sayfada yok, sonradan yüklenen ayrı veriden gelir
  assert.equal(d.nitelikli, null);
  assert.equal(d.kalanGun, null);
  assert.equal(d.sonGun, false);
});

test('detay: etiket silinince null döner, 0 değil', () => {
  assert.equal(birikimfon.detay(haykip.replace('<span>Toplanan</span>', '<span>X</span>')).toplanan, null);
  assert.equal(birikimfon.detay(haykip.replace('<span>Hedef</span>', '<span>X</span>')).hedef, null);
  assert.equal(birikimfon.detay(haykip.replace('id="payarz">% 12,5', 'id="payarz">')).arzOrani, null);
});

test('detay: ondalıklı tutar yanlış sayıya çevrilmez, null olur', () => {
  assert.equal(birikimfon.detay(haykip.replace('2.525.371 ₺', '2.525.371,50 ₺')).toplanan, null);
});

test('detay: durum yalnız ilerleme kutusundaki başlıktan okunur, açıklamadan değil', () => {
  const acik = haykip.replace('<h3> FONLANDI </h3>', '');
  assert.equal(birikimfon.detay(acik).bitti, false);
  assert.equal(birikimfon.detay(acik).fonlandi, null);
  const aciklamali = acik.replace('Haykip, başladığı', 'FONLANDI sona erdi. Haykip, başladığı');
  assert.equal(birikimfon.detay(aciklamali).bitti, false);
});

test('detay: başarısız / iptal biten kampanya fonlanmadı sayılır; bilinmeyen biten sözcükte toplanan >= hedef', () => {
  for (const s of ['FONLANAMADI', 'BAŞARISIZ', 'İPTAL EDİLDİ']) {
    const d = birikimfon.detay(haykip.replace('FONLANDI', s));
    assert.equal(d.bitti, true, s);
    assert.equal(d.fonlandi, false, s);
  }
  const d = birikimfon.detay(haykip.replace('FONLANDI', 'TAMAMLANDI'));
  assert.equal(d.bitti, true);
  assert.equal(d.fonlandi, true);
  assert.equal(birikimfon.detay(haykip.replace('FONLANDI', 'TAMAMLANDI').replace('2.525.371 ₺', '100.000 ₺')).fonlandi, false);
});

test('detay: bitiş tarihi geçmişte ama durum başlığı yoksa bitti yapılmaz', () => {
  const d = birikimfon.detay(haykip.replace('<h3> FONLANDI </h3>', ''));
  assert.equal(d.bitis, '2024-12-09');
  assert.equal(d.bitti, false);
});

test('detay: girişim adı içerik başlığından, titledan; hiçbiri yoksa null (kırıntı başlığı kullanılmaz)', () => {
  const baslik = /<h2 class="title">Haykip<\/h2>/;
  assert.match(haykip, baslik);
  const h2siz = haykip.replace(baslik, '');
  assert.equal(birikimfon.detay(h2siz).ad, 'Haykip');
  assert.equal(birikimfon.detay(h2siz.replace(/<title[\s\S]*?<\/title>/gi, '')).ad, null);
  assert.equal(birikimfon.detay(haykip.replace(baslik, '<h1>Başka Ad</h1>')).ad, 'Başka Ad');
});

test('liste: örnekte aktif pay projesi yok, hiçbir şey dönmez', () => {
  assert.match(liste, /aktif proje bulunmamaktadır/);
  assert.deepEqual(birikimfon.liste(liste, LISTE_URL), []);
});

// Sitenin gerçek kart kalıbı (ana sayfadaki "Paya Dayalı" bölümü); durum başlığı bağlantısız <h2>.
const kart = (slug: string, durum: string) =>
  `<div class="col-lg-4"><div class="testimonial-item project-item mb-30">
    <div class="project-thumb"><a href="https://birikimfon.com/proje/${slug}"><img alt=""></a></div>
    <div class="project-content"><h2 class="title"><a href="https://birikimfon.com/proje/${slug}">X</a></h2>
    ${durum ? `<h2> ${durum} </h2>` : ''}
    <div class="cause-amounts"><span>Hedeflenen Yatırım</span><p>1 ₺</p></div></div></div></div>`;
const bolum = (baslik: string, ...kartlar: string[]) =>
  `<section class="project-area pb-70"><div class="container"><h2 class="title">${baslik}</h2><div class="row">${kartlar.join('')}</div></div></section>`;

test('liste: açık kart aktif, mutlak url; biten kartlar atlanır', () => {
  const html = bolum('Paya Dayalı', kart('Acik%20Ad', ''), kart('bitmis', 'FONLANDI'), kart('kapandi', 'KAPANDI'));
  assert.deepEqual(birikimfon.liste(html, LISTE_URL), [
    { ad: 'Acik Ad', url: 'https://birikimfon.com/proje/Acik%20Ad', bolum: 'aktif' },
  ]);
});

test('liste: ödül bazlı bölümdeki kartlar dönmez, paya dayalı bölüm kalır', () => {
  const html = bolum('Paya Dayalı', kart('pay-proje', '')) + bolum('Ödül Bazlı', kart('odul-proje', ''));
  const k = birikimfon.liste(html, 'https://birikimfon.com/');
  assert.deepEqual(k.map((x) => x.ad), ['pay-proje']);
  assert.ok(!k.some((x) => x.ad === 'odul-proje'));
});

test('liste: yakında / ön talep durumu yakinda bölümüne düşer', () => {
  const k = birikimfon.liste(bolum('Paya Dayalı', kart('yakin', 'YAKINDA'), kart('on', 'Ön Talep')), LISTE_URL);
  assert.deepEqual(k.map((x) => x.bolum), ['yakinda', 'yakinda']);
});

test('liste: biten durum sözlüğü geniş; bilinmeyen durum bilerek aktif sayılır (fail-open)', () => {
  for (const s of ['SONA ERDİ', 'Tamamlandı', 'HEDEFİNE ULAŞAMADI', 'FONLANAMADI', 'İPTAL', 'BAŞARISIZ', 'Arşiv', 'Reddedilen', 'SONUÇLANDI']) {
    assert.deepEqual(birikimfon.liste(bolum('Paya Dayalı', kart('x', s)), LISTE_URL), [], s);
  }
  const k = birikimfon.liste(bolum('Paya Dayalı', kart('yeni', 'ÖZEL DURUM')), LISTE_URL);
  assert.deepEqual(k, [{ ad: 'yeni', url: 'https://birikimfon.com/proje/yeni', bolum: 'aktif' }]);
});

test('liste: bağlantısız kart atlanır, tekrar eden kart tek döner, bozuk yüzde kodlu slug düşürmez', () => {
  const baglantisiz = '<div class="testimonial-item project-item"><h2> YAKINDA </h2></div>';
  const html = bolum('Paya Dayalı', baglantisiz, kart('bozuk%E0%A4%A', ''), kart('bozuk%E0%A4%A', ''));
  const k = birikimfon.liste(html, LISTE_URL);
  assert.equal(k.length, 1);
  assert.equal(k[0].ad, 'bozuk%E0%A4%A');
});

test('liste: kart kalıbı bulunamazsa bölümdeki proje bağlantıları alınır, ödül bölümü yine atlanır', () => {
  const html =
    '<section class="project-area"><h2>Yatırım Yap</h2><a href="https://birikimfon.com/proje/a">A</a><a href="proje/b">B</a></section>' +
    '<section class="project-area"><h2>Ödül Bazlı</h2><a href="https://birikimfon.com/proje/c">C</a></section>';
  assert.deepEqual(birikimfon.liste(html, LISTE_URL).map((x) => x.ad), ['a', 'b']);
});

test('liste: yedek yolda bir kartın açıklamasındaki "bağış"/"iptal" bütün projeleri düşürmez', () => {
  const html =
    '<section class="project-area"><h2>Yatırım Yap</h2>' +
    '<div><a href="https://birikimfon.com/proje/a">A</a><p>Bağış değil, iptal edilmedi, geçmiş yıllar.</p></div>' +
    '<div><a href="https://birikimfon.com/proje/b">B</a><h2> FONLANDI </h2></div>' +
    '<div><a href="https://birikimfon.com/proje/c">C</a></div></section>';
  assert.deepEqual(birikimfon.liste(html, LISTE_URL).map((x) => x.ad), ['a', 'c']);
});

test('liste: project-item-thumb gibi alt sınıflar kartı bölmez, durum doğru okunur', () => {
  const html =
    '<section class="project-area"><h2>Paya Dayalı</h2>' +
    '<div class="testimonial-item project-item"><div class="project-item-thumb"><a href="https://birikimfon.com/proje/x">i</a></div>' +
    '<h2> FONLANDI </h2></div>' +
    '<div class="testimonial-item project-item"><div class="project-item-thumb"><a href="https://birikimfon.com/proje/y">i</a></div></div></section>';
  assert.deepEqual(birikimfon.liste(html, LISTE_URL).map((x) => x.ad), ['y']);
});
