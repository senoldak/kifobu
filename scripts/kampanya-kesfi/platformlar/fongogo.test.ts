import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fongogo } from './fongogo.ts';

const oku = (ad: string) => readFileSync(new URL(`./__ornekler__/${ad}`, import.meta.url), 'utf8');
const liste = oku('fongogo-liste.html');
const peticim = oku('fongogo-peticim.html');
const ozet = oku('fongogo-peticim-ozet.html');
const tam = `${peticim}
${ozet}`;
const LISTE_URL = 'https://yatirim.fongogo.com/';
const detayUrl = (slug: string) => `https://yatirim.fongogo.com/ProjectDetail/PreliminaryInformation?URLKey=${slug}`;

test('okuyucu kimliği: paya dayalı startuplar sitesi (ödül sitesi değil)', () => {
  assert.equal(fongogo.platform, 'fongogo');
  assert.deepEqual(fongogo.listeUrller, [LISTE_URL]);
  assert.ok(!fongogo.listeUrller.some((u) => u.includes('odul.')));
});

test('liste: ön talep toplayan iki startup yakinda döner, mutlak adreslerle', () => {
  assert.deepEqual(fongogo.liste(liste, LISTE_URL), [
    { ad: 'esebze-2', url: detayUrl('esebze-2'), bolum: 'yakinda' },
    { ad: 'BioCoderTeknoloji', url: detayUrl('BioCoderTeknoloji'), bolum: 'yakinda' },
  ]);
});

test('liste: "Yatırım mı arıyorsun?" tanıtım kartı ve gezinti bağlantıları kayıt olmaz', () => {
  const kayitlar = fongogo.liste(liste, LISTE_URL);
  assert.ok(!kayitlar.some((k) => /PreListingStage|ProjectList|Account/i.test(k.url)));
  assert.equal(kayitlar.length, 2);
});

test('liste: tanınmayan başlık ve rozet BİLEREK aktif sayılır (fail-open)', () => {
  const html = liste.replace('Ön Talep Toplayan Startuplar', 'Yatırıma Açık Startuplar').replaceAll('ÖN TALEP</span>', 'YENİ</span>');
  const kayitlar = fongogo.liste(html, LISTE_URL);
  assert.equal(kayitlar.length, 2);
  assert.ok(kayitlar.every((k) => k.bolum === 'aktif'));
});

test('liste: biten başlık altındaki ve biten durumlu kartlar dönmez', () => {
  const biten = liste.replace('Ön Talep Toplayan Startuplar', 'Başaranlar');
  assert.deepEqual(fongogo.liste(biten, LISTE_URL), []);
  const kart = `<div class="swiper-slide successProjectsContainer"><h2 class="h2B">%106 Fonlandı</h2>
    <a href="/ProjectDetail/PreliminaryInformation?URLKey=yesil-paket">DETAYLI BİLGİ</a></div>`;
  assert.deepEqual(fongogo.liste(kart, LISTE_URL), []);
  for (const durum of ['%40 Fonlanamadı', 'Süre Tamamlandı', 'Başarısız', 'Sona Erdi', 'İptal Edildi']) {
    assert.deepEqual(fongogo.liste(kart.replace('%106 Fonlandı', durum), LISTE_URL), [], durum);
  }
});

test('liste: bağlantısı olmayan kart atlanır, yinelenen bağlantı tek kayıt', () => {
  const baglantisiz = liste.replaceAll('/campaign/BioCoderTeknoloji', '/x').replaceAll('PreliminaryInformation?URLKey=BioCoderTeknoloji', 'x');
  assert.deepEqual(fongogo.liste(baglantisiz, LISTE_URL).map((k) => k.url), [detayUrl('esebze-2')]);
});

test('detay: biten, hedefine ulaşan kampanya (Petiçim)', () => {
  const d = fongogo.detay(peticim);
  assert.equal(d.ad, 'Petiçim Buğday Çimi Suyu');
  assert.equal(d.hedef, 2100000);
  assert.equal(d.toplanan, 2268134);
  assert.equal(d.yatirimci, 101);
  assert.equal(d.bitti, true);
  assert.equal(d.fonlandi, true);
  // Tarih/oran/değerleme ayrı "Yatırımcı Özeti" parçasında: tek başına okunamayan null, 0 değil.
  assert.equal(d.arzOrani, null);
  assert.equal(d.degerleme, null);
  assert.equal(d.baslangic, null);
  assert.equal(d.bitis, null);
  assert.equal(d.nitelikli, null);
  assert.equal(d.kalanGun, null);
  assert.equal(d.sonGun, false);
});

