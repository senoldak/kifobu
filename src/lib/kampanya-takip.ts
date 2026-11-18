/** Kampanya keşfi ve takibi için ortak tipler. */

import { slugTr } from './konular.ts';
import type { GecmisKampanya } from './kampanya-gecmis.ts';
import type { KampanyaKaynagi } from '../data/bulten-kaynaklari.ts';

export type Bolum = 'aktif' | 'yakinda';

/** Platformun liste sayfasında görülen tek kampanya. */
export interface ListeKaydi {
  ad: string;
  url: string;
  bolum: Bolum;
  /**
   * Kartın kendi sayfası/bağlantısı yok (platformda bağlantısız "yakında" kartı). Okuyucu adresi
   * `${listeUrl}#yakinda-${slugTr(ad)}` biçiminde verir; keşif bu kayıt için detay sayfası getirmez.
   */
  detaysiz?: true;
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
  /** Toplam ön talep tutarı (platform göstermiyorsa null). */
  onTalep: number | null;
  /** Ön talepte bulunan kişi sayısı (platform göstermiyorsa null). */
  onTalepKisi: number | null;
}

/** Saf okuyucu: HTML metni alır, kayıt döndürür; ağ erişimi başka yerde yapılır. */
export interface Okuyucu {
  platform: string;
  listeUrller: string[];
  liste(html: string, listeUrl: string): ListeKaydi[];
  detay(html: string): KampanyaDetay;
  /** Detay için ek sayfalar: çağıran ana sayfayı ve bunları getirir, tüm HTML'i "\n" ile birleştirip detay()'a verir. */
  ekSayfalar?(url: string): string[];
  /**
   * Zincirleme detay: çağıran her getirdiği sayfanın HTML'ini ve adresini verir, okuyucu sıradakinin adresini döner
   * (yoksa null). Adres ".pdf" ile bitiyorsa çağıran PDF'i metne çevirip başına PDF_AYRACI koyarak ekler. En çok 3 adım.
   */
  sonrakiSayfa?(html: string, url: string): string | null;
}

/** detay()'a giden birleşik metinde PDF'ten çevrilmiş parçanın başına konan ayraç. */
export const PDF_AYRACI = '<!-- pdf-metni -->\n';

/**
 * Bir kampanya adresinin kararlı kimliği: küçük harfli host ve yol, sondaki "/" atılmış;
 * sorgudan yalnız kimlik taşıyan `pid` ve `urlkey` kalır (ad ve değer küçük harf), gerisi (utm vb.) düşer.
 */
