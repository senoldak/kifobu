// Kimlik v2 ortak yardımcıları (BRAND.md): renkler, yüzde yazımı, hedef çubuğu, durum etiketi, tohum işareti.
// Site, kapaklar ve 18:00 bülteni aynı değerleri buradan alır. Saf TypeScript: Node testleri doğrudan çalıştırır.
import type { Durum } from './site.ts';

export const KIMLIK = {
  kagit: '#f7f5ef',
  murekkep: '#141a17',
  sari: '#e8b40c',
  gri: '#5d645f',
  cizgi: '#dcd9cf',
  yesil: '#10b981',
  asim: '#a7e9cf',
} as const;

/**
 * Sıfıra doğru keser (yuvarlamaz). Göreli pay yalnız kayan nokta artığını siler (0,29 × 100 = 28,999…96 → 29);
 * mutlak pay büyük hedeflerde %99,999…'u %100'e itiyordu.
 */
export function asagiKes(x: number, basamak: number): number {
  const y = x * 10 ** basamak;
  const kesik = Math.trunc(y + Math.sign(y) * Math.abs(y) * 8 * Number.EPSILON) / 10 ** basamak;
  return kesik === 0 ? 0 : kesik; // -0 olmasın
}

/** Yüzde, iki ondalık ve kesilerek (yuvarlanmaz): %99,996 asla %100,00 olmaz. Eksi işareti önde: -%1,23. */
export function yuzdeKesik(n: number | null): string {
  if (n === null || !Number.isFinite(n)) return '—';
  const kesik = asagiKes(n, 2);
  return `${kesik < 0 ? '-' : ''}%${Math.abs(kesik).toFixed(2).replace('.', ',')}`;
}

/** Hedef çubuğu: ölçek en büyüğü (100, gerçekleşme). Dönen değerler çubuk genişliğine göre yüzdedir. */
export function cubukOlcegi(yuzde: number): { dolu: number; asim: number; hedef: number } {
  const y = Number.isFinite(yuzde) ? Math.max(0, yuzde) : 0;
  const olcek = Math.max(100, y);
  const hedef = (100 / olcek) * 100;
  return { dolu: (Math.min(y, 100) / olcek) * 100, asim: y > 100 ? 100 - hedef : 0, hedef };
}

export type EtiketTuru = 'cerceve' | 'yesil' | 'murekkep' | 'gri';

const ETIKETLER: Record<Durum, { metin: string; tur: EtiketTuru }> = {
  yeni: { metin: 'FON TOPLUYOR', tur: 'cerceve' },
  suruyor: { metin: 'FON TOPLUYOR', tur: 'cerceve' },
  basarili: { metin: 'FONLANDI', tur: 'yesil' },
  basarisiz: { metin: 'FONLANAMADI', tur: 'murekkep' },
};

export function durumEtiketi(durum: Durum | undefined): { metin: string; tur: EtiketTuru } | null {
  return durum ? { ...ETIKETLER[durum] } : null;
}

/** Bülten listesinde kapanmış kampanya durumları; bunlar aktif sayılmaz ve gri yazılır. */
export const KAPANIS_DURUMLARI = ['SONA ERDİ', 'İPTAL EDİLDİ', 'GERİ ÇEKİLDİ'] as const;

export function kapandiMi(durum: string): boolean {
  return (KAPANIS_DURUMLARI as readonly string[]).includes(durum.trim().toLocaleUpperCase('tr-TR'));
}

const ALTIN_ACI = Math.PI * (3 - Math.sqrt(5));

// Üç kademe: tam (64 px ve üstü), küçük (33–63 px), minik (32 px ve altı: favicon, alt bilgi logosu).
// Tohum azaldıkça noktalar irileşir; kol yine sağ alta kıvrılır. kat: nokta iriliği (2026-10-18: belirgin kalın, B).
const TOHUM = {
  tam: { n: 233, kol: 21, kat: 1.45 },
  kucuk: { n: 55, kol: 8, kat: 1.55 },
  minik: { n: 34, kol: 8, kat: 1.6 },
} as const;

/** Tohum işareti: 233 tohum (küçükte 55, minikte 34), kol tohumları sarı ve 1,55 kat iri. viewBox 200×200. */
export function tohumIsaretiSvg({ boyut, zemin = 'acik', kucuk = false, minik = false }: { boyut: number; zemin?: 'acik' | 'koyu'; kucuk?: boolean; minik?: boolean }): string {
  const { n, kol: kolAdim, kat } = TOHUM[minik || (kucuk && boyut <= 32) ? 'minik' : kucuk ? 'kucuk' : 'tam'];
  const nokta = zemin === 'koyu' ? KIMLIK.kagit : KIMLIK.murekkep;
  const c = 92 / Math.sqrt(n);
  let s = '';
  for (let i = 1; i <= n; i++) {
    const r = c * Math.sqrt(i);
    const a = i * ALTIN_ACI;
    const k = Math.sqrt(i / n);
    const kol = i % kolAdim === 0;
    const rad = c * 0.36 * kat * (0.35 + 0.75 * k) * (kol ? 1.55 : 1);
    s += `<circle cx="${(100 + r * Math.cos(a)).toFixed(2)}" cy="${(100 + r * Math.sin(a)).toFixed(2)}" r="${rad.toFixed(2)}" fill="${kol ? KIMLIK.sari : nokta}"/>`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${boyut}" height="${boyut}" viewBox="0 0 200 200" aria-hidden="true">${s}</svg>`;
}

/** Platformun veri rengi (bülten verisindeki `renk`); listede yoksa gri. */
export function platformRengi(ad: string, liste: readonly { ad: string; renk: string }[]): string {
  const a = ad.toLocaleLowerCase('tr-TR');
  return liste.find((p) => p.ad.toLocaleLowerCase('tr-TR') === a)?.renk ?? KIMLIK.gri;
}

const SIMGE: Record<string, string> = { TRY: '₺', USD: '$', EUR: '€', GBP: '£' };

/** Kapak ve başlık için kısa tutar: simge önde; milyon/milyar iki ondalık, bin tam sayı; hep aşağı (anlamı değiştirmez). */
export function tutarKisa(n: number, paraBirimi: string = 'TRY'): string {
  const simge = SIMGE[paraBirimi] ?? `${paraBirimi} `;
  const virgul = (x: number, basamak: number) => x.toFixed(basamak).replace('.', ',');
  if (n >= 1e9) return `${simge}${virgul(asagiKes(n / 1e9, 2), 2)} milyar`;
  if (n >= 1e6) return `${simge}${virgul(asagiKes(n / 1e6, 2), 2)} milyon`;
  if (n >= 1e3) return `${simge}${Math.floor(n / 1e3)} bin`;
  return `${simge}${Math.floor(n)}`;
}

/** 18:00 bülteninin kendi yazımı (yüzde işareti sonda, "101,37%"); o da kesilerek. */
export function yuzdeSonda(n: number): string {
  const k = yuzdeKesik(n);
  return k === '—' ? k : `${k.slice(1)}%`;
}

/** Bülten verisine yazılan hedefe oran: iki ondalığa kesilir; yuvarlama %99,996'yı %100 yapmasın. */
export function hedefeOran(toplanan: number, hedef: number): number {
  return asagiKes((toplanan / hedef) * 100, 2);
}
