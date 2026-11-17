/** Kampanya keşfi ve takibi için ortak tipler. */

import { slugTr } from './konular.ts';
import type { GecmisKampanya } from './kampanya-gecmis.ts';

export type Bolum = 'aktif' | 'yakinda';

/** Platformun liste sayfasında görülen tek kampanya. */
export interface ListeKaydi {
  ad: string;
  url: string;
  bolum: Bolum;
}

/** Kampanya sayfasından okunan sayılar. Okunamayan alan null olur, asla 0 olmaz. */
export interface KampanyaDetay {
  /** Girişim adı (detay sayfasından); okunamazsa null. */
  ad: string | null;
  hedef: number | null;
  arzOrani: number | null;
  degerleme: number | null;
  baslangic: string | null;
  bitis: string | null;
  toplanan: number | null;
  yatirimci: number | null;
  nitelikli: number | null;
  kalanGun: number | null;
  sonGun: boolean;
  bitti: boolean;
  fonlandi: boolean | null;
}

/** Saf okuyucu: HTML metni alır, kayıt döndürür; ağ erişimi başka yerde yapılır. */
export interface Okuyucu {
  platform: string;
  listeUrller: string[];
  liste(html: string, listeUrl: string): ListeKaydi[];
  detay(html: string): KampanyaDetay;
  /** Detay için ek sayfalar: çağıran ana sayfayı ve bunları getirir, tüm HTML'i "\n" ile birleştirip detay()'a verir. */
  ekSayfalar?(url: string): string[];
}

/**
 * Bir kampanya adresinin kararlı kimliği: küçük harfli host ve yol, sondaki "/" atılmış;
 * sorgudan yalnız kimlik taşıyan `pid` ve `urlkey` kalır (ad ve değer küçük harf), gerisi (utm vb.) düşer.
 */
export function urlAnahtari(url: string): string {
  const u = new URL(url);
  const yol = u.pathname.toLowerCase().replace(/\/+$/, '');
  const kalan = [...u.searchParams.entries()]
    .map(([ad, deger]) => [ad.toLowerCase(), deger.toLowerCase()] as const)
    .filter(([ad]) => ad === 'pid' || ad === 'urlkey')
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  const sorgu = kalan.map(([ad, deger]) => `${ad}=${deger}`).join('&');
  return `${u.hostname.toLowerCase()}${yol}${sorgu ? `?${sorgu}` : ''}`;
}

// ---- Keşfin takip dosyasına uygulanması (saf mantık, G/Ç yok) ----

export type TakipDurumu = 'yakinda' | 'aktif' | 'bitti';

export interface TakipKaydi {
  ad: string;
  platform: string;
  url: string;
  durum: TakipDurumu;
  hedef: number | null;
  arzOrani: number | null;
  degerleme: number | null;
  baslangic: string | null;
  bitis: string | null;
  toplanan: number | null;
  yatirimci: number | null;
  nitelikli: number | null;
  fonlandi: boolean | null;
  ilkGorulme: string;
  sonGorulme: string;
  bittiGorulme: string | null;
  eksik: string[];
  kayipTur: number;
}

export interface TakipDosyasi {
  sonKesif: string | null;
  kampanyalar: TakipKaydi[];
  alarmlar: Record<string, string>;
}

export type OlayTuru =
  | 'yeni'
  | 'aktife-gecti'
  | 'bitti'
  | 'arsive-tasindi'
  | 'kayboldu'
  | 'okuyucu-bozuk'
  | 'olasi-cift'
  | 'arsivlenemedi';

export interface Olay {
  tur: OlayTuru;
  anahtar: string;
  metin: string;
}

export interface PlatformTurSonucu {
  platform: string;
  hata: string | null;
  liste: ListeKaydi[];
  /** Anahtar: urlAnahtari(url). null = sayfa açılamadı. */
  detaylar: Record<string, KampanyaDetay | null>;
}

export interface ElKaydi {
  ad: string;
  platform: string;
  url: string;
  bolum: Bolum;
  hedef?: number;
  degerleme?: number;
}

export interface ElListesi {
  ekle: ElKaydi[];
  /** URL'ler */
  cikar: string[];
  /** Anahtar: URL */
  duzelt: Record<string, Partial<TakipKaydi>>;
}

/** urlAnahtari bozuk adreste fırlatır; burada null döner. */
function guvenliAnahtar(url: string): string | null {
  try {
    return urlAnahtari(url);
  } catch {
    return null;
  }
}

