// /sekundery/ sayfalarının veri yükleyicisi (yalnız derlemede, Vite içinde çalışır).
// girisimler.json: dağıtım fiyatı ve kampanya başlangıcı (sahibin Excel'inden). İTO enflasyonlu fiyat artık buradan değil,
// resmî seriden hesaplanır (ito-aylik.json, TCMB EVDS); başlangıç tarihi yoksa Excel'deki değer kalır (itoKaynak: 'excel').
// usd-try.json, eur-try.json: TCMB satış kurları; döviz değerleri dağıtımda kampanya günü, bugün son veri günü kuruyla.
// gecmis-excel.json: Ocak 2024 – Temmuz 2026 günlük en düşük ve medyan satış (sahibin Excel'inden, bir kez aktarıldı).
// gunluk/YYYY-MM-DD.json: o günün turlarında yayında görülen açık ilanlar (toplayıcı yazar).
import girisimler from '../data/sekundery/girisimler.json';
import gecmisExcel from '../data/sekundery/gecmis-excel.json';
import itoAylik from '../data/sekundery/ito-aylik.json';
import usdTry from '../data/sekundery/usd-try.json';
import eurTry from '../data/sekundery/eur-try.json';
import kampanyalar from '../data/sekundery/kampanyalar.json';
import xauTry from '../data/sekundery/xau-try.json';
import payGruplari from '../data/sekundery/pay-gruplari.json';
import virman from '../data/sekundery/virman.json';
import { anahtar, tekillestir, gunOzeti, degisim, seriBirlestir, kapanisDegeri, gecenDonem, donemOrtalamasi, defterOzeti, donemIciDegisim } from './sekundery.mjs';
import { itoCarpani, kurBul, kurBulTarihli, dolara, kurlaGuncelle } from './sekundery-kur.mjs';

const dosyalar = import.meta.glob('../data/sekundery/gunluk/*.json', { eager: true, import: 'default' });

export const gunler = Object.values(dosyalar)
  .map((g) => ({ ...g, ozet: gunOzeti(g.ilanlar ?? [], g.tarih) }))
  .sort((a, b) => a.tarih.localeCompare(b.tarih));

export const sonGun = gunler.at(-1) ?? null;

// Turların getirdiği girişim adları (kaynaktaki kısa tanım); Excel'de adı olmayanlar için.
const sonAdlar = Object.assign({}, ...gunler.map((g) => g.adlar ?? {}));

export const itoSonAy = itoAylik.satirlar.at(-1) ? { yil: itoAylik.satirlar.at(-1).yil, ay: itoAylik.satirlar.at(-1).ay } : null;
export const kurlar = usdTry.kurlar;
export const avroKurlar = eurTry.kurlar;
export const altinKurlar = xauTry.kurlar; // TL / gram altın

/** Girişim adı: Excel'den, yoksa ilan açıklamasından. */
function bilgi(k) {
  const [kod, grup] = k.split('-');
  const b = girisimler[k] ?? { kod, grup, dagitim: null, itoEnf: null, ad: null, baslangic: null };
  return b.ad ? b : { ...b, ad: sonAdlar[kod] ?? null };
}

export function tumAnahtarlar() {
  const s = new Set([...Object.keys(girisimler), ...Object.keys(gecmisExcel), ...gunler.flatMap((g) => Object.keys(g.ozet))]);
  return [...s].sort();
}

