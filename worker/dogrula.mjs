// POST /api/fayda ("Bu haber işine yaradı mı?") için saf doğrulama (dogrula.test.mjs sınar).
export const EN_COK_BAYT = 1024;
const SLUG = /^[a-z0-9-]{1,160}$/;

/** { tamam: true, slug, yanit } ya da { tamam: false }. */
export function yanitDogrula(metin, icerikTuru) {
  if (!/^application\/json(\s*;|$)/i.test(String(icerikTuru || ''))) return { tamam: false };
  if (typeof metin !== 'string' || new TextEncoder().encode(metin).length > EN_COK_BAYT) return { tamam: false };
  let d;
  try {
    d = JSON.parse(metin);
  } catch {
    return { tamam: false };
  }
  if (!d || typeof d !== 'object' || Array.isArray(d)) return { tamam: false };
  if (typeof d.slug !== 'string' || !SLUG.test(d.slug)) return { tamam: false };
  if (d.yanit !== 'evet' && d.yanit !== 'hayir') return { tamam: false };
  return { tamam: true, slug: d.slug, yanit: d.yanit };
}

/** İstanbul takvim günü, YYYY-AA-GG. */
export function istanbulGunu(tarih = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Istanbul', year: 'numeric', month: '2-digit', day: '2-digit' }).format(tarih);
}
