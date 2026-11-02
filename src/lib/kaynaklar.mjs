// Haberin kaynakları adıyla ve bağlantısıyla (hukuki değerlendirme 2 Kasım 2026; koşullar mecmua
// docs/kaynak-adi-hukuki-degerlendirme-2026-11-02.md). Adlar repoya açık yazılmaz: derlemede haberin şifreli kaynak
// izinden (kaynakIzi) ve şifreli kaynak listesinden çözülür (scripts/bot/gizli.mjs; anahtar KAYNAK_ANAHTARI, yalnız
// yayın derlemesinde). Anahtar yoksa liste boştur ve sayfa eski adsız kaynak satırını gösterir.
//
// Koşullar kodda:
//  - Yalnız gerçekten kaynak olan haber: birden çok kaynaklı haberde her kaynak, adresindeki sözcüklerden biri haberin
//    başlığındaki (ya da künyedeki girişim adındaki) bir sözcükle eşleşirse gösterilir. Tek kaynaklı haberde kaynak, haberin
//    yazıldığı tek yayındır.
//  - Sakıncalı yayın ya da kaldırma isteği: şifreli listede yayına `goster: false` konur; adı da bağlantısı da çıkmaz.
//  - Görünen ad: şifreli listede `gorunen` (yoksa `ad`). Besleme listesinin tamamı hiçbir yerde gösterilmez.
// Bu modül hiçbir şey loglamaz (Actions logları herkese açık).
import path from 'node:path';
import { coz, gizliKaynaklar } from '../../scripts/bot/gizli.mjs';

const kat = (s) => String(s ?? '').toLocaleLowerCase('tr-TR').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ı/g, 'i');
// Adreslerde ve başlıkta sık geçen, konu ayırt etmeyen sözcükler.
const BOS = new Set(
  ('the and for with from that this into over after raises raised raise funding round rounds million billion series seed preseed pre startup ' +
    'startups company news venture capital fund yatirim aldi milyon milyar dolar euro avro sterlin turunda turu girisim girisimi icin olarak ' +
    'ile ve bir yeni').split(' '),
);
export const sozcukler = (s) => new Set(kat(s).split(/[^a-z0-9]+/).filter((w) => w.length >= 3 && !BOS.has(w) && !/^\d+$/.test(w)));

/** Kaynak adresi haberin konusuyla eşleşiyor mu: adres yolundaki sözcüklerden biri başlıkta ya da girişim adında geçer. */
export function konuTutar(url, { title, girisim }) {
  let yol = '';
  try {
    yol = decodeURIComponent(new URL(url).pathname);
  } catch {
    return false;
  }
  const konu = sozcukler(`${title ?? ''} ${girisim ?? ''}`);
  return [...sozcukler(yol)].some((w) => konu.has(w));
}

const guvenliAdres = (u) => {
  try {
    const x = new URL(u);
    return x.protocol === 'https:' || x.protocol === 'http:' ? x.href : null;
  } catch {
    return null;
  }
};

/**
 * Saf seçim (sınanır): izdeki { ad, url } listesi → gösterilecek { ad, url }. liste: şifreli kaynak listesi
 * ({ ad, gorunen?, goster? }). Aynı yayın iki kez yazılmaz.
 */
export function kaynakSec(iz, liste, haber) {
  const tanim = new Map((liste ?? []).map((k) => [k.ad, k]));
  const adaylar = (iz ?? []).filter((x) => x?.ad && guvenliAdres(x.url));
  const coklu = adaylar.length > 1;
  const ut = [];
  for (const x of adaylar) {
    const k = tanim.get(x.ad);
    if (!k || k.goster === false) continue;
    if (coklu && !konuTutar(x.url, haber)) continue;
    const ad = k.gorunen ?? k.ad;
    if (ut.some((y) => y.ad === ad)) continue;
    ut.push({ ad, url: guvenliAdres(x.url) });
  }
  return ut;
}

let liste;
// Derlemede bu modül başka bir klasöre paketlenir: şifreli listenin yolu proje kökünden verilir.
const kaynakListesi = () => (liste ??= gizliKaynaklar({ dosya: path.join(process.cwd(), 'scripts/bot/gizli-kaynaklar.sifreli'), uyar: () => {} }).kaynaklar);

/** Haberin gösterilecek kaynakları; anahtar yoksa, iz yoksa ya da çözülemezse boş. */
export function haberKaynaklari(haber) {
  if (!haber?.kaynakIzi) return [];
  let iz;
  try {
    iz = coz(haber.kaynakIzi);
  } catch {
    return [];
  }
  try {
    return kaynakSec(iz, kaynakListesi(), haber);
  } catch {
    return [];
  }
}
