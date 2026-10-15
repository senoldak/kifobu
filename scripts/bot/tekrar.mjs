// Çalışmalar arası mükerrer haber kalkanı (yapay zekâsız, deterministik).
// Son ~72 saatte yayımlanmış haberlerin başlığı ve özel adları hafızada tutulur; yeni aday aynı olayı anlatıyorsa
// yazılmaz ve görüldü sayılır. Kelime benzerliği (kaynaklar.mjs → benzer) ve Gemini eşlemesi (esleme.mjs) iki dil
// arasında ya da farklı başlıklarla yazılmış aynı olayı kaçırabiliyor (ör. "Amazon, Decart'ı satın almak üzere temas
// kurdu" ile "Amazon, yapay zekâ girişimi Decart'ı satın almak için görüşüyor" aynı gün iki kez yayımlandı).
//
// Eşleşme kuralları (aday başlığı ↔ yayımlanmış haber):
//   A. Ayırt edici (büyük teknoloji şirketi olmayan) en az bir ortak özel ad ve toplam en az iki ortak özel ad;
//      biri yayımlanmış haberin başlığında.
//   B. Ayırt edici bir ortak özel ad ve ortak bir tutar (1,3 milyar ↔ $1.3B; yıllar ve 100'den küçük tam sayılar sayılmaz).
//   C. Bir başlığın ilk özel adı (haberin öznesi) öteki başlıkta cümle ortasında geçiyor (ör. "Bumble, Ithaca ..." ↔
//      "Çöpçatanlık uygulaması Bumble ..."). İki başlık da aynı kelimeyle başlıyorsa sayılmaz: başlık başındaki
//      büyük harf özel ad olmayabilir ("Biyoteknoloji girişimi X" ↔ "Biyoteknoloji girişimi Y").
//   D. İki başlık aynı kelimeyle başlıyor ve aynı ayırt edici tutarı veriyor.
// Yatırımcı adları (Accel, Sequoia) iki başlıkta da cümle ortasında geçtiği için tek başına eşleşme sayılmaz.
import { ozelAdlar } from './esleme.mjs';

export const HAFIZA_SAAT = 72;

// Başlıkta geçmesi olayı ayırt etmeyen büyük şirketler, ürünleri ve ürün sıfatları (eşleşme sebebi sayılmaz).
export const BUYUK_SIRKETLER = new Set(
  `amazon apple google alphabet microsoft meta facebook instagram whatsapp openai anthropic nvidia spacex tesla netflix samsung
xiaomi ibm intel oracle salesforce uber claude chatgpt gpt gemini copilot iphone ipad macbook mac pixel android ios windows
alexa starlink play store galaxy xbox playstation pro max mini ultra plus air`.split(/\s+/),
);

const sirala = (metin) => [...ozelAdlar(metin)];

/** Ayırt edici tutarlar ("1,3" → "1.3", 870): ondalıklı sayılar ve 100 ve üstü tam sayılar; yıllar atılır.
 * "10 milyon" gibi yuvarlak küçük tutarlar çok sık geçtiği için tek başına olay kanıtı sayılmaz. */
export function sayilar(metin = '') {
  const out = new Set();
  for (const m of String(metin).matchAll(/\d+(?:[.,]\d+)?/g)) {
    const s = m[0].replace(',', '.');
    const n = Number(s);
    if (!Number.isFinite(n)) continue;
    if (Number.isInteger(n) && (n < 100 || (n >= 1900 && n <= 2100))) continue;
    out.add(String(n));
  }
  return out;
}

