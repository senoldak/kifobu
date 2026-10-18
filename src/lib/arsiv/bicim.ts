import { yuzdeKesik } from '../kimlik.ts';
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
  return yuzdeKesik(n);
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

// İyelik eki okunan son sayıya uyar: "%51,71" yetmiş bir → 'i'; "%50,60" altmış → 'ı'; "%100,00" yüz → 'ü'.
const BIRLER_EKI = ['', "'i", "'si", "'ü", "'ü", "'i", "'sı", "'si", "'i", "'u"];
const ONLAR_EKI = ['', "'u", "'si", "'u", "'ı", "'si", "'ı", "'i", "'i", "'ı"];

function okunusEki(rakamlar: string): string {
  const r = rakamlar.replace(/^0+/, '');
  if (!r) return "'ı"; // sıfır
  const son = Number(r[r.length - 1]);
  if (son) return BIRLER_EKI[son];
  const onlar = Number(r[r.length - 2] ?? 0);
  if (onlar) return ONLAR_EKI[onlar];
  return r.length >= 4 ? "'i" : "'ü"; // bin / yüz
}

/** "hedefin %50,64'ü" biçimi için yüzde + iyelik eki. */
export function yuzdeEkli(n: number | null): string {
  const metin = yuzdeBicim(n);
  if (metin === '—') return metin;
  const [tam, ondalik] = metin.slice(1).split(',');
  return metin + okunusEki(ondalik !== '00' ? ondalik : tam);
}
