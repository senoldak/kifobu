// Yazı işleri: yapay zekânın yazdığı haberi yayından önce denetler, düzelttirir ve dilini temizler.
//
// Sıra (denetle):
//   1. Kesin (yapay zekâsız) kontroller: rakamlar, künye, alıntılar, özel adlar kaynakta var mı;
//      kaynağın cümleleri kopyalanmış mı; göreli zaman ifadesi var mı.
//   2. Yazı işleri müdürü: haberi kaynaklarla madde madde karşılaştırır (Basın Meslek İlkeleri).
//   3. Sorun varsa muhabire düzelttirilir (en fazla 2 tur).
//   4. Redaktör: sadece dil (TDK yazımı, çeviri kokan ifadeler, tık tuzağı); olguları bozarsa redaksiyon atılır.
//   5. Son kesin kontrol; sorun kalırsa en fazla SON_TUR kez daha düzeltme. Yine kalırsa haber yayımlanmaz
//      (taslak da açılmaz; elle kontrol gerekmesin diye). Kopya sorununda metin baştan yeniden kurdurulur.
import { gemini } from './lib.mjs';
import { YAZIM_KURALLARI } from './yazar.mjs';
import { ZAMAN, MEDYA, medyaGizle, yerelDuzelt, ilgiliKisim } from './yerel.mjs';

const SON_TUR = 3;
const tamMetin = (h) => `${h.title}\n${h.description}\n${h.body}`;

// ── Rakamlar ───────────────────────────────────────────────────────────
// "1.1" (İngilizce yazım) ile "1,1" (Türkçe) aynı olabilir; "1.100.000" binlik noktalıdır.
// Her rakam için olası değerlerin hepsi üretilir, kaynakta biri varsa (ölçek ve %1 yuvarlama dahil) kabul edilir.
const RAKAM = /\d+(?:[.,]\d+)*/g;
function degerler(raw) {
  const out = new Set();
  const ayraclar = raw.match(/[.,]/g) ?? [];
  if (!ayraclar.length) return new Set([Number(raw)]);
  const gruplar = raw.split(/[.,]/);
  const ucluGrup = gruplar.slice(1).every((g) => g.length === 3);
  // Hepsi binlik ayraç: 1.100.000 / 1,100,000
  if (ucluGrup) out.add(Number(gruplar.join('')));
  // Son ayraç ondalık: 1.1 / 2,8 / 1.234,5
  const son = Math.max(raw.lastIndexOf('.'), raw.lastIndexOf(','));
  out.add(Number(raw.slice(0, son).replace(/[.,]/g, '') + '.' + raw.slice(son + 1)));
  return out;
}
const OLCEK = [1, 1e3, 1e6, 1e9, 1e-3, 1e-6, 1e-9];
function kaynakDegerleri(kaynak) {
  const s = new Set();
  for (const m of kaynak.matchAll(RAKAM)) for (const d of degerler(m[0])) s.add(d);
  return s;
}
const uyar = (n, bilinen, olcekli = true) =>
  [...bilinen].some((k) => k && (olcekli ? OLCEK : [1]).some((o) => Math.abs(k - n * o) / Math.abs(k) <= 0.01));

export function rakamKontrol(metin, kaynak) {
  const bilinen = kaynakDegerleri(kaynak);
  const bakildi = new Set();
  const sorunlar = [];
  for (const m of metin.matchAll(RAKAM)) {
    const raw = m[0];
    if (bakildi.has(raw)) continue;
    bakildi.add(raw);
    const adaylar = [...degerler(raw)];
    if (adaylar.every((n) => Number.isInteger(n) && n <= 12)) continue;
    // Yıllar birebir eşleşmeli.
    const yil = adaylar.length === 1 && Number.isInteger(adaylar[0]) && adaylar[0] >= 1900 && adaylar[0] <= 2100;
    if (adaylar.some((n) => bilinen.has(n)) || (!yil && adaylar.some((n) => uyar(n, bilinen)))) continue;
    sorunlar.push(`"${raw}" rakamı kaynakta yok`);
  }
  return sorunlar;
}

