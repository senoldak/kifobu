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

/** Yüzde, iki ondalık ve kesilerek (yuvarlanmaz): %99,996 asla %100,00 olmaz. */
export function yuzdeKesik(n: number | null): string {
  if (n === null || !Number.isFinite(n)) return '—';
  // 1e-9: 0,29 × 100 gibi kayan nokta artıklarının bir alt değere düşmesini önler.
  const kesik = Math.floor(n * 100 + 1e-9) / 100;
  return `%${kesik.toFixed(2).replace('.', ',')}`;
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

const ALTIN_ACI = Math.PI * (3 - Math.sqrt(5));

/** Tohum işareti: 233 tohum (küçükte 89), her 21. tohum sarı ve 1,55 kat iri. viewBox 200×200. */
export function tohumIsaretiSvg({ boyut, zemin = 'acik', kucuk = false }: { boyut: number; zemin?: 'acik' | 'koyu'; kucuk?: boolean }): string {
  const n = kucuk ? 89 : 233;
  const nokta = zemin === 'koyu' ? KIMLIK.kagit : KIMLIK.murekkep;
  const c = 92 / Math.sqrt(n);
  let s = '';
  for (let i = 1; i <= n; i++) {
    const r = c * Math.sqrt(i);
    const a = i * ALTIN_ACI;
    const k = Math.sqrt(i / n);
    const kol = i % 21 === 0;
    const rad = c * 0.36 * (0.35 + 0.75 * k) * (kol ? 1.55 : 1);
    s += `<circle cx="${(100 + r * Math.cos(a)).toFixed(2)}" cy="${(100 + r * Math.sin(a)).toFixed(2)}" r="${rad.toFixed(2)}" fill="${kol ? KIMLIK.sari : nokta}"/>`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${boyut}" height="${boyut}" viewBox="0 0 200 200" aria-hidden="true">${s}</svg>`;
}
