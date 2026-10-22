// Çeyrek sektör raporu (/rapor/YYYY-cN/): yalnız kifobu'nun kendi kayıtlarından sayılabilen rakamlar.
// Kaynaklar: yayımlanan haberlerin künyeleri (tutar, para birimi, tur) ve günlük bültenin 18:00 kampanya kayıtları.
// Kur çevirisi yapılmaz (tutarlar para birimine göre ayrı toplanır); tahmin ya da dış veri eklenmez.
//
// Yayın kuralı: çeyrek bitmiş olmalı ve çeyrekte en az EN_AZ_RAPOR_HABERI listelenen haber bulunmalı. Bu koşul
// sağlanmayan çeyreğin sayfası üretilmez (iskelet hazır, veri birikince kendiliğinden yayımlanır).
import type { ArsivKaydi } from './arsiv/tipler.ts';
import { istanbulGunu } from './gunler.ts';
import { listelenir, type KonuAday } from './konular.ts';
import { kampanyalar } from './kampanya.ts';

export const EN_AZ_RAPOR_HABERI = 60;

export interface RaporAday extends KonuAday {
  data: KonuAday['data'] & { paraBirimi?: string };
}

export interface Ceyrek {
  yil: number;
  c: 1 | 2 | 3 | 4;
  slug: string;
  ad: string;
  bas: string;
  son: string;
}

const AYLAR = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
const iki = (n: number) => String(n).padStart(2, '0');

export function ceyrek(yil: number, c: 1 | 2 | 3 | 4): Ceyrek {
  const ilkAy = (c - 1) * 3 + 1;
  const sonAy = ilkAy + 2;
  const sonGun = new Date(Date.UTC(yil, sonAy, 0)).getUTCDate();
  return {
    yil,
    c,
    slug: `${yil}-c${c}`,
    ad: `${yil} ${c}. çeyrek (${AYLAR[ilkAy - 1]}–${AYLAR[sonAy - 1]})`,
    bas: `${yil}-${iki(ilkAy)}-01`,
    son: `${yil}-${iki(sonAy)}-${iki(sonGun)}`,
  };
}

/** Günün (YYYY-AA-GG) çeyreği. */
export function gunCeyregi(gun: string): Ceyrek {
  const [y, a] = gun.split('-').map(Number);
  return ceyrek(y, (Math.floor((a - 1) / 3) + 1) as 1 | 2 | 3 | 4);
}

export interface CeyrekOzeti {
  ceyrek: Ceyrek;
  tamamlandi: boolean;
  yayimlanir: boolean;
  haberSayisi: number;
  bolumler: { category: string; adet: number }[];
  yatirimHaberi: number;
  /** Tutar toplamına katılmayan (fon kapanışı, halka arz) yatırım haberi sayısı. */
  tutarDisi: number;
  tutarlar: { paraBirimi: string; adet: number; toplam: number }[];
  turlar: { tur: string; adet: number }[];
  enBuyukler: { id: string; title: string; toplanan: number; paraBirimi: string }[];
  kampanya: {
    kayitGunu: number;
    kampanyaSayisi: number;
    hedefeUlasan: number;
    platformlar: { platform: string; kampanya: number; toplam: number }[];
  };
}

/** Tur adlarının sayım anahtarı: "Tohum Öncesi" ile "Tohum öncesi" aynı turdur. */
export const turAnahtari = (t: string) => t.trim().replace(/\s+/g, ' ').toLocaleLowerCase('tr-TR');

/**
 * Raporun tur grubu. Eş anlamlı yazılışlar birleşir ("Ön Tohum", "pre-Tohum" → "Tohum öncesi"). Fon kapanışları
 * (girişim sermayesi fonunun topladığı para) ve halka arzlar girişim turu değildir: sayılır ama tutar toplamına katılmaz.
 */
