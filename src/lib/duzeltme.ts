// Yazı düzeltme notu: alan doluysa makalede gösterilecek etiket, metin ve
// düzeltme ilkesi bağlantısı. Şemadaki kuralın aynısı: 10 karakterden kısa not yok sayılır.
export const DUZELTME_EN_AZ = 10;

export interface DuzeltmeNotu {
  etiket: string;
  metin: string;
  baglanti: string;
}

const DILLER = {
  tr: { etiket: 'Düzeltme:', baglanti: '/duzeltme-politikasi/' },
} as const;

export function duzeltmeNotu(veri: { duzeltme?: string } | null | undefined, dil: keyof typeof DILLER = 'tr'): DuzeltmeNotu | null {
  const metin = typeof veri?.duzeltme === 'string' ? veri.duzeltme : '';
  if (metin.length < DUZELTME_EN_AZ) return null;
  const { etiket, baglanti } = DILLER[dil] ?? DILLER.tr;
  return { etiket, metin, baglanti };
}