test('detay: etiket silinince null döner, 0 değil', () => {
  assert.equal(fongogo.detay(peticim.replace('Fonlandı, hedef fon', 'X, hedef fon')).toplanan, null);
  assert.equal(fongogo.detay(peticim.replace('hedef fon', 'X')).hedef, null);
  assert.equal(fongogo.detay(peticim.replaceAll('yatırımcı yatırım yaptı', 'X')).yatirimci, null);
});

test('detay: ondalıklı tutar yanlış sayıya çevrilmez, null olur', () => {
  assert.equal(fongogo.detay(peticim.replace('₺ 2.268.134', '₺ 2.268.134,50')).toplanan, null);
  assert.equal(fongogo.detay(peticim.replace('₺ 2.100.000', '₺ 2.100.000,50')).hedef, null);
});

test('detay: ad <h1> yoksa <title>, o da yoksa null', () => {
  const h1siz = peticim.replace(/<h1 class="h4B[^>]*>[\s\S]*?<\/h1>/, '');
  assert.equal(fongogo.detay(h1siz).ad, 'Petiçim Buğday Çimi Suyu');
  assert.equal(fongogo.detay(h1siz.replace(/<title>[\s\S]*?<\/title>/, '')).ad, null);
});

test('detay: durum yalnız sonuç rozetinden ve ilerleme kutusundan okunur, açıklamadan değil', () => {
  const acik = peticim.replace('<div class="investment-results-tag">Başarılı </div>', '').replace(/(class="col text-end">\s*)Tamamlandı/, '$1');
  assert.equal(fongogo.detay(acik).bitti, false);
  assert.equal(fongogo.detay(acik).fonlandi, null);
  const aciklamali = acik.replace('Öne Çıkanlar', 'Başarılı sona erdi Tamamlandı Öne Çıkanlar');
  assert.equal(fongogo.detay(aciklamali).bitti, false);
  assert.equal(fongogo.detay(aciklamali).sonGun, false);
});

test('detay: rozet yoksa ilerleme kutusundaki "Tamamlandı" yeter; başarısız/iptal fonlanmadı sayılır', () => {
  const rozetsiz = peticim.replace('<div class="investment-results-tag">Başarılı </div>', '');
  assert.equal(fongogo.detay(rozetsiz).bitti, true);
  assert.equal(fongogo.detay(rozetsiz).fonlandi, true); // toplanan >= hedef
  for (const s of ['Başarısız', 'Fonlanamadı', 'İptal Edildi']) {
    const d = fongogo.detay(peticim.replace('Başarılı ', s));
    assert.equal(d.bitti, true, s);
    assert.equal(d.fonlandi, false, s);
  }
  assert.equal(fongogo.detay(rozetsiz.replace('₺ 2.268.134', '₺ 100.000')).fonlandi, false);
});

test('detay: ana sayfa + Yatırımcı Özeti birleşince tarih, pay oranı (ek fon hariç) ve değerleme okunur', () => {
  const d = fongogo.detay(tam);
  assert.equal(d.baslangic, '2025-03-13');
  assert.equal(d.bitis, '2025-05-12');
  assert.equal(d.arzOrani, 0.0775); // "%7,75 (Ek Fon İle %9,16)": ek fonlu oran alınmaz
  assert.equal(d.degerleme, 27100000); // öncesi 25.000.000 + hedef 2.100.000; ek fonlu hedef (2.520.000) kullanılmaz
  assert.equal(d.hedef, 2100000);
  assert.equal(d.toplanan, 2268134);
  assert.equal(d.yatirimci, 101);
  assert.equal(d.ad, 'Petiçim Buğday Çimi Suyu');
});

test('detay: özet etiketleri silinince ilgili alan null olur', () => {
  assert.equal(fongogo.detay(tam.replace('Başlangıç - Bitiş Tarihleri', 'X')).baslangic, null);
  assert.equal(fongogo.detay(tam.replace('Başlangıç - Bitiş Tarihleri', 'X')).bitis, null);
  assert.equal(fongogo.detay(tam.replace('Arz Edilen Pay Oranı', 'X')).arzOrani, null);
  const d = fongogo.detay(tam.replace('Yatırım Öncesi Değerleme', 'X'));
  assert.equal(d.degerleme, null);
});

test('ekSayfalar: detay adresinden Yatırımcı Özeti adresi; bozuk adres istisna atmaz', () => {
  assert.deepEqual(fongogo.ekSayfalar!(detayUrl('peticim')), ['https://yatirim.fongogo.com/ProjectDetail/InvestorSummary?URLKey=peticim']);
  assert.deepEqual(fongogo.ekSayfalar!('bozuk adres'), []);
  assert.deepEqual(fongogo.ekSayfalar!('https://yatirim.fongogo.com/'), []);
});
