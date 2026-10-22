// Standartlar Raporu (/standartlar-raporu/): üç ayda bir, yayın ilkelerinin uygulanışı rakamlarla.
// İki kaynak birleşir: (1) çeyrek bitince botun iş akışının yazdığı defter sayıları
// (src/data/standartlar-raporu/<YYYY>-c<N>.json), (2) derleme anında sitenin kendi içeriğinden sayılanlar
// (bot haberi, yayıncının adıyla çıkan yazı, düzeltme ve kaldırma, şikâyet). Saf TypeScript: birim testiyle sınanır.
import { botHaberi, type SeffafHaber } from './seffaflik.ts';
import { yapayZekaNotu, ZINCIR_URETIMI } from './yapay-zeka-notu.ts';
import { istanbulGunu } from './gunler.ts';

/**
 * src/data/sikayetler.json biçimi: karara bağlanan her şikâyet için tek satır. Şikâyetçinin kimliği ve şikâyet
 * metni yazılmaz.
 *   { "alindi": "YYYY-MM-DD", "karar": "YYYY-MM-DD", "sonuc": "yerinde" | "kismen" | "yerinde-degil" }
 * Rapor, şikâyeti `karar` tarihinin düştüğü çeyrekte sayar.
 */
export interface Sikayet {
  alindi: string;
  karar: string;
  sonuc: 'yerinde' | 'kismen' | 'yerinde-degil';
}

/** src/data/standartlar-raporu/<YYYY>-c<N>.json: çeyrek bitince bot tarafından yazılan defter sayıları. */
export interface DefterCeyregi {
  ceyrek: string;
  bas: string;
  son: string;
  /** Defterin tutulmaya başlandığı gün; çeyrek başından sonraysa sayfa bunu not eder. */
  defterBaslangici: string;
  yazildi: number;
  elendi: number;
  kirmizi: number;
  sari: number;
  kurallar: { kirmizi: Record<string, number>; sari: Record<string, number> };
  geminiCagri: number;
  /** Hassas konu kurallarında değişiklik yapılan günler (YYYY-AA-GG); yoksa null. */
  kuralDegisiklikleri: string[] | null;
  uretim?: string;
}

export interface SayilanKayit {
  tarih: string;
  tur: string;
}

export interface SitedenSayilan {
  botHaberi: number;
  yayinciYazisi: number;
  zincirYazisi: number;
  duzeltme: number;
  kaldirilan: number;
  sikayet: { toplam: number; yerinde: number; kismen: number; yerindeDegil: number };
}

/** Kural kodunun okur için adı. Bilinmeyen kod olduğu gibi döner. */
export const KURAL_ADLARI: Record<string, string> = {
  suc: 'suç',
  'suc-genel': 'suç (genel)',
  cocuk: 'çocuk',
  intihar: 'intihar',
  teror: 'terör',
  'savas-dili': 'savaş tarafı dili',
  'grup-genelleme': 'grup genellemesi',
  'turkiye-devlet': 'Türkiye devlet büyükleri',
  'yatirim-tavsiyesi': 'yatırım tavsiyesi',
  'ozel-haber': 'tek yayının özel haberi',
  'kaynak-benzerligi': 'kaynağa fazla benzerlik',
  'medya-adi': 'medya adı',
  'olum-kaza': 'ölüm ve kaza',
  'turkiye-resmi': 'Türkiye resmî kurumları',
  'savas-konu': 'savaş',
  secim: 'seçim',
  'grup-konu': 'grup konuları',
  'kurum-degerlendirme': 'kurum değerlendirmesi',
};

export const kuralAdi = (kod: string): string => KURAL_ADLARI[kod] ?? kod;

/** Rakamı 0 olan satırlar yazılmaz; çoktan aza, eşitlikte ada göre. */
export function kuralSatirlari(kurallar: Record<string, number> | undefined): { kod: string; ad: string; n: number }[] {
  return Object.entries(kurallar ?? {})
    .filter(([, n]) => Number.isFinite(n) && n > 0)
    .map(([kod, n]) => ({ kod, ad: kuralAdi(kod), n }))
    .sort((a, b) => b.n - a.n || a.ad.localeCompare(b.ad, 'tr'));
}

export const kuralToplami = (kurallar: Record<string, number> | undefined): number =>
  Object.values(kurallar ?? {}).reduce((t, n) => t + (Number.isFinite(n) && n > 0 ? n : 0), 0);

/** Elenenlerden hassas konu süzgecine takılmayanlar (haber değeri, yinelenme, yetersiz bilgi...). Negatif olmaz. */
export const kalanElenen = (r: Pick<DefterCeyregi, 'elendi' | 'kirmizi'>): number => Math.max(0, r.elendi - r.kirmizi);

