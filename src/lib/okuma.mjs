// Haber sayfasındaki okuma araçlarının saf kuralları (src/scripts/okuma-araclari.ts). DOM ve localStorage yok.
// tidsrøst src/lib/lesing.mjs uyarlaması.

export const OLCEKLER = ['0', '1', '2', '3']; // A−, A, A+, A++

/** Kayıtlı yazı boyu → '0' | '1' | '2' | '3'; geçersiz her şey '1'. */
export function olcekDegeri(kayitli) {
  const s = typeof kayitli === 'number' ? String(kayitli) : kayitli;
  return OLCEKLER.includes(s) ? s : '1';
}

/** Okurun metinde ne kadar ilerlediği (0–1). Pencerenin %60 aşağısındaki çizgi "buraya kadar okundu" sayılır. */
export function ilerleme(metinUstu, metinBoyu, pencereBoyu) {
  if (!(metinBoyu > 0)) return 0;
  const s = (pencereBoyu * 0.6 - metinUstu) / metinBoyu;
  return Math.min(1, Math.max(0, s));
}

/** Türkçe sesin sırası; yoksa -1. "tr-TR" ve "tr_TR" ikisi de tanınır. */
export function turkceSes(sesler) {
  const liste = Array.isArray(sesler) ? sesler : [];
  return liste.findIndex((v) => String(v?.lang ?? '').toLowerCase().replace('_', '-').split('-')[0] === 'tr');
}