/** Başlığın ilk kelimesi (küçük harfli, eki atılmış); özel ad olsun olmasın. */
const ilkKelime = (baslik = '') =>
  baslik.trim().replace(/[’'][\p{L}]+/u, '').match(/[\p{L}\d][\p{L}\d.&-]*/u)?.[0]?.replace(/[.&-]+$/, '').toLocaleLowerCase('tr') ?? '';

/**
 * Başlığın ilk kelimesi kesin özel ad mı? Başlık başında her kelime büyük harfle başlar; ancak arkasından virgül ya da
 * kesme işareti geliyorsa ("Bumble, ...", "Decart'ı") ya da içinde ikinci bir büyük harf/rakam varsa özel addır.
 */
const ilkOzelMi = (baslik = '') => /^\s*[\p{L}\d][\p{L}\d.&-]*(?:[,’']|\s*,)/u.test(baslik) || /^\s*\p{L}[\p{L}\d.&-]*[\p{Lu}\d]/u.test(baslik);

/** Hafıza kaydı: yayımlanmış haberden (başlık, spot, girişim) ya da adaydan (yalnız başlık) kurulur. */
export function kayitKur({ title = '', description = '', girisim = '', slug, tarih } = {}) {
  const basAdlar = sirala(title);
  const ilk = ilkKelime(title);
  // Kesin adlar: başlıktaki özel adlar; ilk kelime yalnız kesin özel adsa sayılır (kurallar A ve B).
  const kesin = new Set(basAdlar.filter((x) => x !== ilk || ilkOzelMi(title)));
  return {
    slug,
    tarih,
    baslik: title,
    ilk,
    kesin,
    ozne: basAdlar[0],
    basAdlar: new Set(basAdlar),
    adlar: new Set([...basAdlar, ...sirala(`${description} ${girisim ?? ''}`)]),
    sayilar: sayilar(`${title} ${description}`),
  };
}

/** İki kaydın aynı olayı anlatıp anlatmadığı (a: aday, b: yayımlanmış). */
export function ayniOlay(a, b) {
  const ortakSayi = [...a.sayilar].some((n) => b.sayilar.has(n));
  // D: iki başlık aynı kelimeyle (özneyle) başlıyor ve aynı ayırt edici tutarı veriyor ("Typesafe raises $870M" ↔ "Typesafe 870 milyon dolar ...").
  if (a.ilk && a.ilk === b.ilk && !BUYUK_SIRKETLER.has(a.ilk) && ortakSayi) return true;
  // Başlık başındaki kelime, iki başlıktan birinde kesin özel adsa sayılır ("Amazon, ..." ↔ "Amazon in talks ...").
  const ortak = [...a.basAdlar].filter((x) => (a.kesin.has(x) || b.kesin.has(x)) && b.adlar.has(x));
  const ayirt = ortak.filter((x) => !BUYUK_SIRKETLER.has(x));
  if (!ayirt.length) return false;
  // A: ortak adlardan en az biri yayımlanmış haberin başlığında olmalı (yalnız spotta geçen ürün adları yetmez).
  if (ortak.length >= 2 && ortak.some((x) => b.basAdlar.has(x))) return true;
  if (ortakSayi) return true; // B
  // C: öznesi ötekinin başlığında cümle ortasında geçiyor (aynı kelimeyle başlamıyorlar).
  if (a.ilk === b.ilk) return false;
  const ozneA = a.ozne && !BUYUK_SIRKETLER.has(a.ozne) && a.ozne === a.ilk ? a.ozne : undefined;
  const ozneB = b.ozne && !BUYUK_SIRKETLER.has(b.ozne) && b.ozne === b.ilk ? b.ozne : undefined;
  return Boolean((ozneA && b.basAdlar.has(ozneA)) || (ozneB && a.basAdlar.has(ozneB)));
}

/** Aday başlığı hafızadaki bir haberle aynı olaysa o kaydı döner, yoksa undefined. */
export function tekrarBul(baslik, hafiza) {
  const a = kayitKur({ title: baslik });
  return hafiza.find((b) => ayniOlay(a, b));
}

/**
 * Hafıza: son HAFIZA_SAAT saatte yayımlanmış haberler (günlük bültenler hariç; onlar başka haberlerin listesi).
 * haberler: lib.mjs → sonHaberler çıktısı ({ slug, tarih, category, title, description, girisim }).
 */
export function hafizaKur(haberler, simdi = Date.now(), saat = HAFIZA_SAAT) {
  return haberler
    .filter((h) => h.category !== 'gunluk-bulten' && simdi - h.tarih <= saat * 3_600_000)
    .map((h) => kayitKur(h));
}