/** Günün (YYYY-AA-GG) çeyrek aralığında olup olmadığı; uçlar dahil. */
export const ceyrekteMi = (gun: string, bas: string, son: string): boolean => gun >= bas && gun <= son;

/** Tarihin İstanbul günü çeyrek aralığında mı (gün sınırı İstanbul saatine göre). */
export const zamanCeyrekteMi = (t: Date, bas: string, son: string): boolean => ceyrekteMi(istanbulGunu(t), bas, son);

const AYLAR = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];

/** YYYY-AA-GG → "1 Ekim 2026". */
export function gunYazi(iso: string): string {
  const [y, a, g] = iso.split('-').map(Number);
  return `${g} ${AYLAR[a - 1]} ${y}`;
}

/** "2026 4. çeyrek (1 Ekim – 31 Aralık 2026)". */
export function ceyrekBasligi(r: Pick<DefterCeyregi, 'ceyrek' | 'bas' | 'son'>): string {
  const m = r.ceyrek.match(/^(\d{4})-c([1-4])$/);
  const [by, ba, bg] = r.bas.split('-').map(Number);
  const [sy, sa, sg] = r.son.split('-').map(Number);
  const bitis = `${sg} ${AYLAR[sa - 1]} ${sy}`;
  const baslangic = by === sy ? `${bg} ${AYLAR[ba - 1]}` : `${bg} ${AYLAR[ba - 1]} ${by}`;
  const ad = m ? `${m[1]} ${m[2]}. çeyrek` : r.ceyrek;
  return `${ad} (${baslangic} – ${bitis})`;
}

/** Defter çeyrek başından sonra başladıysa sayfa sondaki notu yazar. */
export const defterNotuGerekli = (r: Pick<DefterCeyregi, 'defterBaslangici' | 'bas'>): boolean => r.defterBaslangici > r.bas;

/** Raporlar en yeniden eskiye. */
export const raporlariSirala = <T extends { bas: string }>(l: T[]): T[] => [...l].sort((a, b) => (a.bas < b.bas ? 1 : a.bas > b.bas ? -1 : 0));

/** "ölüm ve kaza 3, seçim 1" ya da boş metin. */
export function kuralDokumu(kurallar: Record<string, number> | undefined): string {
  return kuralSatirlari(kurallar).map((s) => `${s.ad} ${s.n}`).join(', ');
}

export interface SayimHaber extends SeffafHaber {
  author?: string;
  yaziTuru?: string;
}

/**
 * Çeyrek aralığında (İstanbul günü) sitenin kendi içeriğinden sayılanlar.
 * - botHaberi: seffaflik.ts `botHaberi` (uretim yapay-zeka; bülten ve taslak hariç).
 * - yayinciYazisi: yapayZekaNotu() 'sahip' türünü verenler (yazar Şenol Dak ya da yazı türü dolu); zincir yazıları hariç.
 * - duzeltme / kaldirilan: Düzeltmeler sayfasının kayıtları (tarih ve tur).
 * - sikayet: `karar` tarihine göre.
 */
export function ceyrekSayilari(
  haberler: SayimHaber[],
  duzeltmeler: SayilanKayit[],
  sikayetler: Sikayet[],
  bas: string,
  son: string,
): SitedenSayilan {
  const aralikta = haberler.filter((h) => !h.draft && zamanCeyrekteMi(h.date, bas, son));
  const dz = duzeltmeler.filter((k) => ceyrekteMi(k.tarih, bas, son));
  const sk = sikayetler.filter((s) => ceyrekteMi(s.karar, bas, son));
  return {
    botHaberi: aralikta.filter(botHaberi).length,
    yayinciYazisi: aralikta.filter((h) => yapayZekaNotu({ uretim: h.uretim, author: h.author, yaziTuru: h.yaziTuru }, '', '')?.tur === 'sahip').length,
    zincirYazisi: aralikta.filter((h) => h.uretim === ZINCIR_URETIMI).length,
    duzeltme: dz.filter((k) => k.tur === 'Düzeltme').length,
    kaldirilan: dz.filter((k) => k.tur === 'Yayından kaldırıldı').length,
    sikayet: {
      toplam: sk.length,
      yerinde: sk.filter((s) => s.sonuc === 'yerinde').length,
      kismen: sk.filter((s) => s.sonuc === 'kismen').length,
      yerindeDegil: sk.filter((s) => s.sonuc === 'yerinde-degil').length,
    },
  };
}
