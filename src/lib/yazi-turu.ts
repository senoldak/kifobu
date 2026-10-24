// Yazı türü: düz haber, açıklayıcı yazı, referans yazısı ya da analiz (yazı işleri zinciri). Şema
// (src/content.config.ts) bu diziyi kullanır; değerler tek yerde durur.
// Görünümde analizin karşılığı var (etiket, /analiz/ bölümü, AnalysisNewsArticle); öteki türlerin henüz yok.
export const YAZI_TURLERI = ['haber', 'aciklayici', 'referans', 'analiz'] as const;
export type YaziTuru = (typeof YAZI_TURLERI)[number];
export const VARSAYILAN_YAZI_TURU: YaziTuru = 'haber';

export function aciklayiciMi(veri: { yaziTuru?: YaziTuru } | null | undefined): boolean {
  const tur = veri?.yaziTuru;
  return tur === 'aciklayici' || tur === 'referans';
}

// Analiz yazısı: aciklayiciMi'den ayrıdır (analiz açıklayıcı sayılmaz).
export function analizMi(veri: { yaziTuru?: YaziTuru } | null | undefined): boolean {
  return veri?.yaziTuru === 'analiz';
}

// JSON-LD articleSection: analizde kategori adı ve "Analiz" birlikte; diğer yazılarda yalnız kategori adı.
export function bolumAdlari(kategoriAdi: string, veri: { yaziTuru?: YaziTuru } | null | undefined): string | string[] {
  return analizMi(veri) ? [kategoriAdi, 'Analiz'] : kategoriAdi;
}