export function turGrubu(t: string): { ad: string; girisimTuru: boolean } {
  const k = turAnahtari(t);
  if (/halka arz/.test(k)) return { ad: 'Halka arz', girisimTuru: false };
  if (/(^|\s)fon(u|unu|unun)?(\s|$)|fon kapan|fon kapama/.test(k)) return { ad: 'Fon kapanışı', girisimTuru: false };
  if (/^(ön|pre)[- ]?tohum$|^tohum öncesi$/.test(k)) return { ad: 'Tohum öncesi', girisimTuru: true };
  if (k === 'tohum') return { ad: 'Tohum', girisimTuru: true };
  const seri = k.match(/^seri ([a-h])$/);
  if (seri) return { ad: `Seri ${seri[1].toLocaleUpperCase('tr-TR')}`, girisimTuru: true };
  return { ad: t.trim().replace(/\s+/g, ' '), girisimTuru: true };
}

/** Tek haberlik turlar tabloyu uzatmasın: bir kez geçen gruplar "Diğer" satırında toplanır. */
export const DIGER_TUR = 'Diğer';

const say = <K extends string>(dizi: K[]) => {
  const m = new Map<K, number>();
  for (const x of dizi) m.set(x, (m.get(x) ?? 0) + 1);
  return [...m.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'tr'));
};

export function ceyrekOzeti<T extends RaporAday>(tum: T[], kayitlar: ArsivKaydi[], c: Ceyrek, bugun: string): CeyrekOzeti {
  const icinde = (gun: string) => gun >= c.bas && gun <= c.son;
  const haberler = tum.filter((h) => listelenir(h) && icinde(istanbulGunu(h.data.date)));
  const yatirim = haberler.filter((h) => typeof h.data.toplanan === 'number' && h.data.toplanan > 0);
  const girisimTurlari = yatirim.filter((h) => !h.data.tur || turGrubu(h.data.tur).girisimTuru);
  const pb = (h: T) => h.data.paraBirimi ?? 'TRY';

  const tutarHarita = new Map<string, { adet: number; toplam: number }>();
  for (const h of girisimTurlari) {
    const t = tutarHarita.get(pb(h)) ?? { adet: 0, toplam: 0 };
    t.adet++;
    t.toplam += h.data.toplanan!;
    tutarHarita.set(pb(h), t);
  }

  const ceyrekKayitlari = kayitlar.filter((k) => icinde(k.tarih));
  const kps = kampanyalar(ceyrekKayitlari);
  const platHarita = new Map<string, { kampanya: number; toplam: number }>();
  for (const kp of kps) {
    const p = platHarita.get(kp.platform) ?? { kampanya: 0, toplam: 0 };
    p.kampanya++;
    p.toplam += kp.son.alinan;
    platHarita.set(kp.platform, p);
  }

  const tamamlandi = bugun > c.son;
  return {
    ceyrek: c,
    tamamlandi,
    yayimlanir: tamamlandi && haberler.length >= EN_AZ_RAPOR_HABERI,
    haberSayisi: haberler.length,
    bolumler: say(haberler.map((h) => h.data.category)).map(([category, adet]) => ({ category, adet })),
    yatirimHaberi: yatirim.length,
    tutarDisi: yatirim.length - girisimTurlari.length,
    tutarlar: [...tutarHarita.entries()].map(([paraBirimi, t]) => ({ paraBirimi, ...t })).sort((a, b) => b.adet - a.adet),
    turlar: (() => {
      const sayim = say(yatirim.filter((h) => h.data.tur).map((h) => turGrubu(h.data.tur!).ad));
      const tekil = sayim.filter(([, adet]) => adet === 1).length;
      const satir = sayim.filter(([, adet]) => adet > 1 || tekil === 1).map(([tur, adet]) => ({ tur, adet }));
      return tekil > 1 ? [...satir, { tur: DIGER_TUR, adet: tekil }] : satir;
    })(),
    enBuyukler: Object.values(
      // Para birimleri karşılaştırılamaz: her para biriminin en büyük 5 tutarı.
      girisimTurlari.reduce<Record<string, T[]>>((acc, h) => ((acc[pb(h)] ??= []).push(h), acc), {}),
    ).flatMap((liste) =>
      liste
        .sort((a, b) => b.data.toplanan! - a.data.toplanan!)
        .slice(0, 5)
        .map((h) => ({ id: h.id, title: h.data.title, toplanan: h.data.toplanan!, paraBirimi: pb(h) })),
    ),
    kampanya: {
      kayitGunu: ceyrekKayitlari.length,
      kampanyaSayisi: kps.length,
      hedefeUlasan: kps.filter((k) => k.son.yuzde >= 100).length,
      platformlar: [...platHarita.entries()].map(([platform, p]) => ({ platform, ...p })).sort((a, b) => b.toplam - a.toplam),
    },
  };
}