/** Ana tablonun bir satırı. Döviz değerleri `usd` ve `eur` altında (aynı yüzdeler o döviz bazında). */
export function satir(k, gun = sonGun) {
  const b = bilgi(k);
  const o = gun?.ozet[k] ?? { satis: null, alis: null };
  const s = o.satis, a = o.alis;
  const c = itoCarpani(b.baslangic, itoAylik.satirlar);
  const itoEnf = c && b.dagitim ? Math.round(b.dagitim * c.carpan * 100) / 100 : b.itoEnf;
  // Döviz görünümü: aynı yüzdeler, fiyatlar o dövize çevrilmiş olarak (İTO'ya göre değişim değişmez, iki fiyat da aynı günün kuruyla).
  const doviz = (kk) => {
    const bas = kurBulTarihli(b.baslangic, kk), bug = kurBulTarihli(gun?.tarih, kk);
    const kurBas = bas?.kur ?? null, kurBugun = bug?.kur ?? null;
    const u = {
      kurBaslangic: kurBas,
      kurBaslangicTarih: bas?.tarih ?? null,
      kurBugun,
      kurBugunTarih: bug?.tarih ?? null,
      dagitim: dolara(b.dagitim, kurBas),
      guncel: kurlaGuncelle(b.dagitim, kurBas, kurBugun),
      itoEnf: dolara(itoEnf, kurBugun),
      satis: s ? dolara(s.enIyi, kurBugun) : null,
      satisMedyan: s ? dolara(s.medyan, kurBugun) : null,
      alis: a ? dolara(a.enIyi, kurBugun) : null,
      alisMedyan: a ? dolara(a.medyan, kurBugun) : null,
    };
    return { ...u, satisDagitimaGore: degisim(u.satis, u.dagitim), satisEnfaGore: degisim(u.satis, u.itoEnf), alisDagitimaGore: degisim(u.alis, u.dagitim), alisEnfaGore: degisim(u.alis, u.itoEnf) };
  };
  return {
    anahtar: k,
    kod: b.kod,
    grup: b.grup,
    ad: b.ad,
    baslangic: b.baslangic,
    fonAktarim: b.fonAktarim ?? null,
    kampanya: kampanyalar.sirketler[b.kod]?.kampanyalar.find((c) => c.gruplar?.includes(b.grup)) ?? null,
    unvan: kampanyalar.sirketler[b.kod]?.unvan ?? null,
    dagitim: b.dagitim,
    itoEnf,
    itoKaynak: c ? 'evds' : b.itoEnf != null ? 'excel' : null,
    satis: s && { ...s, dagitimaGore: degisim(s.enIyi, b.dagitim), enfaGore: degisim(s.enIyi, itoEnf) },
    alis: a && { ...a, dagitimaGore: degisim(a.enIyi, b.dagitim), enfaGore: degisim(a.enIyi, itoEnf) },
    usd: doviz(kurlar),
    eur: doviz(avroKurlar),
    xau: doviz(altinKurlar), // değerler gram altın
    // ISIN ve pay sahibi sayısı (toplayıcı yazar; yoksa null)
    isin: payGruplari.gruplar?.[k]?.isin ?? null,
    sahip: ((h) => { const t = Object.keys(h).sort(); return t.length ? { son: { tarih: t.at(-1), n: h[t.at(-1)] }, ilk: { tarih: t[0], n: h[t[0]] }, seri: t.map((x) => ({ tarih: x, n: h[x] })) } : null; })(payGruplari.gruplar?.[k]?.sahip ?? {}),
  };
}

export function seri(k) {
  return seriBirlestir(gecmisExcel[k] ?? [], gunler.filter((g) => g.ozet[k]).map((g) => ({ tarih: g.tarih, ozet: g.ozet[k] })));
}

/**
 * Excel Z2 + DÖNEM. Her pay grubunun bugünkü en düşük satış ilanı, geçen ilan döneminin kapanışındaki değerle karşılaştırılır
 * (yukselen / dusen). `tablo`: bütün pay grupları ve verisi olan son `n` kapanmış dönemin ortalamaları.
 */
export function kapanisKarsilastirma(n = 4) {
  const bos = { donem: null, atlanan: [], yukselen: [], dusen: [], ayni: 0, donemler: [], tablo: [] };
  if (!sonGun) return bos;
  const anahtarlar = tumAnahtarlar();
  const seriler = anahtarlar.map((k) => seri(k));
  const donem = gecenDonem(virman.donemler, seriler, sonGun.tarih);
  if (!donem) return bos;
  const atlanan = virman.donemler.filter((d) => d.kapanis > donem.kapanis && d.kapanis < sonGun.tarih);
  const donemler = virman.donemler
    .filter((d) => d.kapanis <= donem.kapanis && seriler.some((x) => donemOrtalamasi(x, d) != null))
    .slice(-n);
  const tablo = anahtarlar
    .map((k, i) => {
      const onceki = kapanisDegeri(seriler[i], donem);
      const simdi = sonGun.ozet[k]?.satis?.enIyi ?? null;
      return {
        s: satir(k),
        ortalamalar: donemler.map((d) => donemOrtalamasi(seriler[i], d)),
        onceki,
        simdi,
        degisim: onceki && simdi != null ? degisim(simdi, onceki.deger) : null,
      };
    })
    .filter((r) => r.simdi != null || r.ortalamalar.some((x) => x != null));
  const kiyas = tablo.filter((r) => r.degisim != null);
  return {
    donem,
    atlanan,
    yukselen: kiyas.filter((r) => r.simdi > r.onceki.deger).sort((a, b) => b.degisim - a.degisim),
    dusen: kiyas.filter((r) => r.simdi < r.onceki.deger).sort((a, b) => a.degisim - b.degisim),
    ayni: kiyas.filter((r) => r.simdi === r.onceki.deger).length,
    donemler,
    tablo,
  };
}

