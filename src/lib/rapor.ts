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

const say = <K extends string>(dizi: K[]) => {
  const m = new Map<K, number>();
  for (const x of dizi) m.set(x, (m.get(x) ?? 0) + 1);
  return [...m.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'tr'));
};

export function ceyrekOzeti<T extends RaporAday>(tum: T[], kayitlar: ArsivKaydi[], c: Ceyrek, bugun: string): CeyrekOzeti {
  const icinde = (gun: string) => gun >= c.bas && gun <= c.son;
  const haberler = tum.filter((h) => listelenir(h) && icinde(istanbulGunu(h.data.date)));
  const yatirim = haberler.filter((h) => typeof h.data.toplanan === 'number' && h.data.toplanan > 0);
  const pb = (h: T) => h.data.paraBirimi ?? 'TRY';

  const tutarHarita = new Map<string, { adet: number; toplam: number }>();
  for (const h of yatirim) {
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
    tutarlar: [...tutarHarita.entries()].map(([paraBirimi, t]) => ({ paraBirimi, ...t })).sort((a, b) => b.adet - a.adet),
    // Görünen ad, o turun ilk görülen yazılışıdır ("Seri A" küçültülüp bozulmaz).
    turlar: (() => {
      const adlar = new Map<string, string>();
      for (const h of yatirim) if (h.data.tur && !adlar.has(turAnahtari(h.data.tur))) adlar.set(turAnahtari(h.data.tur), h.data.tur.trim());
      return say(yatirim.filter((h) => h.data.tur).map((h) => turAnahtari(h.data.tur!))).map(([a, adet]) => ({ tur: adlar.get(a)!, adet }));
    })(),
    enBuyukler: Object.values(
      // Para birimleri karşılaştırılamaz: her para biriminin en büyük 5 tutarı.
      yatirim.reduce<Record<string, T[]>>((acc, h) => ((acc[pb(h)] ??= []).push(h), acc), {}),
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
