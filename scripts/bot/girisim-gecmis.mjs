// Bot haberindeki girişim kitle fonlamasına çıkmışsa (src/data/kampanya-gecmis.json) habere kayıttan bir "kampanya geçmişi"
// bölümü ve /girisim/<slug>/ bağlantısı eklenir; künyenin boş alanları son kampanyadan dolar. Metin yapay zekâ yazmaz:
// rakamlar kayıttan aynen gelir. İkincil piyasa ilan fiyatları bilerek yok (yatırım tavsiyesi riski; sayfada duruyor).
// Slug kuralı src/lib/kampanya-gecmis.ts gecmisGirisimler ile aynı olmalı (aynı ada düşen girişime platform eki).
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { adNorm } from './lib.mjs';

export function slugTr(s) {
  return String(s)
    .replace(/İ/g, 'i').replace(/I/g, 'i').toLocaleLowerCase('tr-TR')
    .replace(/ı/g, 'i').replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ş/g, 's').replace(/ö/g, 'o').replace(/ç/g, 'c')
    .normalize('NFKD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

export function girisimleriKur(kampanyalar) {
  const gruplar = new Map();
  for (const k of kampanyalar) gruplar.set(k.anahtar, [...(gruplar.get(k.anahtar) ?? []), k]);
  const liste = [...gruplar.values()].map((g) => {
    const sirali = [...g].sort((a, b) => (a.baslangic < b.baslangic ? -1 : a.baslangic > b.baslangic ? 1 : 0));
    const son = sirali.at(-1);
    return { slug: slugTr(son.ad), ad: son.ad, sirket: [...sirali].reverse().find((k) => k.sirket)?.sirket ?? null, kampanyalar: sirali };
  });
  const sayac = new Map();
  for (const g of liste) sayac.set(g.slug, (sayac.get(g.slug) ?? 0) + 1);
  for (const g of liste) if (sayac.get(g.slug) > 1) g.slug = `${g.slug}-${slugTr(g.kampanyalar[0].platform)}`;
  return liste;
}

// Ad birebir (norm) eşleşmeli; şirket unvanı ancak unvanın ilk sözcükleri girişim adıyla başlıyorsa sayılır (en az 5 harf).
// Birden çok aday çıkarsa hiçbiri seçilmez: yanlış girişime bağlamaktansa bölüm eklenmez.
export function girisimBul(liste, ad) {
  const n = adNorm(ad);
  if (!n || n.length < 3) return null;
  const adla = liste.filter((g) => adNorm(g.ad) === n);
  if (adla.length) return adla.length === 1 ? adla[0] : null;
  if (n.length < 5) return null;
  const unvanla = liste.filter((g) => g.sirket && adNorm(g.sirket).startsWith(n));
  return unvanla.length === 1 ? unvanla[0] : null;
}

const AYLAR = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
const tarih = (iso) => {
  const [y, a, g] = iso.split('-').map(Number);
  return `${g} ${AYLAR[a - 1]} ${y}`;
};
const sayi = (x, k = 0) => x.toLocaleString('tr-TR', { minimumFractionDigits: k, maximumFractionDigits: k });
const milyon = (x) => `${(x / 1e6).toLocaleString('tr-TR', { maximumFractionDigits: x >= 1e7 ? 1 : 2 })} milyon TL`;
const yuzde = (x) => `yüzde ${sayi(x * 100, Number.isInteger(Math.round(x * 1000) / 10) ? 0 : 1)}`;

function kampanyaCumlesi(k, sira, toplam) {
  const SIRA = ['İlk', 'İkinci', 'Üçüncü', 'Dördüncü', 'Beşinci', 'Altıncı'];
  const ad = toplam > 1 ? `${SIRA[sira - 1] ?? `${sira}.`} kampanya` : 'Kampanya';
  const parca = [];
  parca.push(`${ad} ${tarih(k.baslangic)}${k.bitis ? `–${tarih(k.bitis)}` : ''} arasında ${k.platform ? `${platformAdi(k.platform)} üzerinde ` : ''}yürütüldü.`);
  const sonuc = k.durum === 'fonlandi' ? 'hedefe ulaştı' : 'hedefe ulaşamadan kapandı';
  parca.push(`${milyon(k.hedef)} hedefle çıkan kampanya ${sonuc}; ${k.yatirimci ? `${sayi(k.yatirimci)} yatırımcı ${milyon(k.alinan)} yatırdı` : `toplanan tutar ${milyon(k.alinan)} oldu`}${k.nitelikli ? ` (nitelikli yatırımcı sayısı: ${sayi(k.nitelikli)})` : ''}.`);
  if (k.payArz) parca.push(`Kampanyada satışa sunulan pay oranı ${yuzde(k.payArz)} idi; hedef tutar şirkete yaklaşık ${milyon(k.hedef / k.payArz)} değer biçiyordu.`);
  const pay = [];
  if (k.payFiyati) pay.push(`paylar ${sayi(k.payFiyati, 2)} TL'den dağıtıldı`);
  if (k.fonAktarim && k.durum === 'fonlandi') pay.push(`fonlar şirkete ${tarih(k.fonAktarim)} tarihinde aktarıldı`);
  if (pay.length) parca.push(`${pay.join(', ').replace(/^./, (c) => c.toUpperCase())}.`);
  return parca.join(' ');
}

const PLATFORMLAR = { fonbulucu: 'Fonbulucu', fonangels: 'Fonangels', fongogo: 'Fongogo', 'girisim-sermayesi': 'Girişim Sermayesi' };
const platformAdi = (p) => PLATFORMLAR[p] ?? p.replace(/(^|-)(\p{L})/gu, (_, a, b) => `${a ? ' ' : ''}${b.toLocaleUpperCase('tr-TR')}`);

/** Haber gövdesine eklenecek bölüm (Markdown) ve künye için son kampanyanın alanları. */
export function gecmisBolumu(g, ad = g.ad) {
  const ks = g.kampanyalar;
  const fonlanan = ks.filter((k) => k.durum === 'fonlandi');
  const toplam = fonlanan.reduce((t, k) => t + k.alinan, 0);
  const baslik = fonlanan.length > 1 ? `## ${fonlanan.length} kampanyada ${milyon(toplam)}` : '## Kitle fonlaması geçmişi';
  const satirlar = [baslik, '', `${ad} kitle fonlamasına ${ks.length > 1 ? `${ks.length} kez` : 'bir kez'} çıktı.`];
  ks.forEach((k, i) => satirlar.push('', kampanyaCumlesi(k, i + 1, ks.length)));
  satirlar.push('', `Kampanya geçmişi, faaliyet raporları ve paylara ilişkin bilgiler [${ad} sayfasında](/girisim/${g.slug}/) yer alıyor.`);
  const son = ks.at(-1);
  const kunye = {
    platform: platformAdi(son.platform),
    toplanan: son.alinan,
    hedef: son.hedef,
    yatirimci: son.yatirimci ?? undefined,
    durum: son.durum === 'fonlandi' ? 'basarili' : 'basarisiz',
  };
  return { metin: satirlar.join('\n'), kunye };
}

// Ad eşleşmesi tek başına yetmez (yabancı "Sugar", "Corpus" gibi adlar kayıttaki girişimlerle çakışır): kaynakta ya da haberde
// kitle fonlaması, kampanyanın platformu ya da şirket unvanının ilk sözcüğü geçmeli.
const kucuk = (s) => String(s).toLocaleLowerCase('tr-TR');
export function kanitVar(g, metin) {
  const m = kucuk(metin);
  if (/kitle fonlama|paya dayalı/.test(m)) return true;
  if (g.kampanyalar.some((k) => k.platform && m.includes(kucuk(platformAdi(k.platform))))) return true;
  const ilk = g.sirket ? kucuk(g.sirket).split(/\s+/)[0] : '';
  return ilk.length >= 5 && m.includes(ilk);
}

let onbellek;
export async function girisimListesi(rot) {
  onbellek ??= JSON.parse(await readFile(path.join(rot, 'src', 'data', 'kampanya-gecmis.json'), 'utf8')).kampanyalar;
  return girisimleriKur(onbellek);
}

/**
 * Haberi zenginleştirir: girişim kayıtta varsa gövdeye geçmiş bölümü ekler, künyedeki boş alanları doldurur.
 * Haberin kendi künyesi (bu haberin konusu olan yeni tur) doluysa ona dokunulmaz. Girişim yoksa haber aynen döner.
 */
export function zenginlestir(haber, kunye, liste, kaynakMetni = '') {
  const g = girisimBul(liste, kunye.girisim);
  if (!g || /\/girisim\//.test(haber.body ?? '') || !kanitVar(g, `${kaynakMetni}
${haber.body ?? ''}`)) return { haber, kunye, girisim: null };
  const { metin, kunye: k } = gecmisBolumu(g, kunye.girisim.trim());
  // Künyenin tutar alanları "bu haber bir fonlamayı anlatıyor" demektir (kapak, tahta, sayımlar): geçmişten doldurulmaz.
  // Haber kendi turunu anlatıyorsa (toplanan dolu) tur adı platformun koyduğu ad değil kayıttaki sıradır; eşleşmezse yeni tur.
  const yeniKunye = { ...kunye };
  if (kunye.toplanan > 0) {
    const ks = g.kampanyalar;
    const sira = ks.findIndex((x) => Math.abs(x.alinan - kunye.toplanan) <= x.alinan * 0.01);
    yeniKunye.tur = sira >= 0 ? `${sira + 1}. tur (toplam ${ks.length})` : `${ks.length + 1}. tur`;
  } else if (!yeniKunye.platform) yeniKunye.platform = k.platform;
  return { haber: { ...haber, body: `${String(haber.body ?? '').trimEnd()}\n\n${metin}` }, kunye: yeniKunye, girisim: g.slug };
}