/** Türkçeye özgü harf varsa tr-TR kuralıyla, yoksa düz büyük harfe çevirir (marka adlarında i -> I kalır). */
function buyukHarf(s: string): string {
  return /[çğıöşüÇĞİÖŞÜ]/.test(s) ? s.toLocaleUpperCase('tr-TR') : s.toUpperCase();
}

function tl(n: number | null): string {
  if (n === null) return 'okunamadı';
  return `₺${String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`;
}

function sade(s: string): string {
  return slugTr(s).replace(/-/g, '');
}

function olayMetni(baslik: string, k: TakipKaydi): string {
  return `${baslik}\n${k.ad} (${k.platform})\nHedef: ${tl(k.hedef)}\nDeğerleme: ${tl(k.degerleme)}\n${k.url}`;
}

function degerlemeHesapla(d: KampanyaDetay): number | null {
  if (d.degerleme !== null) return d.degerleme;
  return d.hedef && d.arzOrani ? Math.round(d.hedef / d.arzOrani) : null;
}

function eksikler(k: TakipKaydi): string[] {
  const e: string[] = [];
  if (k.hedef === null) e.push('hedef');
  if (k.degerleme === null) e.push('degerleme');
  return e;
}

/** Bir tur keşfin okuyucu sonuçlarını takip dosyasına işler; girdiyi değiştirmez. */
export function kesfiUygula(a: {
  takip: TakipDosyasi;
  sonuclar: PlatformTurSonucu[];
  gun: string;
  el: ElListesi;
  arsivAdlari: string[];
}): { takip: TakipDosyasi; olaylar: Olay[] } {
  const { gun } = a;
  const kampanyalar: TakipKaydi[] = a.takip.kampanyalar.map((k) => ({ ...k, eksik: [...k.eksik] }));
  const olaylar: Olay[] = [];
  const olayVar = new Set<string>();
  const olayEkle = (o: Olay) => {
    if (olayVar.has(o.anahtar)) return;
    olayVar.add(o.anahtar);
    olaylar.push(o);
  };
  const bozuk = (platform: string, neden: string) =>
    olayEkle({ tur: 'okuyucu-bozuk', anahtar: `${platform}:okuyucu-bozuk`, metin: `${platform} okuyucusu bozuk görünüyor: ${neden}` });

  const cikar = new Set(a.el.cikar.map(guvenliAnahtar).filter((x): x is string => x !== null));
  const arsiv = a.arsivAdlari.map((ad) => ({ ad, slug: slugTr(ad), sade: sade(ad) }));

  const anahtarDizini = () => {
    const m = new Map<string, TakipKaydi>();
    for (const k of kampanyalar) {
      const an = guvenliAnahtar(k.url);
      if (an) m.set(an, k);
    }
    return m;
  };

  const yeniAd = (liste: ListeKaydi, d: KampanyaDetay): string => {
    const adi = buyukHarf((d.ad ?? liste.ad).trim());
    const eslesen = arsiv.find((x) => x.slug === slugTr(adi));
    return eslesen ? eslesen.ad : adi;
  };

  const olasiCift = (k: TakipKaydi, anahtar: string) => {
    if (arsiv.some((x) => x.slug === slugTr(k.ad))) return;
    const s = sade(k.ad);
    for (const x of arsiv) {
      if (x.slug === slugTr(k.ad)) continue;
      const [kisa, uzun] = s.length <= x.sade.length ? [s, x.sade] : [x.sade, s];
      if (kisa.length >= 4 && uzun.includes(kisa)) {
        olayEkle({
          tur: 'olasi-cift',
          anahtar: `${k.platform}:olasi-cift:${anahtar}`,
          metin: olayMetni(`Olası çift kayıt: arşivdeki "${x.ad}" ile benzer.`, k),
        });
        return;
      }
    }
  };

  for (const s of a.sonuclar) {
    if (s.hata) {
      bozuk(s.platform, s.hata);
      continue;
    }
    const dizin = anahtarDizini();
    const gorulen = new Set<string>();
    const ogeler: { liste: ListeKaydi; an: string }[] = [];
    for (const l of s.liste) {
      const an = guvenliAnahtar(l.url);
      if (an === null) {
        bozuk(s.platform, 'liste kaydının adresi çözümlenemedi');
        continue;
      }
      if (gorulen.has(an)) continue;
      gorulen.add(an);
      ogeler.push({ liste: l, an });
    }
    const takipteAcik = kampanyalar.some((k) => k.platform === s.platform && k.durum !== 'bitti');
    if (ogeler.length === 0) {
      if (takipteAcik) bozuk(s.platform, 'liste boş geldi');
      continue;
    }
    const buTurEklenen = new Set<TakipKaydi>();

    for (const { liste, an } of ogeler) {
      if (cikar.has(an)) continue;
      const d = s.detaylar[an] ?? null;
      const mevcut = dizin.get(an);

      if (mevcut) {
        mevcut.sonGorulme = gun;
        mevcut.kayipTur = 0;
        if (!d) {
          bozuk(s.platform, 'kampanya sayfası açılamadı');
          continue;
        }
        if (mevcut.durum === 'bitti') continue;
        mevcut.hedef = d.hedef ?? mevcut.hedef;
        mevcut.arzOrani = d.arzOrani ?? mevcut.arzOrani;
        mevcut.degerleme = degerlemeHesapla(d) ?? mevcut.degerleme;
        mevcut.baslangic = d.baslangic ?? mevcut.baslangic;
        mevcut.bitis = d.bitis ?? mevcut.bitis;
        mevcut.toplanan = d.toplanan ?? mevcut.toplanan;
        mevcut.yatirimci = d.yatirimci ?? mevcut.yatirimci;
        mevcut.nitelikli = d.nitelikli ?? mevcut.nitelikli;
        mevcut.fonlandi = d.fonlandi ?? mevcut.fonlandi;
        mevcut.eksik = eksikler(mevcut);
        if (mevcut.durum === 'yakinda' && liste.bolum === 'aktif') {
          mevcut.durum = 'aktif';
          olayEkle({ tur: 'aktife-gecti', anahtar: `${s.platform}:aktife-gecti:${an}`, metin: olayMetni('Kampanya aktife geçti.', mevcut) });
        }
        // Tarih kuralı yalnız aktif kayda uygulanır: yakında kayıtta eski tarihli ön talep özeti görülebilir.
        const tarihGecti = mevcut.durum === 'aktif' && mevcut.bitis !== null && mevcut.bitis < gun;
        if (d.bitti || tarihGecti) {
          mevcut.durum = 'bitti';
          mevcut.bittiGorulme = gun;
          olayEkle({
            tur: 'bitti',
            anahtar: `${s.platform}:bitti:${an}`,
            metin: olayMetni(d.bitti ? 'Kampanya bitti.' : 'Kampanya bitti (bitiş tarihi geçti).', mevcut),
          });
        }
        continue;
      }

      // Yeni kayıt
      if (!d) {
        bozuk(s.platform, 'kampanya sayfası açılamadı');
        continue;
      }
      if (d.bitti) continue;
      if (liste.bolum === 'aktif' && d.bitis !== null && d.bitis < gun) continue;
      const k: TakipKaydi = {
        ad: yeniAd(liste, d),
        platform: s.platform,
        url: liste.url,
        durum: liste.bolum,
        hedef: d.hedef,
        arzOrani: d.arzOrani,
        degerleme: degerlemeHesapla(d),
        baslangic: d.baslangic,
        bitis: d.bitis,
        toplanan: d.toplanan,
        yatirimci: d.yatirimci,
        nitelikli: d.nitelikli,
        fonlandi: d.fonlandi,
        ilkGorulme: gun,
        sonGorulme: gun,
        bittiGorulme: null,
        eksik: [],
        kayipTur: 0,
      };
      k.eksik = eksikler(k);
      kampanyalar.push(k);
      dizin.set(an, k);
      buTurEklenen.add(k);
      olayEkle({ tur: 'yeni', anahtar: `${s.platform}:yeni:${an}`, metin: olayMetni('Yeni kampanya bulundu.', k) });
      olasiCift(k, an);
    }

    // Listede görünmeyen açık kayıtlar
    for (const k of kampanyalar) {
      if (k.platform !== s.platform || k.durum === 'bitti' || buTurEklenen.has(k)) continue;
      const an = guvenliAnahtar(k.url);
      if (an !== null && gorulen.has(an)) continue;
      k.kayipTur += 1;
      if (k.kayipTur === 2) {
        olayEkle({ tur: 'kayboldu', anahtar: `${s.platform}:kayboldu:${an ?? k.url}`, metin: olayMetni('Kampanya iki turdur listede görünmüyor.', k) });
      }
    }
  }

  // Not: el.ekle ve el.duzelt burada uygulanmaz; okuma anında (bultenListesi) bindirilir. Yalnız el.cikar etkilidir.

  return { takip: { sonKesif: gun, kampanyalar, alarmlar: { ...a.takip.alarmlar } }, olaylar };
}