export function urlAnahtari(url: string): string {
  const u = new URL(url);
  const yol = u.pathname.toLowerCase().replace(/\/+$/, '');
  // Bağlantısız "yakında" kartlarının adresi liste sayfasıdır; kartları `#yakinda-<slug>` parçası ayırır.
  const kart = /^#yakinda-/i.test(u.hash) ? u.hash.toLowerCase() : '';
  const kalan = [...u.searchParams.entries()]
    .map(([ad, deger]) => [ad.toLowerCase(), deger.toLowerCase()] as const)
    .filter(([ad]) => ad === 'pid' || ad === 'urlkey')
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  const sorgu = kalan.map(([ad, deger]) => `${ad}=${deger}`).join('&');
  return `${u.hostname.toLowerCase()}${yol}${sorgu ? `?${sorgu}` : ''}${kart}`;
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
  /** Toplam ön talep tutarı; platform göstermiyorsa null (eski kayıtlarda alan hiç olmayabilir). */
  onTalep: number | null;
  /** Ön talepte bulunan kişi sayısı; platform göstermiyorsa null. */
  onTalepKisi: number | null;
  ilkGorulme: string;
  sonGorulme: string;
  bittiGorulme: string | null;
  eksik: string[];
  kayipTur: number;
  /** Bağlantısız "yakında" kartı: tutar/tarih yok, detay sayfası yok; arşive hiç girmez. */
  detaysiz?: true;
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
  | 'arsivlenemedi'
  | 'eski-kart';

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

const HEDEFSIZ_NOT = ' Hedef okunamadığı için bültene alınmadı.';

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

  const yeniAd = (liste: ListeKaydi, d: KampanyaDetay | null): string => {
    const adi = buyukHarf((d?.ad ?? liste.ad).trim());
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

  /** Takipteki kayda okunan detayı işler: boş olmayan alanlar yazılır, sonra bitiş kuralları. */
  const detayiIsle = (k: TakipKaydi, d: KampanyaDetay, bolum: Bolum | null, platform: string, an: string) => {
    const gecis = k.durum === 'yakinda' && bolum === 'aktif';
    k.hedef = d.hedef ?? k.hedef;
    k.arzOrani = d.arzOrani ?? k.arzOrani;
    k.degerleme = degerlemeHesapla(d) ?? k.degerleme;
    // Yakından aktife geçişte tarihler yalnız taze detaydan gelir: eski ön talep özetinin tarihi taşınmaz.
    k.baslangic = gecis ? d.baslangic : (d.baslangic ?? k.baslangic);
    k.bitis = gecis ? d.bitis : (d.bitis ?? k.bitis);
    k.toplanan = d.toplanan ?? k.toplanan;
    k.yatirimci = d.yatirimci ?? k.yatirimci;
    k.nitelikli = d.nitelikli ?? k.nitelikli;
    k.fonlandi = d.fonlandi ?? k.fonlandi;
    // Okunamayan (null) ön talep eski değerin üzerine yazılmaz.
    k.onTalep = d.onTalep ?? k.onTalep ?? null;
    k.onTalepKisi = d.onTalepKisi ?? k.onTalepKisi ?? null;
    k.eksik = eksikler(k);
    if (gecis) {
      k.durum = 'aktif';
      olayEkle({ tur: 'aktife-gecti', anahtar: `${platform}:aktife-gecti:${an}`, metin: olayMetni('Kampanya aktife geçti.', k) + (k.hedef === null ? HEDEFSIZ_NOT : '') });
    }
    // Tarih kuralı yalnız aktif kayda uygulanır: yakında kayıtta eski tarihli ön talep özeti görülebilir.
    const tarihGecti = k.durum === 'aktif' && k.bitis !== null && k.bitis < gun;
    if (d.bitti || tarihGecti) {
      k.durum = 'bitti';
      k.bittiGorulme = gun;
      olayEkle({
        tur: 'bitti',
        anahtar: `${platform}:bitti:${an}`,
        metin: olayMetni(d.bitti ? 'Kampanya bitti.' : 'Kampanya bitti (bitiş tarihi geçti).', k),
      });
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
    const takipteAcik = kampanyalar.some((k) => k.platform === s.platform && k.durum !== 'bitti' && !k.detaysiz);
    // Detaysız kartlar liste turu başarılı olduysa listeyle birebir eşitlenir: görünmeyen sessizce düşer (kayboldu/olay yok).
    // Gerçek kayıtlar varken liste boş gelmişse okuyucu bozuk olabilir; o durumda hiçbir şeye dokunulmaz.
    const detaysizDus = () => {
      const kalanlar = new Set(ogeler.filter((o) => o.liste.detaysiz).map((o) => o.an));
      for (let i = kampanyalar.length - 1; i >= 0; i--) {
        const k = kampanyalar[i];
        if (k.platform !== s.platform || !k.detaysiz) continue;
        const an = guvenliAnahtar(k.url);
        if (an === null || !kalanlar.has(an)) kampanyalar.splice(i, 1);
      }
    };
    if (ogeler.length === 0) {
      if (takipteAcik) bozuk(s.platform, 'liste boş geldi');
      else detaysizDus();
      continue;
    }
    const buTurEklenen = new Set<TakipKaydi>();

    for (const { liste, an } of ogeler) {
      if (cikar.has(an)) continue;

      if (liste.detaysiz) {
        const onceki = dizin.get(an);
        if (onceki) {
          onceki.sonGorulme = gun;
          onceki.kayipTur = 0;
          continue;
        }
        const k: TakipKaydi = {
          ad: yeniAd(liste, null), platform: s.platform, url: liste.url, durum: 'yakinda',
          hedef: null, arzOrani: null, degerleme: null, baslangic: null, bitis: null,
          toplanan: null, yatirimci: null, nitelikli: null, fonlandi: null, onTalep: null, onTalepKisi: null,
          ilkGorulme: gun, sonGorulme: gun, bittiGorulme: null, eksik: [], kayipTur: 0, detaysiz: true,
        };
        kampanyalar.push(k);
        dizin.set(an, k);
        buTurEklenen.add(k);
        olayEkle({
          tur: 'yeni',
          anahtar: `${s.platform}:yeni:${an}`,
          metin: `Yeni "yakında" kartı bulundu.
${k.ad} (${s.platform})
Platformun liste sayfasında bağlantısız bir "yakında" kartı görüldü.
${liste.url.split('#')[0]}`,
        });
        continue;
      }

      const d = s.detaylar[an] ?? null;
      const mevcut = dizin.get(an);

      if (mevcut) {
        // Biten kaydın sayfası getirilmez; ne birleştirme ne alarm ne de sayaç değişir.
        if (mevcut.durum === 'bitti') continue;
        mevcut.sonGorulme = gun;
        mevcut.kayipTur = 0;
        if (!d) {
          bozuk(s.platform, 'kampanya sayfası açılamadı');
          continue;
        }
        detayiIsle(mevcut, d, liste.bolum, s.platform, an);
        continue;
      }

      // Yeni kayıt
      if (!d) {
        bozuk(s.platform, 'kampanya sayfası açılamadı');
        continue;
      }
      if (d.bitti) continue;
      if (liste.bolum === 'yakinda' && d.bitis !== null && d.bitis < gun) {
        olayEkle({
          tur: 'eski-kart',
          anahtar: `${s.platform}:eski-kart:${an}`,
          metin: `Platformda eski bir ön talep kartı görüldü, bültene alınmadı.
${yeniAd(liste, d)} (${s.platform})
${liste.url}`,
        });
        continue;
      }
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
        onTalep: d.onTalep ?? null,
        onTalepKisi: d.onTalepKisi ?? null,
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
      olayEkle({ tur: 'yeni', anahtar: `${s.platform}:yeni:${an}`, metin: olayMetni('Yeni kampanya bulundu.', k) + (k.durum === 'aktif' && k.hedef === null ? HEDEFSIZ_NOT : '') });
      olasiCift(k, an);
    }

    detaysizDus();

    // Listede görünmeyen açık kayıtlar
    for (const k of kampanyalar) {
      if (k.platform !== s.platform || k.durum === 'bitti' || k.detaysiz || buTurEklenen.has(k)) continue;
      const an = guvenliAnahtar(k.url);
      if (an !== null && gorulen.has(an)) continue;
      if (an !== null && s.detaylar[an] === null) bozuk(s.platform, 'kampanya sayfası açılamadı');
      const d = an !== null ? s.detaylar[an] : undefined;
      if (d) {
        detayiIsle(k, d, null, s.platform, an!);
        if (k.durum === 'bitti') continue;
      }
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
  /** El listesi: duzelt alanları kayda kopya üzerinden bindirilir; takip dosyasına yazılmaz. */
  el?: ElListesi;
}): { takip: TakipDosyasi; yeniArsiv: GecmisKampanya[]; olaylar: Olay[] } {
  const arsiv: GecmisKampanya[] = a.arsiv.map((k) => ({ ...k }));
  const kalan: TakipKaydi[] = [];
  const olaylar: Olay[] = [];

  const duzelt = new Map<string, Partial<TakipKaydi>>();
  for (const [url, d] of Object.entries(a.el?.duzelt ?? {})) {
    const an = guvenliAnahtar(url);
    if (an !== null) duzelt.set(an, d);
  }
  const BINDIRILEN = ['ad', 'hedef', 'baslangic', 'bitis', 'toplanan', 'arzOrani', 'degerleme', 'fonlandi'] as const;

  for (const orij of a.takip.kampanyalar) {
    const k: TakipKaydi = { ...orij, eksik: [...orij.eksik] };
    const dz = duzelt.get(guvenliAnahtar(orij.url) ?? '');
    if (dz) for (const alan of BINDIRILEN) if (dz[alan] !== undefined) (k as unknown as Record<string, unknown>)[alan] = dz[alan];
    // Bugün biten kayıt, o günün bülteninde "SONA ERDİ" olarak kalsın diye yarına bırakılır.
    if (k.bittiGorulme === null || k.bittiGorulme >= a.gun) {
      kalan.push(orij);
      continue;
    }
    const an = guvenliAnahtar(k.url);
    const olayAnahtari = an ?? k.url;

    if (an !== null && arsiv.some((x) => x.url !== null && guvenliAnahtar(x.url) === an)) continue;

    const gunlukten = k.toplanan === null && a.gunlukSonAlinan[k.ad] !== undefined;
    const alinan = k.toplanan ?? a.gunlukSonAlinan[k.ad] ?? null;
    const sorunlar = [
      k.hedef === null || k.hedef <= 0 ? 'hedef' : null,
      k.baslangic === null ? 'başlangıç tarihi' : null,
      alinan === null || alinan < 0 ? 'toplanan tutar' : null,
    ].filter((x): x is string => x !== null);
    const bitisErken = k.baslangic !== null && k.bitis !== null && k.bitis < k.baslangic;
    if (k.hedef === null || k.baslangic === null || alinan === null || sorunlar.length > 0 || bitisErken) {
      const neden = [sorunlar.length > 0 ? `eksik ya da geçersiz bilgi: ${sorunlar.join(', ')}` : null, bitisErken ? 'bitiş başlangıçtan önce' : null]
        .filter((x): x is string => x !== null)
        .join('; ');
      olaylar.push({
        tur: 'arsivlenemedi',
        anahtar: `${k.platform}:arsivlenemedi:${olayAnahtari}`,
        metin: olayMetni(`Arşive taşınamadı, ${neden}.`, k),
      });
      kalan.push(orij);
      continue;
    }

    const durum: GecmisKampanya['durum'] = k.fonlandi === null ? (alinan >= k.hedef ? 'fonlandi' : 'fonlanamadi') : k.fonlandi ? 'fonlandi' : 'fonlanamadi';
    const payArz = k.arzOrani ?? (k.hedef && k.degerleme ? Math.round((k.hedef / k.degerleme) * 10000) / 10000 : null);

    const slug = slugTr(k.ad);
    const ayni = arsiv.filter((x) => slugTr(x.ad) === slug);
    let anahtar = buyukHarf(k.ad).replace(/İ/g, 'I').replace(/[^A-ZÇĞÖŞÜ0-9]/g, '');
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

/**
 * Sayfa okunamayınca bültene yazılacak tutar: dünkü referans, yoksa takip dosyasındaki son okunan; ikisi de yoksa null.
 * Null dönerse satır bültene alınmaz (uydurma ₺0 yazılmaz).
 */
export function yedekToplanan(referansDegeri: number | undefined, sonToplanan: number | undefined): number | null {
  return referansDegeri ?? sonToplanan ?? null;
}

/** Bültenin "yakında" satırı; ön talep rakamları yalnız bilinenler için bulunur (null/0 yazılmaz). */
export interface YakindaKaynagi {
  ad: string;
  platform: string;
  url: string;
  hedef?: number;
  degerleme?: number;
  onTalep?: number;
  onTalepKisi?: number;
}

/** Bültene girecek kampanyalar. el.ekle ve el.duzelt yalnız burada, okuma anında uygulanır; takip dosyasına yazılmaz. */
export function bultenListesi(
  takip: TakipDosyasi,
  el: ElListesi,
): { aktif: KampanyaKaynagi[]; yakinda: YakindaKaynagi[] } {
  const cikar = new Set(el.cikar.map(guvenliAnahtar).filter((x): x is string => x !== null));
  const duzelt = new Map<string, Partial<TakipKaydi>>();
  for (const [url, d] of Object.entries(el.duzelt)) {
    const an = guvenliAnahtar(url);
    if (an !== null) duzelt.set(an, d);
  }

  // Takip kayıtları ve el.ekle girdileri tek biçimde birleştirilir; el girdisi ilkGorulme'de sona düşer.
  interface Aday { ad: string; platform: string; url: string; durum: TakipDurumu; hedef: number | null; degerleme: number | null; toplanan: number | null; fonlandi: boolean | null; onTalep: number | null; onTalepKisi: number | null; ilk: string; an: string; }
  const adaylar = new Map<string, Aday>();
  const takipAnahtarlari = new Set<string>();
  for (const k of takip.kampanyalar) {
    const an = guvenliAnahtar(k.url);
    if (an === null || cikar.has(an) || adaylar.has(an)) continue;
    adaylar.set(an, { ad: k.ad, platform: k.platform, url: k.url, durum: k.durum, hedef: k.hedef, degerleme: k.degerleme, toplanan: k.toplanan, fonlandi: k.fonlandi, onTalep: k.onTalep ?? null, onTalepKisi: k.onTalepKisi ?? null, ilk: k.ilkGorulme, an });
    takipAnahtarlari.add(an);
  }
  for (const e of el.ekle) {
    const an = guvenliAnahtar(e.url);
    // Takip kaydıyla yalnız adres, el girdileri kendi arasında adres ve adla ayrışır (aynı sayfada birden çok girişim olabilir).
    if (an === null || cikar.has(an) || takipAnahtarlari.has(an)) continue;
    const elAnahtari = `${an}|${slugTr(e.ad)}`;
    if (adaylar.has(elAnahtari)) continue;
    adaylar.set(elAnahtari, { ad: e.ad, platform: e.platform, url: e.url, durum: e.bolum, hedef: e.hedef ?? null, degerleme: e.degerleme ?? null, toplanan: null, fonlandi: null, onTalep: null, onTalepKisi: null, ilk: '￿', an });
  }

  const aktif: (KampanyaKaynagi & { ilk: string })[] = [];
  const yakinda: (YakindaKaynagi & { ilk: string })[] = [];
  for (const a of adaylar.values()) {
    const d = duzelt.get(a.an) ?? {};
    const ad = d.ad ?? a.ad;
    const platform = d.platform ?? a.platform;
    const url = d.url ?? a.url;
    const durum = d.durum ?? a.durum;
    const hedef = d.hedef !== undefined ? d.hedef : a.hedef;
    const degerleme = d.degerleme !== undefined ? d.degerleme : a.degerleme;
    if (durum === 'yakinda') {
      const y: YakindaKaynagi & { ilk: string } = { ad, platform, url, ilk: a.ilk };
      if (hedef) y.hedef = hedef;
      if (degerleme) y.degerleme = degerleme;
      if (a.onTalep) y.onTalep = a.onTalep;
      if (a.onTalepKisi) y.onTalepKisi = a.onTalepKisi;
      yakinda.push(y);
      continue;
    }
    if (hedef === null) continue;
    const kayit: KampanyaKaynagi & { ilk: string } = { ad, platform, url, hedefFon: hedef, degerleme: degerleme ?? 0, ilk: a.ilk };
    if (a.toplanan !== null) kayit.sonToplanan = a.toplanan;
    if (durum === 'bitti') {
      kayit.sabitDurum = 'SONA ERDİ';
      // Yalnız gerçekten fonlanan kampanya "FONLANDI" sayılır; sona erip hedefe varmayan sayılmaz.
      kayit.tamamlandi = a.fonlandi === true || (a.fonlandi === null && a.toplanan !== null && hedef !== null && a.toplanan >= hedef);
    }
    aktif.push(kayit);
  }

  const sirala = (x: { platform: string; ilk: string }, y: { platform: string; ilk: string }) =>
    x.platform < y.platform ? -1 : x.platform > y.platform ? 1 : x.ilk < y.ilk ? -1 : x.ilk > y.ilk ? 1 : 0;
  aktif.sort(sirala);
  yakinda.sort(sirala);

  const aktifAdlari = new Set(aktif.map((x) => slugTr(x.ad)));
  return {
    aktif: aktif.map(({ ilk: _ilk, ...x }) => x),
    yakinda: yakinda.filter((x) => !aktifAdlari.has(slugTr(x.ad))).map(({ ilk: _ilk, ...x }) => x),
  };
}

const GURULTULU_TURLER: ReadonlySet<OlayTuru> = new Set<OlayTuru>(['okuyucu-bozuk', 'kayboldu', 'arsivlenemedi', 'olasi-cift', 'eski-kart']);

/** Gürültülü alarm türleri aynı anahtar için günde bir kez geçer; bilgi türleri hep geçer. Girdiyi değiştirmez. */
export function alarmSuz(
  olaylar: Olay[],
  alarmlar: Record<string, string>,
  gun: string,
): { gonderilecek: Olay[]; alarmlar: Record<string, string> } {
  const yeni = { ...alarmlar };
  const gonderilecek: Olay[] = [];
  for (const o of olaylar) {
    if (GURULTULU_TURLER.has(o.tur)) {
      if (yeni[o.anahtar] === gun) continue;
      yeni[o.anahtar] = gun;
    }
    gonderilecek.push(o);
  }
  return { gonderilecek, alarmlar: yeni };
}
