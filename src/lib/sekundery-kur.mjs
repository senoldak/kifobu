// İTO enflasyonu ve dolar kuru hesapları (saf). Veriler scripts/sekundery/evds.mjs'nin yazdığı dosyalardan gelir.

/**
 * Kampanya başlangıcından son yayımlanan aya kadar bileşik İTO çarpanı.
 * Sayım kampanya ayından SONRAKİ aydan başlar (fiyat kampanya ayının fiyatıdır): endeks(son) / endeks(kampanya ayı).
 * @param {string} baslangic YYYY-MM-DD @param {{yil:number, ay:number, aylik:number}[]} satirlar
 * @returns {{ carpan: number, sonAy: {yil:number, ay:number} } | null}
 */
export function itoCarpani(baslangic, satirlar) {
  if (!baslangic || !satirlar?.length) return null;
  const bas = Number(baslangic.slice(0, 4)) * 12 + Number(baslangic.slice(5, 7));
  const ilk = satirlar[0].yil * 12 + satirlar[0].ay;
  if (bas + 1 < ilk) return null; // seri kampanyadan sonra başlıyorsa hesaplanmaz
  let carpan = 1;
  for (const s of satirlar) if (s.yil * 12 + s.ay > bas) carpan *= 1 + s.aylik / 100;
  const son = satirlar.at(-1);
  return { carpan, sonAy: { yil: son.yil, ay: son.ay } };
}

/** Verilen gündeki kur; o gün yoksa (tatil, hafta sonu) en çok 10 gün geriye bakar. */
export function kurBul(tarih, kurlar) {
  if (!tarih || !kurlar) return null;
  let t = Date.parse(`${tarih.slice(0, 10)}T00:00:00Z`);
  for (let i = 0; i <= 10; i++, t -= 864e5) {
    const k = kurlar[new Date(t).toISOString().slice(0, 10)];
    if (k) return k;
  }
  return null;
}

/** kurBul gibi, ama kurun hangi güne ait olduğunu da verir (tatilde önceki iş günü). */
export function kurBulTarihli(tarih, kurlar) {
  if (!tarih || !kurlar) return null;
  let t = Date.parse(`${tarih.slice(0, 10)}T00:00:00Z`);
  for (let i = 0; i <= 10; i++, t -= 864e5) {
    const gun = new Date(t).toISOString().slice(0, 10);
    if (kurlar[gun]) return { kur: kurlar[gun], tarih: gun };
  }
  return null;
}

export const dolara = (tl, kur) => (Number.isFinite(tl) && kur > 0 ? tl / kur : null);

/** Dağıtım fiyatını kurdaki değişimle günceller (Excel'deki DDG: dövize göre değişim). Sonuç TL. */
export const kurlaGuncelle = (dagitim, kurBas, kurBugun) => (Number.isFinite(dagitim) && kurBas > 0 && kurBugun > 0 ? Math.round(((dagitim * kurBugun) / kurBas) * 100) / 100 : null);

const AYLAR = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
export const ayAdi = (a) => (a ? `${AYLAR[a.ay - 1]} ${a.yil}` : '');

/** Gram altın miktarını yazar: gram ("0,0049 gr"), 1 kg ve üstü kilogram ("52,07 kg"). mg kullanılmaz (sahibi: anlaşılmayabilir). */
export function altinYaz(gr) {
  if (gr == null || !Number.isFinite(gr)) return '—';
  if (Math.abs(gr) >= 1000) return `${(gr / 1000).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kg`;
  // 10 gr altı üç anlamlı basamak: küçük pay fiyatları birbirinden ayrılsın (0,000693 gr / 0,000521 gr)
  if (Math.abs(gr) < 10) return `${gr.toLocaleString('tr-TR', { minimumSignificantDigits: 3, maximumSignificantDigits: 3 })} gr`;
  return `${gr.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} gr`;
}

/** Para birimiyle yazım: tl ₺, usd $, eur €, xau gram altın (gr/kg). */
export function paraYaz(n, p, ondalik) {
  if (n == null || !Number.isFinite(n)) return '—';
  if (p === 'xau') return altinYaz(n);
  const o = ondalik ?? (p === 'tl' ? 2 : 3);
  return `${{ tl: '₺', usd: '$', eur: '€' }[p]}${n.toLocaleString('tr-TR', { minimumFractionDigits: o, maximumFractionDigits: o })}`;
}
