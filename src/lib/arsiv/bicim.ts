// Türkçe sayı/para/yüzde biçimleri. Saf; Node'a özgü API yok.

function grupla(tam: string): string {
  return tam.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

/** En çok `basamak` ondalık, sondaki sıfırlar atılır, ondalık ayracı virgül. */
function sade(n: number, basamak: number): string {
  const [tam, ondalik = ''] = n.toFixed(basamak).split('.');
  const kes = ondalik.replace(/0+$/, '');
  return grupla(tam) + (kes ? `,${kes}` : '');
}

export function paraKisa(n: number | null): string {
  if (n === null || !Number.isFinite(n)) return '—';
  const isaret = n < 0 ? '-' : '';
  const m = Math.abs(n);
  // Birim yuvarlamadan sonra seçilir: 999_960 -> "₺1 M", 999,6 -> "₺1 B".
  const bin = Math.round((m / 1_000) * 10) / 10;
  if (m >= 1_000_000 || bin >= 1_000) return `${isaret}₺${sade(m / 1_000_000, 2)} M`;
  if (m >= 1_000 || Math.round(m) >= 1_000) return `${isaret}₺${sade(m / 1_000, 1)} B`;
  return `${isaret}₺${Math.round(m)}`;
}

export function paraTam(n: number | null): string {
  if (n === null || !Number.isFinite(n)) return '—';
  const isaret = n < 0 ? '-' : '';
  return `${isaret}₺${grupla(String(Math.round(Math.abs(n))))}`;
}

export function yuzdeBicim(n: number | null): string {
  if (n === null || !Number.isFinite(n)) return '—';
  return `%${n.toFixed(1).replace('.', ',')}`;
}

export function degisimBicim(n: number | null): string {
  if (n === null || !Number.isFinite(n)) return '—';
  return `${n < 0 ? '▼' : '▲'} ${yuzdeBicim(Math.abs(n))}`;
}

/** YYYY-MM-DD -> DD.MM.YYYY */
export function tarihTr(t: string): string {
  return t ? `${t.slice(8, 10)}.${t.slice(5, 7)}.${t.slice(0, 4)}` : '';
}

/** Dosya adı parçası: Türkçe küçük harf, ASCII'ye indirgenir, [a-z0-9] dışı '-'. */
export function dosyaParcasi(s: string): string {
  const harf: Record<string, string> = { ı: 'i', ş: 's', ğ: 'g', ü: 'u', ö: 'o', ç: 'c' };
  return s
    .toLocaleLowerCase('tr-TR')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[ışğüöç]/g, (h) => harf[h])
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

// Yüzde hep tek ondalıkla okunur ("yüzde elli virgül altı"); ek son rakamın okunuşuna uyar.
const YUZDE_EKI = ["'ı", "'i", "'si", "'ü", "'ü", "'i", "'sı", "'si", "'i", "'u"];

/** "hedefin %50,6'sı" biçimi için yüzde + iyelik eki. */
export function yuzdeEkli(n: number | null): string {
  const metin = yuzdeBicim(n);
  if (metin === '—') return metin;
  return metin + YUZDE_EKI[Number(metin[metin.length - 1])];
}
