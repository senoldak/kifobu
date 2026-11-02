// Medya kaynaklı habere adsız kaynak satırı (2026-10-22 kararı). 2 Kasım 2026'dan beri kaynaklar adıyla gösterilir
// (src/lib/kaynaklar.mjs); bu satır yalnız adlar çözülemediğinde (anahtarsız yerel derleme) yedek olarak kalır.
// Şifreli kaynak izi (`kaynakIzi`) dolu bot haberinde gösterilir; günlük bülten, yazı işleri zinciri ve sahibin yazılarında gösterilmez.
import { SAHIP_YAZARI, ZINCIR_URETIMI } from './yapay-zeka-notu.ts';

// Adı gösterilemeyen kaynak (şifreli listede onayı olmayan eski yayın ya da anahtarsız derleme) için yalın yedek satır.
export const KAYNAK_SATIRI = 'Kaynak: başka yayın organlarının haberleri.';

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
