// Rehber yazılarının listesi (dizin, menü ve yazıların ortak bilgisi). Metinler src/pages/rehber/*.astro içinde.
// gozdenGecirme: içeriğin son kontrol edildiği gün; metin değişince güncellenir.
export const REHBERLER = [
  {
    slug: 'kitle-fonlamasi-nedir',
    baslik: 'Kitle fonlaması nedir?',
    aciklama: 'Kitle fonlaması nedir, türleri nelerdir, Türkiye’de nasıl düzenlenir? Paya ve borçlanmaya dayalı kitle fonlamasına sade bir giriş.',
    yayin: '2026-10-15',
    gozdenGecirme: '2026-10-18',
  },
  {
    slug: 'kitle-fonlamasina-nasil-yatirim-yapilir',
    baslik: 'Kitle fonlamasına nasıl yatırım yapılır?',
    aciklama: 'Paya dayalı kitle fonlaması kampanyasına yatırım yapmadan önce bilinmesi gerekenler: platform seçimi, kampanya belgeleri, süreç ve riskler.',
    yayin: '2026-10-15',
    gozdenGecirme: '2026-10-18',
  },
  {
    slug: 'spk-kitle-fonlamasi-mevzuati',
    baslik: 'SPK kitle fonlaması mevzuatı kılavuzu',
    aciklama: 'Kitle Fonlaması Tebliği (III-35/A.2) neyi düzenler? Platformlar, girişimler ve yatırımcılar için ana başlıklar.',
    yayin: '2026-10-15',
    gozdenGecirme: '2026-10-18',
  },
] as const;
