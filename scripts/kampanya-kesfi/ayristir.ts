/** Platform sayfalarından okunan metni sayıya, orana ve tarihe çeviren saf yardımcılar.
 *  Genel kural: okunamayan değer null olur, asla 0 olmaz. */

const VARLIKLAR: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
};

function varligiCoz(s: string): string {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (tam, ad: string) => {
    if (ad[0] === '#') {
      const kod = ad[1].toLowerCase() === 'x' ? parseInt(ad.slice(2), 16) : parseInt(ad.slice(1), 10);
      return Number.isFinite(kod) && kod > 0 && kod <= 0x10ffff ? String.fromCodePoint(kod) : tam;
    }
    return VARLIKLAR[ad.toLowerCase()] ?? tam;
  });
}

/** HTML -> düz metin: script/style siler, etiketleri boşluğa çevirir, varlıkları çözer, boşlukları teke indirir. */
export function metne(html: string): string {
  return varligiCoz(
    html
      .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, ' ')
      .replace(/<[^>]*>/g, ' '),
  )
    .replace(/\s+/g, ' ')
    .trim();
}

/** "₺5.000.000" / "1.000.032 ₺" / "121.782" -> sayı; rakam yoksa null. */
export function para(s: string | null | undefined): number | null {
  if (!s) return null;
  const temiz = s.replace(/[^\d]/g, '');
  return temiz ? parseInt(temiz, 10) : null;
}

/** Binlik ayraçlı tam sayı; rakam yoksa null. */
export function tamSayi(s: string | null | undefined): number | null {
  return para(s);
}

/** "%10,00" -> 0.1; okunamazsa null. */
export function oran(s: string | null | undefined): number | null {
  if (!s) return null;
  const m = s.match(/(\d+(?:[.,]\d+)?)/);
  if (!m) return null;
  const sayi = parseFloat(m[1].replace(',', '.'));
  return Number.isFinite(sayi) ? Math.round(sayi * 1e4) / 1e6 : null;
}

const AYLAR: Record<string, number> = {
  ocak: 1, şubat: 2, mart: 3, nisan: 4, mayıs: 5, haziran: 6,
  temmuz: 7, ağustos: 8, eylül: 9, ekim: 10, kasım: 11, aralık: 12,
};

function isoTarih(y: number, a: number, g: number): string | null {
  const d = new Date(Date.UTC(y, a - 1, g));
  if (d.getUTCFullYear() !== y || d.getUTCMonth() !== a - 1 || d.getUTCDate() !== g) return null;
  return `${String(y).padStart(4, '0')}-${String(a).padStart(2, '0')}-${String(g).padStart(2, '0')}`;
}

/** "16.11.2026" veya "19 Ağustos 2026" -> "2026-11-16" / "2026-08-19"; okunamazsa null. */
export function tarih(s: string | null | undefined): string | null {
  if (!s) return null;
  const sayisal = s.match(/(\d{1,2})\.(\d{1,2})\.(\d{4})/);
  if (sayisal) return isoTarih(Number(sayisal[3]), Number(sayisal[2]), Number(sayisal[1]));
  const yazili = s.match(/(\d{1,2})\s+(\p{L}+)\s+(\d{4})/u);
  if (yazili) {
    const ay = AYLAR[yazili[2].toLocaleLowerCase('tr-TR')];
    if (ay) return isoTarih(Number(yazili[3]), ay, Number(yazili[1]));
  }
  return null;
}