/** Verisi olan (haber ya da kampanya kaydı bulunan) bütün çeyrekler, en yeni önce. */
export function veriliCeyrekler(gunler: string[]): Ceyrek[] {
  const harita = new Map<string, Ceyrek>();
  for (const g of gunler) {
    const c = gunCeyregi(g);
    harita.set(c.slug, c);
  }
  return [...harita.values()].sort((a, b) => (a.bas < b.bas ? 1 : -1));
}

/** Ay aralığı: "2026 4. çeyrek (Ekim–Aralık)" → "Ekim–Aralık 2026". */
export const ceyrekAylari = (c: Ceyrek) => `${AYLAR[(c.c - 1) * 3]}–${AYLAR[(c.c - 1) * 3 + 2]} ${c.yil}`;

/** Rapor verisinin lisansı: atıfla serbest kullanım (alıntı = kaynak bağlantısı). */
export const LISANS = { ad: 'CC BY 4.0', url: 'https://creativecommons.org/licenses/by/4.0/deed.tr' };

/** Alıntı ve paylaşım için kaynak notu (sayfada, CSV'de ve duyuru metinlerinde aynı cümle). */
export const kaynakNotu = (c: Ceyrek, url: string) => `Kaynak: kifobu, ${c.ad} raporu, ${url}`;

/**
 * Raporun bütün tablolarının tek CSV'si (/rapor/YYYY-cN.csv): her satır bir tablonun bir satırı.
 * Sütunlar: tablo, anahtar, adet, toplam, para_birimi. Rakamlar yuvarlanmadan, ondalık nokta ile yazılır.
 */
export function raporCsv(o: CeyrekOzeti, url: string): string {
  const alan = (v: string | number | undefined) => {
    const s = v === undefined ? '' : String(v);
    return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const satirlar: (string | number | undefined)[][] = [
    ['tablo', 'anahtar', 'adet', 'toplam', 'para_birimi'],
    ['ozet', 'haber', o.haberSayisi],
    ['ozet', 'yatirim_haberi', o.yatirimHaberi],
    ['ozet', 'tutara_katilmayan_yatirim_haberi', o.tutarDisi],
    ['ozet', 'kampanya', o.kampanya.kampanyaSayisi],
    ['ozet', 'hedefe_ulasan_kampanya', o.kampanya.hedefeUlasan],
    ['ozet', 'kampanya_kayit_gunu', o.kampanya.kayitGunu],
    ...o.bolumler.map((b) => ['bolum', b.category, b.adet]),
    ...o.tutarlar.map((t) => ['yatirim_tutari', t.paraBirimi, t.adet, t.toplam, t.paraBirimi]),
    ...o.turlar.map((t) => ['tur', t.tur, t.adet]),
    ...o.kampanya.platformlar.map((p) => ['platform', p.platform, p.kampanya, p.toplam, 'TRY']),
  ];
  return `# ${kaynakNotu(o.ceyrek, url)} (lisans: ${LISANS.ad}, ${LISANS.url})\n${satirlar.map((s) => [...s, ...Array(5 - s.length).fill(undefined)].map(alan).join(',')).join('\n')}\n`;
}
