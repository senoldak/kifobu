// Haber kaynakları: Türkiye'deki girişim yatırımı ve kitle fonlama haberlerinin akışları, yanında az sayıda küresel
// girişim yatırımı akışı. Bot bu haberleri kopyalamaz; olguları alıp kendi diliyle yeniden yazar.
// Kapsam daraltıldı (2026-10-15): genel akışlar yerine sitelerin yatırım kategorisi ve kitle fonlama etiketi okunur;
// genel teknoloji ve donanım siteleri çıkarıldı. Küresel kaynaklar da yerlilerle aynı eşikten geçer
// (yazar.mjs → MIN_DEGER).
//
// Repo herkese açık: gerçek kaynakların adı, alan adı ve akış adresi repoya yazılmaz. Liste şifreli olarak
// scripts/bot/gizli-kaynaklar.sifreli dosyasındadır; anahtar KAYNAK_ANAHTARI (GitHub Secret, yerelde .env).
// Düzenlemek için: node scripts/bot/gizli.mjs ac → gizli-kaynaklar.json (git'e girmez) → node scripts/bot/gizli.mjs kapat.
// Biçim için gizli-kaynaklar.example.json. Loglarda ve durum dosyasında kaynak adı yerine kısa kod (kod) kullanılır.
//
// Her kaynak: { ad, kisa, akis, sayfa?, bitis?, yerli?, adlar? } — sayfa: akışta tam metin yoksa haber sayfasındaki
// gövdenin başlangıç işareti; yerli: Türkiye kaynaklı (öncelik ve daha düşük eşik); adlar: haber metninde geçmemesi
// gereken yayın adları (denetci.mjs → medyaKontrol; verilmezse ad kullanılır). kisa haber kimliğinin parçasıdır:
// aynı sitenin akışı değişse de görülen haberler tekrar aday olmasın diye korunmalı.
import { hentTekst, htmlMetin, varlikCoz } from './lib.mjs';
import { adresiSil, gizliKaynaklar, kaynakKodu } from './gizli.mjs';

// Anahtar varken liste okunamazsa gizliKaynaklar hata atar (bot kaynaksız kalıp boş çalışmasın).
const GIZLI = gizliKaynaklar({ uyar: () => {} });
export const KAYNAKLAR = GIZLI.kaynaklar.map((k) => ({ ...k, kod: kaynakKodu(k.kisa) }));

/** Haber metninde anılmaması gereken yayın adları: kaynak adları ve şifreli listedeki ek medya adları. */
export const KAYNAK_ADLARI = [...new Set([...KAYNAKLAR.flatMap((k) => k.adlar ?? [k.ad]), ...GIZLI.medya].filter(Boolean))];

// Sayfadaki haber gövdesinden <p> paragraflarını alır (başlangıç işaretinden bitiş işaretine kadar).
function paragraflar(html, baslangic, bitisler = []) {
  const i = html.indexOf(baslangic);
  if (i < 0) return '';
  let govde = html.slice(i);
  const son = Math.min(...bitisler.map((b) => govde.indexOf(b)).filter((n) => n > 0), govde.length);
  govde = govde.slice(0, son);
  return [...govde.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)]
    .map((m) => htmlMetin(m[1]))
    .filter((p) => p.length > 1)
    .join('\n\n');
}

// Genel çıkarıcı: <article> içindeki (yoksa sayfadaki) 40 karakterden uzun paragraflar.
function genelGovde(html) {
  const makale = html.match(/<article[\s\S]*?<\/article>/gi)?.sort((a, b) => b.length - a.length)[0] ?? html;
  return [...makale.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)]
    .map((m) => htmlMetin(m[1]))
    .filter((p) => p.length > 40 && !/^(Kaynak|Fotoğraf|Görsel|Haberin devamı|Bu haberi|Etiketler|Source|Image|Photo)\b/i.test(p))
    .join('\n\n');
}

/** Haberin tam metni (düz metin). Akışta yoksa haber sayfasından okunur; olmazsa özet. */
export async function tamMetin(oge) {
  const k = oge.kaynak;
  const akistan = htmlMetin(oge.icerik || '');
  // Akıştaki metin kısa bir özetse (250–400 kelimelik haber için yetmez) sayfanın tamamı okunur.
  if (akistan.length > 1500) return akistan;
  try {
    const html = await hentTekst(oge.link);
    const govde = k.sayfa ? paragraflar(html, k.sayfa, k.bitis) : genelGovde(html);
    if (govde.length > Math.max(300, akistan.length)) return govde;
  } catch (e) {
    console.warn(`  ${k.kod} sayfası okunamadı (${adresiSil(e.message)}); özet kullanılıyor`);
  }
  return akistan || htmlMetin(oge.description);
}

export const baslikTemiz = (s) => varlikCoz(s).replace(/\s+/g, ' ').trim();

// ── Benzerlik (aynı olayı gruplamak için) ───────────────────────────
// Aynı olayı anlatan başlıklar farklı yazılır ama özel adlar, rakamlar ve anahtar kelimeler ortaktır.
const DURAK = new Set([
  ...'için ile ve veya bir bu şu o da de ki mi en daha çok yeni olarak olan oldu etti yaptı geliyor geldi açıkladı duyurdu başladı tanıttı sunuyor işte nasıl neden ne kadar artık tüm her yıl ilk son büyük'.split(' '),
  ...'the and for with that this from have has was were are been will would can could about into over after before says said unveils launches reveals new first more than its their who what when where why how'.split(' '),
]);
// Yatırım haberi kalıbının kökleri ("X, Seri A turunda 5 milyon dolar yatırım aldı"): her tur haberinde geçer, olayı ayırt etmez.
// Sayılsalardı her yerli tur haberi yazılmış başka bir turla "aynı" çıkıyordu (22 Ekim). Ayırt eden: girişimin adı, rakam.
const KALIP = new Set(
  'yatır aldı alara almış milyo milya dolar euro sterl lira turda turun turu tohum önces seri aşama değer raise raisi milli billi fundi round serie seed valua giriş şirke yapay zekâ zeka odakl taban merke fonu fonun kapat büyük topla çeyre'.split(' '),
);

export function anahtarlar(baslik) {
  const out = new Set();
  for (let w of baslik.replace(/[’'][\p{L}]+/gu, '').split(/[^\p{L}\d.,]+/u)) {
    w = w.replace(/[.,]+$/, '');
    if (!w) continue;
    if (/^\d/.test(w)) {
      out.add(w.replace(',', '.'));
      continue;
    }
    const l = w.toLowerCase();
    if (l.length < 3 || DURAK.has(l) || KALIP.has(l.slice(0, 5))) continue;
    out.add(l.slice(0, 5)); // kaba kök: "investments" ~ "invest", "yatırımı" ~ "yatır"
  }
  return out;
}

export function benzer(a, b) {
  let ortak = 0;
  for (const x of a) if (b.has(x)) ortak++;
  return ortak >= 2 && ortak / Math.min(a.size, b.size) >= 0.5;
}
