// node --test scripts/bot/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { adDevami, ayniOlay, hafizaKur, kayitKur, sayilar, tekrarBul } from './tekrar.mjs';
import { slugify } from './lib.mjs';

const SAAT = 3_600_000;
const simdi = Date.parse('2026-10-15T12:00:00+03:00');
const yayimlanan = (title, description = '', ek = {}) => ({ slug: 'x', tarih: simdi - 5 * SAAT, category: 'girisimler', title, description, ...ek });

const DECART = yayimlanan(
  "Amazon, yapay zekâ girişimi Decart'ı satın almak için görüşüyor",
  "Amazon, yapay zekâ çipleri ve gerçek zamanlı video modelleri geliştiren Decart'ı yaklaşık 7 milyar dolara satın almak üzere görüşmeler yürütüyor.",
);
const BUMBLE = yayimlanan(
  'Bumble, Ithaca Holdings tarafından 1,3 milyar dolara satın alınıyor',
  'Çevrim içi flört platformu Bumble, Ithaca Holdings ile 1,3 milyar dolarlık satın alma anlaşması imzaladı.',
);
const BUMBLE_2 = yayimlanan(
  'Çöpçatanlık uygulaması Bumble özel şirkete dönüşmek için görüşüyor',
  'Bumble, Ithaca Holdings ile 1 milyar dolar değerlemeyle özel şirkete dönüşmek üzere görüşmeler yürütüyor.',
);

test('aynı satın alma görüşmesi farklı başlıkla tekrar yazılmaz (Amazon–Decart)', () => {
  const hafiza = hafizaKur([DECART], simdi);
  assert.ok(tekrarBul("Amazon, Decart'ı satın almak üzere temas kurdu", hafiza));
  assert.ok(tekrarBul('Amazon in talks to acquire AI video startup Decart', hafiza));
});

test('aynı olayın Türkçe ve İngilizce başlıkları her iki yönde eşleşir (Bumble–Ithaca)', () => {
  assert.ok(tekrarBul(BUMBLE_2.title, hafizaKur([BUMBLE], simdi)));
  assert.ok(tekrarBul(BUMBLE.title, hafizaKur([BUMBLE_2], simdi)));
  assert.ok(tekrarBul('Bumble to be taken private by Ithaca Holdings in $1.3B deal', hafizaKur([BUMBLE_2], simdi)));
});

test('yalnız büyük şirket ortak olan farklı haberler eşleşmez', () => {
  const hafiza = hafizaKur([DECART], simdi);
  assert.equal(tekrarBul('Amazon, yeni Alexa tabletlerini tanıttı', hafiza), undefined);
  assert.equal(tekrarBul('Google, Avrupa’daki bilim insanlarına model erişimi veriyor', hafiza), undefined);
});

test('aynı yatırımcı ya da aynı sektör kelimesiyle başlayan farklı turlar eşleşmez', () => {
  const persona = hafizaKur([yayimlanan("Zach Yadegari'nin yeni girişimi Persona, Accel liderliğinde 10 milyon dolar yatırım aldı")], simdi);
  assert.equal(tekrarBul('Loops raises $10M seed round led by Accel', persona), undefined);
  const bio = hafizaKur([yayimlanan('Biyoteknoloji girişimi Undecimal Bio 16 milyon euro tohum yatırım aldı')], simdi);
  assert.equal(tekrarBul('Biyoteknoloji girişimi Silvia 16 milyon euro yatırım aldı', bio), undefined);
});

test('hafıza 72 saatten eski haberleri ve günlük bültenleri tutmaz', () => {
  const eski = { ...DECART, tarih: simdi - 80 * SAAT };
  const bulten = { ...DECART, category: 'gunluk-bulten' };
  assert.equal(hafizaKur([eski, bulten], simdi).length, 0);
  assert.equal(hafizaKur([DECART], simdi).length, 1);
});

test('tutarlar iki yazımda aynı çıkar, yıllar sayılmaz', () => {
  assert.deepEqual([...sayilar('1,3 milyar dolar, 2026 yılında')], ['1.3']);
  assert.ok(sayilar('$1.3B').has('1.3'));
  assert.ok(ayniOlay(kayitKur({ title: 'Typesafe raises $870M from Accel' }), kayitKur({ title: 'Typesafe 870 milyon dolar yatırım aldı', description: 'Typesafe, 870 milyon dolar yatırım aldı.' })));
});

test('slug 80 karakteri geçince kelime ortasından değil son tireden kesilir', () => {
  const s = slugify("Accenture, İngiltere merkezli veri ve müşteri zekası girişimi Sagacity'yi satın aldı");
  assert.ok(s.length <= 80);
  assert.equal(s, 'accenture-ingiltere-merkezli-veri-ve-musteri-zekasi-girisimi-sagacity-yi-satin');
  assert.equal(slugify('Kısa başlık'), 'kisa-baslik');
});

// 24 Ekim: Maxinsights'ı finanse eden yatırımcı Peak XV, Peak Energy şirketiyle eşleşmişti (kural C: yatırımcı adı şirket adı sanıldı).
const PEAK_ENERGY = yayimlanan(
  'Peak Energy, Seri B turunda 108 milyon dolar yatırım aldı',
  'Enerji depolama sistemleri geliştiren Peak Energy, aşırı talep gören Seri B turunda 108 milyon dolar topladı.',
  { girisim: 'Peak Energy' },
);

test('aynı ilk kelimeli farklı ad eşleşmez: Peak XV yatırımcısı ↔ Peak Energy şirketi', () => {
  const hafiza = hafizaKur([PEAK_ENERGY], simdi);
  assert.equal(tekrarBul('Maxinsights Raises $30 Million In Seed Funding Led By Peak XV To Build Physical AI Data Platform For Robotics', hafiza), undefined);
  assert.equal(tekrarBul('Maxinsights raises $30M from Peak XV to pay more than 5,000 people to film real work for robotsX', hafiza), undefined);
});

test('Peak Energy gerçek tekrarı hâlâ yakalanır', () => {
  const hafiza = hafizaKur([PEAK_ENERGY], simdi);
  assert.ok(tekrarBul('Peak Energy raises $108M Series B to scale sodium-ion storage', hafiza));
  assert.ok(tekrarBul('Peak Energy, GM Ventures liderliğinde 108 milyon dolar topladı', hafiza));
});

test('adDevami: ardışık büyük harfli kelimeyi verir, noktalamada durur', () => {
  assert.equal(adDevami('Led By Peak XV To Build', 'peak'), 'xv');
  assert.equal(adDevami('Peak Energy, Seri B', 'peak'), 'energy');
  assert.equal(adDevami('Peak, yeni tur', 'peak'), '');
  assert.equal(adDevami('Yeni tur Peak', 'peak'), '');
});
