// "Daha önce bu konuda": aynı girişim, platform ya da olay hakkında daha eski haberler (tidsrøst src/lib/tidligere.ts
// uyarlaması). Aynı konu = aynı girişim (künye), aynı platform, ya da başlıkta ortak bir özel ad ve yüksek anlam
// benzerliği. "X yatırım aldı" kalıbındaki bütün haberler birbirine bağlanmasın diye anlam tek başına yetmez, ortak ad
// şarttır. Günlük bültenler, botun derlemeleri ve sahibin yazıları sayılmaz. Eskiden yeniye sıralı; boşsa bölüm yok.
import { anlamBenzerligi, vektorleriOku } from './anlam.mjs';
import { derlemeMi, sahipYazisi } from './hazirlanis.mjs';

export const DAHA_ONCE_EN_COK = 4;
export const ANLAM_EN_AZ = 0.8;

export interface OnceAday {
  id: string;
  data: { title: string; date: Date; category: string; draft?: boolean; uretim?: string; author?: string; yaziTuru?: string; derleme?: boolean; girisim?: string; platform?: string };
}
export type AnlamFn = (a: OnceAday, b: OnceAday) => number | null;
const varsayilanAnlam: AnlamFn = (a, b) => anlamBenzerligi(vektorleriOku(), a.id, b.id);

// Türkçe küçük harf; İngilizce adlardaki I ("Intelligence" → "ıntelligence") karşılaştırmada i sayılır.
const norm = (s: string) => s.toLocaleLowerCase('tr-TR').replace(/ı/g, 'i').replace(/\s+/g, ' ').trim();

// Başlıkta büyük harfle başlayan ama özel ad olmayan sözcükler (genel kavramlar, yer ve tur adları eşleşme sayılmaz).
const GENEL = new Set(
  ['seri', 'tohum', 'türkiye', 'türk', 'abd', 'avrupa', 'asya', 'çin', 'hindistan', 'ingiltere', 'birleşik', 'krallık', 'almanya', 'fransa',
    'yapay', 'zekâ', 'zeka', 'girişim', 'girişimi', 'girişimler', 'kitle', 'fonlama', 'fonlaması', 'yeni', 'bir', 'bu', 'ekim', 'kasım',
    'aralık', 'ocak', 'şubat', 'mart', 'nisan', 'mayıs', 'haziran', 'temmuz', 'ağustos', 'eylül', 'spk', 'mkk', 'gsyh', 'ai', 'vc', 'arr',
    // Şirket adlarının genel ekleri: "Pluto Security" ile "Harmonic Security" aynı konu değildir.
    'security', 'intelligence', 'bio', 'labs', 'lab', 'robotics', 'ventures', 'capital', 'technologies', 'technology', 'tech', 'health',
    'systems', 'group', 'holding', 'partners', 'fund', 'global', 'network', 'energy', 'therapeutics', 'software', 'data', 'cloud', 'finance'].map(norm),
);

/** Başlıktaki özel adlar: büyük harfle başlayan, en az üç harfli, genel olmayan sözcükler; kesme işaretinden sonrası atılır. */
export function ozelAdlar(baslik: string): Set<string> {
  const ut = new Set<string>();
  for (const ham of baslik.split(/[\s,;:.!?"“”()/]+/)) {
    const soz = ham.split(/['’]/)[0];
    if (soz.length < 3 || !/^\p{Lu}/u.test(soz)) continue;
    const n = norm(soz);
    if (!GENEL.has(n)) ut.add(n);
  }
  return ut;
}

const sayilmaz = (h: OnceAday) => h.data.draft || h.data.category === 'gunluk-bulten' || derlemeMi(h.data) || sahipYazisi(h.data);

/** İki haber aynı konu mu? */
export function ayniKonu(a: OnceAday, b: OnceAday, anlam: AnlamFn = varsayilanAnlam): boolean {
  if (a.data.girisim && b.data.girisim && norm(a.data.girisim) === norm(b.data.girisim)) return true;
  if (a.data.platform && b.data.platform && norm(a.data.platform) === norm(b.data.platform)) return true;
  const adA = ozelAdlar(a.data.title);
  if (![...ozelAdlar(b.data.title)].some((x) => adA.has(x))) return false;
  const s = anlam(a, b);
  return s !== null && s >= ANLAM_EN_AZ;
}

/** Haberden önce yayımlanmış, aynı konudaki en yeni DAHA_ONCE_EN_COK haber; eskiden yeniye. */
export function dahaOnce<T extends OnceAday>(haber: T, hepsi: T[], anlam: AnlamFn = varsayilanAnlam): T[] {
  if (sayilmaz(haber)) return [];
  return hepsi
    .filter((h) => h.id !== haber.id && h.data.date < haber.data.date && !sayilmaz(h) && ayniKonu(haber, h, anlam))
    .sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf())
    .slice(0, DAHA_ONCE_EN_COK)
    .reverse();
}
