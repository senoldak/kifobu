// Pay ilanı verileri (/sekundery/) hesap çekirdeği.
// Günün rakamları, o gün yayında görülen açık (satılmamış) ilanlardan çıkar; aynı ilan birden çok turda görülse de bir kez sayılır.
// ENDU: en düşük satış ilanı, ENYU: en yüksek alış ilanı, MED: medyan birim fiyat.

/** @typedef {{ id?: string|number, kod: string, grup: string, tur: 'satis'|'alis', adet: number, birimFiyat: number, tutar: number }} Ilan */

export const anahtar = (kod, grup) => `${kod}-${grup}`;

export function medyan(sayilar) {
  const s = sayilar.filter(Number.isFinite).sort((a, b) => a - b);
  if (!s.length) return null;
  const o = s.length >> 1;
  return s.length % 2 ? s[o] : (s[o - 1] + s[o]) / 2;
}

/**
 * Aynı ilanı bir kez say. Yalnız kimlikle birleştirilir: aynı fiyat ve adetle verilmiş iki ayrı ilan gerçekten iki ilandır
 * (kimliksiz Excel yapıştırmasında böyle 1 çift var), alanlardan birleştirmek medyanı bozar. @param {Ilan[]} ilanlar
 */
export function tekillestir(ilanlar) {
  const gorulen = new Set();
  return ilanlar.filter((i) => {
    if (i.id == null) return true;
    const k = String(i.id);
    if (gorulen.has(k)) return false;
    gorulen.add(k);
    return true;
  });
}

function tarafOzeti(liste, enIyi, tarih) {
  if (!liste.length) return null;
  const fiyatlar = liste.map((i) => i.birimFiyat);
  return {
    enIyi: enIyi(...fiyatlar),
    medyan: medyan(fiyatlar),
    ilanSayisi: liste.length,
    adet: liste.reduce((t, i) => t + i.adet, 0),
    tutar: liste.reduce((t, i) => t + i.tutar, 0),
    // eski kayıtlarda (Excel aktarımı) alan yok: null = bilinmiyor
    islenen: liste.some((i) => Number.isFinite(i.islenen)) ? liste.reduce((t, i) => t + (i.islenen ?? 0), 0) : null,
    kismi: liste.some((i) => Number.isFinite(i.islenen)) ? liste.filter((i) => i.islenen > 0).length : null,
    // tekliflere açık ilan sayısı; eski kayıtlarda alan yok: null = bilinmiyor
    teklif: liste.some((i) => typeof i.teklif === 'boolean') ? liste.filter((i) => i.teklif === true).length : null,
    // yayın zamanı: o gün yayına giren ilan sayısı ve ilanların medyan yaşı (gün); eski kayıtlarda null
    ...yasOzeti(liste, tarih),
  };
}

function yasOzeti(liste, tarih) {
  const y = liste.filter((i) => typeof i.yayin === 'string' && /^\d{4}-\d{2}-\d{2}/.test(i.yayin));
  if (!tarih || !y.length) return { yeni: null, yasMedyan: null };
  const gun = Date.parse(`${tarih}T12:00:00Z`);
  const yaslar = y.map((i) => Math.max(0, Math.round((gun - Date.parse(`${i.yayin.slice(0, 10)}T12:00:00Z`)) / 864e5)));
  return { yeni: y.filter((i) => i.yayin.slice(0, 10) === tarih).length, yasMedyan: medyan(yaslar) };
}

/** @param {Ilan[]} ilanlar @param {string} [tarih] günün tarihi (ilan yaşı için) @returns {Record<string, { satis: object|null, alis: object|null }>} */
export function gunOzeti(ilanlar, tarih) {
  const gruplar = {};
  for (const i of tekillestir(ilanlar)) {
    if (!(i.birimFiyat > 0)) continue;
    const g = (gruplar[anahtar(i.kod, i.grup)] ??= { satis: [], alis: [] });
    g[i.tur]?.push(i);
  }
  const ozet = {};
  for (const [k, g] of Object.entries(gruplar)) {
    ozet[k] = { satis: tarafOzeti(g.satis, Math.min, tarih), alis: tarafOzeti(g.alis, Math.max, tarih) };
  }
  return ozet;
}

