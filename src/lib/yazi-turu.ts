// Yazı türü: düz haber, açıklayıcı yazı ya da referans yazısı. Şema
// (src/content.config.ts) bu diziyi kullanır; değerler tek yerde durur.
// Görünümde henüz karşılığı yok.
export const YAZI_TURLERI = ['haber', 'aciklayici', 'referans'] as const;
export type YaziTuru = (typeof YAZI_TURLERI)[number];
export const VARSAYILAN_YAZI_TURU: YaziTuru = 'haber';

export function aciklayiciMi(veri: { yaziTuru?: YaziTuru } | null | undefined): boolean {
  const tur = veri?.yaziTuru;
  return tur === 'aciklayici' || tur === 'referans';
}
