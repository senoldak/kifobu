// "Bu haber nasıl hazırlandı" kartı ve yayın odası: ajan kaydı, haber türüne göre adımlar ve kapalı kartın olgu satırı.
// tidsrøst src/lib/redaksjon.mjs uyarlaması. Ajan adları otomatik adımların adıdır, insan değildir; görünüşleri yayın
// odası sahnesindeki (src/scripts/yayin-odasi.mjs) figürlerle aynıdır. Adımlar botun kodundaki gerçek sıradır
// (scripts/bot/uyarlayici.mjs): bulma; mükerrer ve haber değeri; yazım; kesin denetim ve kaynakla karşılaştırma;
// dil ve yayın kuralları; kapak; yayın.

export const SAHIP = 'Şenol Dak';
// Botun haber değeri eşiği (scripts/bot/yazar.mjs MIN_DEGER ile aynı; değişirse ikisi birlikte değişir).
export const HABER_DEGERI_ESIGI = 55;

export const AJANLAR = {
  nil: { ad: 'Nil', rol: 'İzci', yz: true, u: { sac: 'uzun', sacRenk: '#3b2a1f', ten: '#f2cfb0', ust: '#141a17', ustGolge: '#0c100e' } },
  baran: { ad: 'Baran', rol: 'Bekçi', yz: true, u: { sac: 'kisa', sakal: true, sacRenk: '#16191c', ten: '#d2a079', ust: '#5d645f', ustGolge: '#474d49' } },
  ece: { ad: 'Ece', rol: 'Muhabir', yz: true, u: { sac: 'topuz', sacRenk: '#6b4226', ten: '#f5d4ba', ust: '#e8b40c', ustGolge: '#c99b08', gozluk: true } },
  derya: { ad: 'Derya', rol: 'Denetçi', yz: true, u: { sac: 'kivircik', sacRenk: '#1f1611', ten: '#a8714e', ust: '#3b413d', ustGolge: '#2b302d' } },
  tuna: { ad: 'Tuna', rol: 'Redaktör', yz: true, u: { sac: 'kakul', sacRenk: '#b5482a', ten: '#f2cfb0', ust: '#dcd9cf', ustGolge: '#c4c0b4' } },
  kaan: { ad: 'Kaan', rol: 'Çizer', yz: true, u: { sac: 'kisa', sacRenk: '#e2c26a', ten: '#f5d4ba', ust: '#e8b40c', ustGolge: '#c99b08', alt: '#141a17' } },
  ada: { ad: 'Ada', rol: 'Yayıncı', yz: true, u: { sac: 'uzun', sacRenk: '#b5482a', ten: '#f0cdb2', ust: '#141a17', ceket: '#3b413d' } },
  elif: { ad: 'Elif', rol: 'Redaktör', yz: true, u: { sac: 'uzun', sacRenk: '#e2c26a', ten: '#f5d4ba', ust: '#5d645f', gozluk: true } },
  senol: { ad: SAHIP, rol: 'Gazeteci', yz: false, u: { sac: 'kisa', sacRenk: '#2b211b', ten: '#e6bc96', ust: '#fdfdfb', ceket: '#16191c' } },
};

const KUCUK = { 1: 'bir', 2: 'iki', 3: 'üç', 4: 'dört', 5: 'beş' };
const SAYI_ADI = { 2: 'İki', 3: 'Üç', 4: 'Dört', 5: 'Beş', 6: 'Altı', 7: 'Yedi', 8: 'Sekiz', 9: 'Dokuz', 10: 'On' };
export const sayiAdi = (n) => SAYI_ADI[n] ?? String(n);

const adim = (id, metin) => ({ id, metin });
const degerVar = (h) => Number.isFinite(h?.haberDegeri);
// Gösterilen kaynak sayısı (src/lib/kaynaklar.mjs); yoksa 0 ve metin sayı vermez.
const kaynakSayisi = (h) => (Number.isInteger(h?.kaynakSayisi) && h.kaynakSayisi > 0 ? h.kaynakSayisi : 0);
const bulma = (h, ne) => (kaynakSayisi(h) ? `${ne} ${KUCUK[kaynakSayisi(h)] ?? kaynakSayisi(h)} yayında buldu.` : `${ne} izlediğimiz yayınlarda buldu.`);

