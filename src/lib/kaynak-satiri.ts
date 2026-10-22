// Medya kaynaklı habere adsız kaynak satırı (2026-10-22 kararı). Hiçbir kuruluş adı verilmez.
// Şifreli kaynak izi (`kaynakIzi`) dolu bot haberinde gösterilir; günlük bülten, yazı işleri zinciri ve sahibin yazılarında gösterilmez.
import { SAHIP_YAZARI, ZINCIR_URETIMI } from './yapay-zeka-notu.ts';

export const KAYNAK_SATIRI = 'Kaynak: birden fazla bağımsız yayın organının haberleri (adları verilmez).';

interface Veri {
  kaynakIzi?: string;
  category?: string;
  uretim?: string;
  author?: string;
}

export function kaynakSatiri(d: Veri): string | undefined {
  if (!d.kaynakIzi?.trim()) return undefined;
  if (d.category === 'gunluk-bulten') return undefined;
  if (d.uretim === ZINCIR_URETIMI || d.author === SAHIP_YAZARI) return undefined;
  return KAYNAK_SATIRI;
}