/** Fiyatın referansa göre değişimi, yüzde; iki ondalığa sıfıra doğru kesilir (kifobu kuralı: yuvarlanmaz). */
export function degisim(fiyat, referans) {
  if (!Number.isFinite(fiyat) || !(referans > 0)) return null;
  return Math.trunc(((fiyat - referans) / referans) * 10000) / 100;
}

export function yuzdeYaz(y) {
  if (y === null || y === undefined) return '';
  const isaret = y > 0 ? '+' : y < 0 ? '−' : '';
  return `%${isaret}${Math.abs(y).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function fiyatYaz(n) {
  if (!Number.isFinite(n)) return '';
  return n.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/**
 * Excel geçmişi ile günlük turları tek seride birleştirir; aynı gün ikisinde de varsa tur kazanır.
 * @param {{ tarih: string, enDusukSatis?: number, medyanSatis?: number }[]} excel
 * @param {{ tarih: string, ozet: { satis: object|null, alis: object|null } }[]} gunler
 */
export function seriBirlestir(excel = [], gunler = []) {
  const m = new Map(excel.map((p) => [p.tarih, { tarih: p.tarih, enDusukSatis: p.enDusukSatis ?? null, medyanSatis: p.medyanSatis ?? null, enYuksekAlis: null, medyanAlis: null }]));
  for (const { tarih, ozet } of gunler) {
    m.set(tarih, {
      tarih,
      enDusukSatis: ozet.satis?.enIyi ?? null,
      medyanSatis: ozet.satis?.medyan ?? null,
      enYuksekAlis: ozet.alis?.enIyi ?? null,
      medyanAlis: ozet.alis?.medyan ?? null,
    });
  }
  return [...m.values()].sort((a, b) => a.tarih.localeCompare(b.tarih));
}

/** Bir ilan döneminin kapanışındaki en düşük satış ilanı: dönem içindeki son gözlem. @param {{tarih:string,enDusukSatis?:number|null}[]} seri */
export function kapanisDegeri(seri, donem) {
  if (!donem) return null;
  for (let i = seri.length - 1; i >= 0; i--) {
    const n = seri[i];
    if (n.tarih > donem.kapanis) continue;
    if (n.tarih < donem.acilis) break;
    if (Number.isFinite(n.enDusukSatis)) return { tarih: n.tarih, deger: n.enDusukSatis };
  }
  return null;
}

/** Karşılaştırmada kullanılacak geçen dönem: bugünden önce kapanmış ve verisi olan en son dönem. */
export function gecenDonem(donemler, seriler, bugun) {
  const kapanmis = donemler.filter((d) => d.kapanis < bugun).sort((a, b) => a.kapanis.localeCompare(b.kapanis));
  for (let i = kapanmis.length - 1; i >= 0; i--) if (seriler.some((s) => kapanisDegeri(s, kapanmis[i]))) return kapanmis[i];
  return null;
}

/** Excel DÖNEM: bir ilan dönemindeki günlük en düşük satış ilanlarının ortalaması (gözlem yoksa null). */
export function donemOrtalamasi(seri, donem, alan = 'enDusukSatis') {
  const d = seri.filter((n) => n.tarih >= donem.acilis && n.tarih <= donem.kapanis && Number.isFinite(n[alan])).map((n) => n[alan]);
  return d.length ? Math.round((d.reduce((t, x) => t + x, 0) / d.length) * 100) / 100 : null;
}

/**
 * Excel DEFTER'in toplu karşılığı: bir pay grubunun yayındaki ilanlarından tek tek ilan göstermeden özet ölçüler.
 * fark: (en düşük satış − en yüksek alış) / en düşük satış, yüzde (Excel SPREAD). ortalama: adet ağırlıklı ilan fiyatı (VWAP).
 * enIyiPay / ilkUcPay: en iyi ilanın ve ilk üç ilanın, kendi tarafındaki pay adedi içindeki payı (Excel III, LLR).
 * dagilim: fiyat dilimlerine göre pay adedi (logaritmik dilimler; en pahalı %5 son dilimde toplanır).
 * @param {{birimFiyat:number, adet:number, tutar:number}[]} satis en ucuzdan pahalıya
 * @param {{birimFiyat:number, adet:number, tutar:number}[]} alis en pahalıdan ucuza
 */
export function defterOzeti(satis, alis, dilimSayisi = 8) {
  const taraf = (l) => {
    if (!l.length) return null;
    const adet = l.reduce((t, i) => t + i.adet, 0);
    const tutar = l.reduce((t, i) => t + i.tutar, 0);
    return {
      ilan: l.length,
      adet,
      tutar,
      enIyi: l[0].birimFiyat,
      ortalama: adet ? Math.round((tutar / adet) * 100) / 100 : null,
      enIyiPay: adet ? Math.round((l[0].adet / adet) * 1000) / 10 : null,
      ilkUcPay: adet ? Math.round((l.slice(0, 3).reduce((t, i) => t + i.adet, 0) / adet) * 1000) / 10 : null,
    };
  };
  const S = taraf(satis), A = taraf(alis);
  const fark = S && A ? Math.round(((S.enIyi - A.enIyi) / S.enIyi) * 10000) / 100 : null;
  const toplam = (S?.tutar ?? 0) + (A?.tutar ?? 0);
  const satisPayi = toplam ? Math.round(((S?.tutar ?? 0) / toplam) * 1000) / 10 : null;
  const fiyatlar = [...satis, ...alis].map((i) => i.birimFiyat).sort((a, b) => a - b);
  let dagilim = [];
  if (fiyatlar.length) {
    const lo = fiyatlar[0];
    const hi = fiyatlar[Math.min(fiyatlar.length - 1, Math.floor(fiyatlar.length * 0.95))];
    const n = hi > lo ? dilimSayisi : 1;
    const sinir = Array.from({ length: n + 1 }, (_, i) => (n === 1 ? (i ? hi : lo) : lo * (hi / lo) ** (i / n)));
    dagilim = Array.from({ length: n }, (_, i) => ({ alt: sinir[i], ust: sinir[i + 1], satisAdet: 0, alisAdet: 0, satisIlan: 0, alisIlan: 0 }));
    const ustu = { alt: hi, ust: null, satisAdet: 0, alisAdet: 0, satisIlan: 0, alisIlan: 0 };
    const yerlestir = (i, t) => {
      const d = i.birimFiyat > hi ? ustu : dagilim[Math.min(n - 1, dagilim.findIndex((x) => i.birimFiyat <= x.ust + 1e-9))] ?? dagilim[n - 1];
      d[`${t}Adet`] += i.adet;
      d[`${t}Ilan`] += 1;
    };
    for (const i of satis) yerlestir(i, 'satis');
    for (const i of alis) yerlestir(i, 'alis');
    if (ustu.satisIlan || ustu.alisIlan) dagilim.push(ustu);
  }
  // Excel DEFTER: MPR = satış adedi ÷ alış adedi, CBD = alış adedi − satış adedi, WMP = en iyi iki ilanın tutarı ÷ adedi
  const adetOrani = S && A && A.adet ? Math.round((S.adet / A.adet) * 100) / 100 : null;
  const adetFarki = S && A ? Math.round((A.adet - S.adet) * 100) / 100 : null;
  const ortaFiyat = S && A ? Math.round(((satis[0].tutar + alis[0].tutar) / (satis[0].adet + alis[0].adet)) * 100) / 100 : null;
  return { satis: S, alis: A, fark, satisPayi, toplamTutar: toplam, dagilim, adetOrani, adetFarki, ortaFiyat };
}

/** Dönem içi seyir: dönemin ilk ve son gözlemindeki en düşük satış ilanı arasındaki fark, yüzde (kesilir). Tek gözlemde null. */
export function donemIciDegisim(seri, donem) {
  const d = seri.filter((n) => n.tarih >= donem.acilis && n.tarih <= donem.kapanis && Number.isFinite(n.enDusukSatis));
  if (d.length < 2) return null;
  return degisim(d.at(-1).enDusukSatis, d[0].enDusukSatis);
}