/**
 * Dönem karşılaştırmasının tam tablosu: verisi olan bütün ilan dönemleri; dönemlerden önceki sürekli açık aylar
 * (Temmuz 2024 öncesi) ay olarak eklenir (`ay: true`). Her pay grubu için dönem ortalaması (TL, en düşük satış ilanı).
 */
let _butun = null;
export function butunDonemler() {
  if (_butun) return _butun;
  const anahtarlar = tumAnahtarlar();
  const seriler = anahtarlar.map((k) => seri(k));
  const bugun = sonGun?.tarih ?? '9999';
  const ilkDonem = virman.donemler[0]?.acilis ?? '9999';
  const tarihler = seriler.flatMap((x) => x.map((p) => p.tarih)).filter((t) => t < ilkDonem).sort();
  const aylar = [];
  if (tarihler.length) {
    let [y, m] = tarihler[0].slice(0, 7).split('-').map(Number);
    const [sy, sm] = ilkDonem.slice(0, 7).split('-').map(Number);
    while (y * 12 + m < sy * 12 + sm) {
      const son = new Date(Date.UTC(y, m, 0)).getUTCDate();
      const a = `${y}-${String(m).padStart(2, '0')}`;
      aylar.push({ acilis: `${a}-01`, kapanis: `${a}-${son}`, ay: true });
      m++; if (m > 12) { m = 1; y++; }
    }
  }
  const donemler = [...aylar, ...virman.donemler.filter((d) => d.kapanis < bugun).map((d) => ({ acilis: d.acilis, kapanis: d.kapanis, ay: false }))]
    .filter((d) => seriler.some((x) => donemOrtalamasi(x, d) != null || donemOrtalamasi(x, d, 'medyanSatis') != null));
  const satirlar = anahtarlar
    .map((k, i) => ({
      s: satir(k),
      ortalamalar: donemler.map((d) => donemOrtalamasi(seriler[i], d)),
      medyanlar: donemler.map((d) => donemOrtalamasi(seriler[i], d, 'medyanSatis')),
      seyir: donemler.map((d) => donemIciDegisim(seriler[i], d)),
    }))
    .filter((r) => r.ortalamalar.some((x) => x != null) || r.medyanlar.some((x) => x != null));
  _butun = { donemler, satirlar };
  return _butun;
}

/** Excel DEFTER'in ana sayfa özeti: her pay grubunun ilan özeti (tek tek ilan yok). */
export function defterOzetleri() {
  return tumAnahtarlar()
    .map((k) => { const l = sonIlanlar(k); return { s: satir(k), o: defterOzeti(l.satis, l.alis) }; })
    .filter((x) => x.o.satis || x.o.alis);
}

/**
 * Excel'deki "en büyük ilanlar" görsellerinin nötr karşılığı: tutarı en büyük tek ilanlar.
 * Fiyat ve adet verilmez; yalnız pay grubu, taraf, tutar ve o ilanın kendi tarafındaki payı (%).
 */
export function enBuyukIlanlar(n = 10) {
  if (!sonGun) return [];
  const l = tekillestir(sonGun.ilanlar).filter((i) => i.birimFiyat > 0);
  const toplam = {};
  for (const i of l) { const k = `${anahtar(i.kod, i.grup)}|${i.tur}`; toplam[k] = (toplam[k] ?? 0) + i.tutar; }
  return [...l].sort((a, b) => b.tutar - a.tutar).slice(0, n).map((i) => {
    const k = anahtar(i.kod, i.grup);
    return { s: satir(k), tur: i.tur, tutar: i.tutar, pay: Math.round((i.tutar / toplam[`${k}|${i.tur}`]) * 1000) / 10 };
  });
}

export function sonIlanlar(k) {
  if (!sonGun) return { satis: [], alis: [] };
  const l = sonGun.ilanlar.filter((i) => anahtar(i.kod, i.grup) === k);
  return {
    satis: l.filter((i) => i.tur === 'satis').sort((x, y) => x.birimFiyat - y.birimFiyat),
    alis: l.filter((i) => i.tur === 'alis').sort((x, y) => y.birimFiyat - x.birimFiyat),
  };
}

export { bilgi };