export function kunyeKontrol(kunye, kaynak) {
  const sorunlar = [];
  const bilinen = kaynakDegerleri(kaynak);
  for (const alan of ['toplanan', 'hedef', 'yatirimci']) {
    const n = kunye[alan];
    if (n && !uyar(n, bilinen)) sorunlar.push(`Künyedeki ${alan} (${n}) kaynaktaki hiçbir rakamla uyuşmuyor`);
  }
  if (kunye.girisim && !kaynak.toLocaleLowerCase('tr-TR').includes(kunye.girisim.toLocaleLowerCase('tr-TR'))) {
    sorunlar.push(`Künyedeki girişim adı "${kunye.girisim}" kaynakta geçmiyor`);
  }
  return sorunlar;
}

// ── Alıntılar ──────────────────────────────────────────────────────────
const norm = (s) =>
  s
    .replace(/[“”"‘’'«»]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLocaleLowerCase('tr-TR');

export function alintiKontrol(metin, kaynak) {
  const k = norm(kaynak);
  const alintilar = [...metin.matchAll(/[“"]([^”"]{15,})[”"]/g)].map((m) => m[1]);
  return alintilar
    .flatMap((s) => s.split(/(?<=[.!?])\s+/))
    .map((s) => s.trim())
    .filter((s) => s.length >= 15 && !k.includes(norm(s).replace(/[.!?,]$/, '')))
    .map((s) => `Alıntı kaynakta kelimesi kelimesine yok: “${s.slice(0, 80)}”`);
}

// ── Özel adlar ─────────────────────────────────────────────────────────
// Cümle ortasında büyük harfle başlayan kelimeler (kesme işaretinden sonraki ek atılarak) kaynakta geçmeli.
const HER_ZAMAN = new Set(['türkiye', 'türk', 'abd', 'avrupa', 'seri', 'tohum', 'girişim', 'kitle', 'spk', 'tl', 'kifobu']);
// Kaynak İngilizceyken Türkçeye çevrilen ülke, şehir ve kurum adları ("European Commission" → "Avrupa Komisyonu")
// kaynakta harfiyen geçemez; bu kökle başlayan kelimeler sayılmaz. Gerçek ad hataları yazı işleri kontrolünde yakalanır.
const TURKCE_KOKLER = [
  ...'komisyon üniversite bakanlı başbakan cumhurbaşkan parlamento meclis hükümet merkez bankas devlet birleşik krallı emirlik federal cumhuriyet belediye vali kurul kurum ajans enstitü vakf derneğ birliğ konsey zirve fuar fon'.split(' '),
  ...'amerika ingiltere almanya fransa hollanda belçika isveç norveç danimarka finlandiya ispanya italya isviçre avusturya polonya irlanda portekiz yunanistan estonya letonya litvanya çekya macaristan romanya ukrayna rusya japonya çin hindistan kore güney kuzey doğu batı tayland singapur endonezya malezya vietnam filipin brezilya meksika kanada avustralya suudi arabistan katar mısır israil afrika asya nijerya kenya londra brüksel cenevre zürih münih kopenhag stokholm varşova lizbon viyana prag kaliforniya teksas silikon vadi gent'.split(' '),
];
export function adKontrol(metin, kaynak) {
  const k = kaynak.toLocaleLowerCase('tr-TR');
  const bulunan = new Set();
  // Alıntıların içi alıntı kontrolünde zaten kelimesi kelimesine aranıyor.
  const alintisiz = metin.replace(/[“"][^”"]*[”"]/g, ' ');
  for (const cumle of alintisiz.split(/(?<=[.!?:])\s+|\n+/)) {
    const ilk = cumle.trim().match(/^[“"\-–*#\s]*([\p{L}\d]+)/u)?.[1];
    for (const kelime of cumle.match(/(?<![\p{L}\d])\p{Lu}[\p{L}\d.&-]{1,}/gu) ?? []) {
      if (kelime === ilk) continue;
      const kok = kelime.split(/[’']/)[0].replace(/[.-]+$/, '');
      const lk = kok.toLocaleLowerCase('tr-TR');
      if (lk.length < 2 || HER_ZAMAN.has(lk) || k.includes(lk) || TURKCE_KOKLER.some((t) => lk.startsWith(t))) continue;
      bulunan.add(kok);
    }
  }
  return [...bulunan].map((w) => `"${w}" adı kaynakta geçmiyor`);
}

// ── Kopya ──────────────────────────────────────────────────────────────
// Kaynakla art arda 10 kelimesi aynı olan parçalar; birden fazlası kopya sayılır.
// (Daha kısa eşik "X, Seri A turunda 1,1 milyon dolar" gibi kaçınılmaz olgu kalıplarını da yakalıyor.)
const kelimeler = (s) => norm(s).replace(/[^\p{L}\d\s]/gu, ' ').split(/\s+/).filter(Boolean);
export function kopyaKontrol(metin, kaynak, n = 10) {
  const kk = kelimeler(kaynak);
  const seritler = new Set();
  for (let i = 0; i + n <= kk.length; i++) seritler.add(kk.slice(i, i + n).join(' '));
  const mk = kelimeler(metin.replace(/[“"][^”"]*[”"]/g, ' '));
  const kopyalar = [];
  for (let i = 0; i + n <= mk.length; i++) {
    const s = mk.slice(i, i + n).join(' ');
    if (seritler.has(s)) {
      kopyalar.push(s);
      i += n - 1;
    }
  }
  return kopyalar.length >= 2
    ? [`Metin kaynağın cümlelerini kopyalıyor (${kopyalar.length} parça, ör. "${kopyalar[0]}"); olguları koruyup cümleleri yeniden kur`]
    : [];
}

// ── Göreli zaman ───────────────────────────────────────────────────────
export function zamanKontrol(metin) {
  const bulunan = [...new Set((metin.replace(/[“"][^”"]*[”"]/g, ' ').match(ZAMAN) ?? []).map((w) => w.toLocaleLowerCase('tr-TR')))];
  return bulunan.length ? [`Göreli zaman ifadesi (${bulunan.join(', ')}) haber geç okunduğunda yanlış olur; tarih yaz ya da kaldır`] : [];
}

// ── Yayın kuruluşu adı ─────────────────────────────────────────────────
// kifobu kaynak site ya da yayın kuruluşu adı vermez (sahibin kararı); metinde geçerse haber yayınlanmaz.
export function medyaKontrol(metin) {
  const bulunan = [...new Set(metin.match(MEDYA) ?? [])];
  return bulunan.length ? [`Yayın kuruluşu adı geçiyor (${bulunan.join(', ')}); bu adı ve yalnızca ona dayanan bilgiyi çıkar`] : [];
}

// ── Uzunluk ─────────────────────────────────────────────────────────────
// Hedef 250–400 kelime; 200 kelimenin altındaki metin yayımlanmaz (düzeltme turlarında kaynaktaki olgularla uzatılır).
export const EN_AZ_KELIME = 200;
export const HEDEF_KELIME = '250-400';
export const kelimeSayisi = (metin = '') => (String(metin).match(/[\p{L}\d]+(?:[’'.,-][\p{L}\d]+)*/gu) ?? []).length;
export function uzunlukKontrol(govde) {
  const n = kelimeSayisi(govde);
  return n < EN_AZ_KELIME
    ? [`Metin çok kısa (${n} kelime; en az ${EN_AZ_KELIME}, hedef ${HEDEF_KELIME}): kaynaklardaki olgularla (tutar, hedef, platform, tarih, yatırımcılar, girişimin işi, paranın kullanımı) uzat; kaynakta olmayan bilgi ekleme`]
    : [];
}

// ── Başlık ─────────────────────────────────────────────────────────────
// Arama kuralı (2026-10-15): başlık okurun arayacağı kelimeyle (girişim, platform, kurum adı ya da konu) başlar.
// "SPK: ..." / "Kurum: ..." gibi iki noktalı başlangıç ve belirsiz başlık ("Bu girişim ...", "Neden ...?") yayımlanmaz.
// Yalnız yeni yazılan haberlere uygulanır; yayımlanmış başlıklar ve adresler değiştirilmez.
const BELIRSIZ_BAS = /^(?:bu|şu|o|işte|neden|nasıl|hangi|kim|ne|bir|birkaç|bazı)(?![\p{L}\p{N}])/iu;
export const EN_AZ_BASLIK_KELIMESI = 4;
export function baslikKontrol(baslik = '') {
  const b = String(baslik).trim();
  const sorunlar = [];
  // Saat (10:30) ya da oran (1:2) değil, "Önek: başlık" kalıbı: ilk 40 karakterde iki nokta ve ardından boşluk.
  if (/^[^:]{1,40}:\s/u.test(b)) {
    sorunlar.push(`Başlık "${b.split(':')[0]}:" gibi iki noktalı bir önekle başlıyor; öneki kaldır, başlığı aranan kelimeyle (girişim, platform ya da kurum adı) başlayan düz bir cümle olarak kur`);
  }
  // "İ" büyük harfinin küçüğü Unicode'da tek harf değil; karşılaştırma için sadeleştirilir.
  if (BELIRSIZ_BAS.test(b.replace(/^İ/, 'i'))) {
    sorunlar.push(`Başlık belirsiz bir kelimeyle başlıyor ("${b.split(/\s+/)[0]}"); başlığı girişimin, platformun ya da kurumun adıyla başlat`);
  }
  if (/[?!]$/.test(b)) sorunlar.push('Başlık soru ya da ünlemle bitiyor; olguyu düz cümleyle söyle');
  if ((b.match(/[\p{L}\d]+/gu) ?? []).length < EN_AZ_BASLIK_KELIMESI) {
    sorunlar.push(`Başlık çok kısa ve belirsiz (en az ${EN_AZ_BASLIK_KELIMESI} kelime): kim, ne yaptı, ne kadar`);
  }
  return sorunlar;
}

export function kesinKontroller(h, kaynak) {
  const m = tamMetin(h);
  return [...baslikKontrol(h.title), ...uzunlukKontrol(h.body), ...rakamKontrol(m, kaynak), ...kunyeKontrol(h.kunye ?? {}, kaynak), ...alintiKontrol(m, kaynak), ...adKontrol(m, kaynak), ...kopyaKontrol(h.body, kaynak), ...zamanKontrol(m), ...medyaKontrol(m)];
}

const tamMetinKisa = (h) => `BAŞLIK: ${h.title}\nSPOT: ${h.description}\nMETİN:\n${h.body}`;

const DEGERLENDIRME_SEMASI = {
  type: 'object',
  properties: {
    onay: { type: 'boolean' },
    sorunlar: { type: 'array', items: { type: 'string' }, description: 'Somut sorunlar; onaylıysa boş' },
  },
  required: ['onay', 'sorunlar'],
};

const METIN_SEMASI = {
  type: 'object',
  properties: { title: { type: 'string' }, description: { type: 'string' }, body: { type: 'string' } },
  required: ['title', 'description', 'body'],
};

// ── 2. Yazı işleri müdürü ──────────────────────────────────────────────
export async function degerlendir(h, kaynak) {
  const sorunlar = kesinKontroller(h, kaynak);
  const r = await gemini({
    denetim: true,
    schema: DEGERLENDIRME_SEMASI,
    prompt: `Sen kifobu'nun yazı işleri müdürüsün. Yapay zekânın yazdığı bir haber taslağını yayından önce kaynaklarla karşılaştırıyorsun (Basın Meslek İlkeleri). Sıkı ol: şüphe varsa onaylama.

Şunlardan biri varsa onay=false ver ve sorunu kısaca, somut olarak yaz:
1. Taslaktaki bir olgu (rakam, ad, unvan, tarih, yer, şirket, olay) kaynaklarda yok ya da yanlış aktarılmış.
2. Şirketin ya da kişinin iddiası, hedefi ya da yorumu olgu gibi sunulmuş; kime ait olduğu belirtilmemiş.
3. Başlık ya da spot metnin desteklediğinden fazlasını söylüyor, abartıyor ya da yanıltıyor; tık tuzağı.
4. Taslakta muhabirin kendi yorumu, övgü, abartılı ya da duygusal kelimeler, spekülasyon var.
5. Anlam kayması: "planlıyor" → "yaptı", "iddia" → "kesinleşti", "görüşüyor" → "anlaştı", "söylenti" → "açıkladı" gibi.
6. Özel hayat, suç, çocuklar, sağlık gibi özen gerektiren bir konu var ve özensiz işlenmiş.
7. Kaynak site adı anılmış ("X'in haberine göre" gibi); kifobu kaynak site adı vermez.
8. Dil bozuk, anlaşılmaz ya da Türkçe değil.

Hiçbiri yoksa onayla. Küçük dil iyileştirmeleri onaylamama sebebi değildir.

KAYNAKLAR:
${ilgiliKisim(kaynak, tamMetin(h), 14000)}

TASLAK:
${tamMetinKisa(h)}`,
  });
  if (!r) return { onay: false, sorunlar: [...sorunlar, 'Yazı işleri kontrolü çalıştırılamadı'] };
  sorunlar.push(...r.sorunlar);
  return { onay: r.onay && sorunlar.length === 0, sorunlar };
}

// ── 3. Muhabire düzeltme ───────────────────────────────────────────────
export async function duzelt(h, kaynak, sorunlar) {
  const r = await gemini({
    schema: METIN_SEMASI,
    prompt: `Sen kifobu'nun muhabirisin. Yazı işleri müdürü taslağında sorunlar buldu. Kaynaklara sıkı sıkıya bağlı kalarak hepsini düzelt: kaynakta olmayan bilgiyi çıkar, iddiaları sahibine atfet, alıntıları kelimesi kelimesine ver ya da dolaylı anlatıma çevir, kopyalanan cümleleri kendi cümlelerinle yeniden kur. "Kaynakta yok" denen rakam ya da ad ya çıkarılır ya da kaynaktaki hâliyle yazılır. Biçimi koru; metin ${HEDEF_KELIME} kelime olmalı (kısaysa yalnızca kaynaklardaki olgularla uzat). Kaynakta olmayan bilgi ekleme.

${YAZIM_KURALLARI}

SORUNLAR:
${sorunlar.map((s) => `- ${s}`).join('\n')}

KAYNAKLAR:
${ilgiliKisim(kaynak, tamMetin(h), 14000)}

TASLAK:
${tamMetinKisa(h)}`,
  });
  return r ? { ...h, ...r } : h;
}

// ── 4. Redaktör ────────────────────────────────────────────────────────
export async function redakte(h) {
  const r = await gemini({
    schema: METIN_SEMASI,
    prompt: `Sen kifobu'nun redaktörüsün (son okuma). Aşağıdaki haberin SADECE dilini düzelt, içeriğine asla dokunma.

Düzelt:
- Yazım ve noktalama: TDK Yazım Kılavuzu. Bağlaç "de/da" ve "ki" ayrı, ekler bitişik; kesme işareti özel adlarda ("Apple'ın", "Türkiye'de"); "yapay zekâ", "mi" soru eki ayrı.
- Çeviri kokan ifadeler ve gereksiz yabancı kelimeler: "-den dolayı olarak", "bir şekilde", "konumlandırıyor", "ilgili olarak", "gerçekleştirdi" (yerine "yaptı"), "sağlamakta" (yerine "sağlıyor"); doğal Türkçe karşılıkları kullan. Marka, ürün ve şirket adları değişmez.
- Haber dili: kısa ve net cümleler (tercihen 25 kelimenin altında), etken çatı, bir cümlede bir bilgi. "olduğu ifade ediliyor", "kaydediliyor", "belirtiliyor" gibi kalıpları üst üste kullanma.
- Başlık: sadece ilk kelime ve özel adlar büyük harfle başlar; tık tuzağı ("İşte nedeni", "Şok", "Herkes bunu konuşuyor") ve ünlem yok; sonda nokta yok. Başlık aranan kelimeyle (girişimin, platformun ya da kurumun adı) başlar; "SPK: ..." gibi iki noktalı önek eklenmez, varsa düz cümleye çevrilir.
- Tekrarlar: Spot ile ilk cümle aynı olmasın; aynı ifade art arda tekrar etmesin.
- Klişe ve süslü ifadeler: "bayrağı devraldı", "koltuğa oturdu", "yeni bir sayfa açtı", "göz kamaştırdı" yerine düz anlatım.
- Rakam yazımı: ondalık virgül (1,1), binlik nokta (2.500), yüzde işareti önde (%40), tarih "10 Ekim 2026".
- "bugün", "dün", "yarın" gibi göreli zaman ifadeleri metinde tarih varsa onunla değiştirilir, yoksa çıkarılır.

Değiştirme:
- Olgular, rakamlar, adlar, tarihler ve bilgilerin sırası.
- Doğrudan alıntıların sözcükleri.
- Atıflar ("şirketin açıklamasına göre").
- Uzunluk (belirgin biçimde).
- Paragraf yapısı: metin 4-6 paragraf kalır; paragrafları tek bir blokta birleştirme. Paragraflar arasında boş satır olur.

Metin zaten doğruysa aynen geri ver.

${tamMetinKisa(h)}`,
  });
  return r ? { ...h, ...r } : h;
}

// ── Tüm süreç ──────────────────────────────────────────────────────────
/** Haberi denetler; { haber, sorunlar, notlar } döner. sorunlar boş değilse haber yayımlanmamalı. */
export async function denetle(h, kaynak) {
  // Basit sorunlar (göreli zaman, yayın kuruluşu atfı) yapay zekâya gitmeden yerelde düzeltilir.
  let taslak = yerelDuzelt(h);
  const notlar = [];
  for (let tur = 1; tur <= 2; tur++) {
    const d = await degerlendir(taslak, kaynak);
    if (d.onay) break;
    console.log(`  yazı işleri ${tur}: ${medyaGizle(d.sorunlar.join(' | '))}`);
    notlar.push(...d.sorunlar);
    taslak = await duzelt(taslak, kaynak, d.sorunlar);
  }

  // Redaksiyon kesin kontrollerde yeni sorun yarattıysa atılır.
  const once = taslak;
  const temiz = await redakte(taslak);
  if (kesinKontroller(temiz, kaynak).length > kesinKontroller(once, kaynak).length) {
    notlar.push('Redaksiyon olguları değiştirdi, atıldı');
  } else {
    taslak = temiz;
  }

  // Son kesin kontrol; sorun kalırsa SON_TUR kez daha düzeltme ve redaksiyon.
  let sorunlar = kesinKontroller(taslak, kaynak);
  for (let tur = 1; tur <= SON_TUR && sorunlar.length; tur++) {
    console.log(`  son kontrol ${tur}: ${medyaGizle(sorunlar.join(' | '))}`);
    // Önce yerel düzeltme; sorun kalmazsa Gemini düzeltmesine gerek yok.
    const yerel = yerelDuzelt(taslak);
    const yerelSorun = kesinKontroller(yerel, kaynak);
    if (yerelSorun.length <= sorunlar.length) { taslak = yerel; sorunlar = yerelSorun; }
    if (!sorunlar.length) break;
    const ek = ['Alıntılar kaynaktan harfi harfine aynı sırayla kopyalanmalı; yapamıyorsan tırnaksız dolaylı anlatıma çevir.'];
    if (sorunlar.some((x) => x.startsWith('Metin kaynağın cümlelerini kopyalıyor'))) {
      ek.push('Metni baştan yeniden kur: bilgilerin sırasını değiştir, cümleleri böl ya da birleştir, kaynaktaki kelime dizilerini kullanma. Hiçbir yerde kaynaktan art arda 6 kelimeden uzun parça kalmasın (özel adlar ve rakamlar hariç).');
    }
    const son = await duzelt(taslak, kaynak, [...sorunlar, ...ek]);
    const sonTemiz = await redakte(son);
    taslak = kesinKontroller(sonTemiz, kaynak).length <= kesinKontroller(son, kaynak).length ? sonTemiz : son;
    sorunlar = kesinKontroller(taslak, kaynak);
  }
  return { haber: taslak, sorunlar, notlar };
}