/** Biten kampanyaları takipten kapanmış kampanyalar arşivine taşır; girdiyi değiştirmez. */
export function arsiveTasi(a: {
  takip: TakipDosyasi;
  arsiv: GecmisKampanya[];
  gun: string;
  gunlukSonAlinan: Record<string, number>;
}): { takip: TakipDosyasi; yeniArsiv: GecmisKampanya[]; olaylar: Olay[] } {
  const arsiv: GecmisKampanya[] = a.arsiv.map((k) => ({ ...k }));
  const kalan: TakipKaydi[] = [];
  const olaylar: Olay[] = [];

  for (const k of a.takip.kampanyalar) {
    // Bugün biten kayıt, o günün bülteninde "SONA ERDİ" olarak kalsın diye yarına bırakılır.
    if (k.bittiGorulme === null || k.bittiGorulme >= a.gun) {
      kalan.push(k);
      continue;
    }
    const an = guvenliAnahtar(k.url);
    const olayAnahtari = an ?? k.url;

    if (an !== null && arsiv.some((x) => x.url !== null && guvenliAnahtar(x.url) === an)) continue;

    const gunlukten = k.toplanan === null && a.gunlukSonAlinan[k.ad] !== undefined;
    const alinan = k.toplanan ?? a.gunlukSonAlinan[k.ad] ?? null;
    if (k.hedef === null || k.baslangic === null || alinan === null) {
      const eksik = [k.hedef === null ? 'hedef' : null, k.baslangic === null ? 'başlangıç tarihi' : null, alinan === null ? 'toplanan tutar' : null]
        .filter((x): x is string => x !== null)
        .join(', ');
      olaylar.push({
        tur: 'arsivlenemedi',
        anahtar: `${k.platform}:arsivlenemedi:${olayAnahtari}`,
        metin: olayMetni(`Arşive taşınamadı, eksik bilgi: ${eksik}.`, k),
      });
      kalan.push(k);
      continue;
    }

    const durum: GecmisKampanya['durum'] = k.fonlandi === null ? (alinan >= k.hedef ? 'fonlandi' : 'fonlanamadi') : k.fonlandi ? 'fonlandi' : 'fonlanamadi';
    const payArz = k.arzOrani ?? (k.hedef && k.degerleme ? Math.round((k.hedef / k.degerleme) * 10000) / 10000 : null);

    const slug = slugTr(k.ad);
    const ayni = arsiv.filter((x) => slugTr(x.ad) === slug);
    let anahtar = k.ad.toLocaleUpperCase('tr-TR').replace(/[^A-ZÇĞİÖŞÜ0-9]/g, '');
    let tur: number | null = null;
    if (ayni.length > 0) {
      anahtar = ayni[0].anahtar;
      if (ayni.length === 1 && ayni[0].tur === null) {
        ayni[0].tur = 1;
        tur = 2;
      } else {
        tur = Math.max(...ayni.map((x) => x.tur ?? 0)) + 1;
      }
    }

    const yeni: GecmisKampanya = {
      anahtar, ad: k.ad, tur, platform: k.platform, durum, baslangic: k.baslangic, bitis: k.bitis, hedef: k.hedef, alinan,
      payArz, yatirimci: k.yatirimci, nitelikli: k.nitelikli, sermaye: null, payFiyati: null, payGrubu: null,
      fonAktarim: null, sirket: null, url: k.url,
    };
    arsiv.unshift(yeni);
    olaylar.push({
      tur: 'arsive-tasindi',
      anahtar: `${k.platform}:arsive-tasindi:${olayAnahtari}`,
      metin:
        `Kampanya arşive taşındı: ${k.ad} (${k.platform})
` +
        `Sonuç: ${durum === 'fonlandi' ? 'fonlandı' : 'fonlanamadı'}
` +
        `Hedef: ${tl(k.hedef)}
Toplanan: ${tl(alinan)}${gunlukten ? ' (günlük kayıttan)' : ''}
${k.url}`,
    });
  }

  // Eşit başlangıçta yeni kayıt eskilerden önce kalır (unshift) ve sıralama kararlıdır.
  const yeniArsiv = arsiv.sort((x, y) => (x.baslangic < y.baslangic ? 1 : x.baslangic > y.baslangic ? -1 : 0));
  return { takip: { ...a.takip, kampanyalar: kalan, alarmlar: { ...a.takip.alarmlar } }, yeniArsiv, olaylar };
}