/** Sahibin yazısı: Şenol Dak imzalı ya da yazı türü haber dışı (analiz, açıklayıcı, referans); src/lib/yapay-zeka-notu.ts ile aynı kural. */
export function sahipYazisi(h) {
  return h?.author === SAHIP || (h?.yaziTuru !== undefined && h.yaziTuru !== 'haber');
}

/** Botun derlemesi: kısa haberleri tek yazıda toplayan dilim derlemesi (ön bilgide derleme: true; eskilerde başlık "· <gün>, <dilim>"). */
export function derlemeMi(h) {
  return h?.derleme === true || (h?.uretim === 'yapay-zeka' && / · \d{1,2} [A-ZÇĞİÖŞÜ][a-zçğıöşü]+, /.test(String(h?.title ?? '')));
}

/** Kartı alan bot haberi: günlük bültenler (sabah, öğle, gece özetleri) eski tek satırlık notu korur. */
const botHaberi = (h) => h?.uretim === 'yapay-zeka' && h?.category !== 'gunluk-bulten';

/** Adımlar; kart çıkmayacak yazıda null (zincirin sahibe ait olmayan yazıları, günlük bültenler, elle girilenler). */
export function adimlar(h) {
  if (sahipYazisi(h)) {
    return [
      adim('senol', 'Yazıyı yazdı; konuyu, veriyi ve bakış açısını seçti, hesapları yaptı.'),
      adim('elif', 'Yalnız imla ve dili düzeltti; içeriğe ve rakamlara dokunmadı.'),
    ];
  }
  if (!botHaberi(h)) return null;
  const deger = degerVar(h)
    ? `Daha önce yazılıp yazılmadığına baktı; haber değerini 100 üzerinden ${h.haberDegeri} buldu. ${HABER_DEGERI_ESIGI}’in altındaki haberler yazılmaz.`
    : `Daha önce yazılıp yazılmadığına baktı ve haber değerini puanladı. ${HABER_DEGERI_ESIGI}’in altındaki haberler yazılmaz.`;
  if (derlemeMi(h)) {
    return [
      adim('nil', bulma(h, 'Haberleri')),
      adim('baran', deger),
      adim('ece', 'Tek başına kısa kalan haberleri bir derlemede topladı.'),
      adim('tuna', 'Metni yayın kurallarımızdan geçirdi.'),
      adim('kaan', 'Kapak görselini çizdi.'),
      adim('ada', 'Derlemeyi yayımladı.'),
    ];
  }
  return [
    adim('nil', bulma(h, 'Haberi')),
    adim('baran', deger),
    adim('ece', 'Metni kaynaklara dayanarak yazdı; girişim, tutar, tur ve yatırımcıları künyeye çıkardı.'),
    adim('derya', 'Rakamları, adları ve alıntıları kaynaklarda aradı. Haberi kaynakla madde madde karşılaştırdı ve kopya cümle olup olmadığına baktı.'),
    adim('tuna', 'Yalnız dili düzeltti (TDK yazımı), sonra metni yayın kurallarımızdan geçirdi.'),
    adim('kaan', 'Kapak görselini çizdi.'),
    adim('ada', 'Haberi yayımladı.'),
  ];
}

/** Kapalı kartın olgu satırı; verisi olmayan parça yazılmaz. */
export function olguSatiri(h) {
  if (sahipYazisi(h)) return [{ on: 'Yazan ', kalin: SAHIP }, { on: 'Dil düzeltmesi yapay zekâyla' }];
  const ut = [];
  if (kaynakSayisi(h)) ut.push({ kalin: String(kaynakSayisi(h)), son: ' kaynak' });
  if (degerVar(h)) ut.push({ on: 'Haber değeri ', kalin: String(h.haberDegeri), son: '/100' });
  return ut;
}

/** Yayından önce bir insan okumadı mı? Bot haberlerinde evet; sahibin yazılarında hayır. */
export const insanOkumadi = (h) => !sahipYazisi(h) && botHaberi(h);
