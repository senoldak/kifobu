import type { ArsivKaydi } from './tipler.ts';

const ornekMi = import.meta.env.DEV && import.meta.env.PUBLIC_ARSIV_ORNEK === '1';

function topla(modul: Record<string, unknown>): ArsivKaydi[] {
  return (Object.values(modul) as ArsivKaydi[]).sort((a, b) => (a.tarih < b.tarih ? -1 : a.tarih > b.tarih ? 1 : 0));
}

// Eksik dizin için glob boş nesne döner; hata vermez.
const gercek = import.meta.glob('/src/data/arsiv/*.json', { eager: true, import: 'default' });
const ornek = import.meta.glob('/src/lib/arsiv/ornek/*.json', { eager: true, import: 'default' });

export function arsivKayitlari(): ArsivKaydi[] {
  return topla(ornekMi ? ornek : gercek);
}
