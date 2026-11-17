import { hedefeOran } from '../src/lib/kimlik.ts';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Kaynakları yükle
const kaynaklarPath = path.join(rootDir, 'src', 'data', 'bulten-kaynaklari.ts');
const kaynaklarContent = fs.readFileSync(kaynaklarPath, 'utf8');

const referansPath = path.join(rootDir, 'src', 'data', 'bulten-referans.json');
let referans: { tarih: string; sayi: number; girisimler: Record<string, number>; mkk?: Mkk } = {
  tarih: '10 Ekim 2026',
  sayi: 1523,
  girisimler: {},
};
if (fs.existsSync(referansPath)) {
  try {
    referans = JSON.parse(fs.readFileSync(referansPath, 'utf8'));
  } catch (e) {
    console.error('Referans dosyası okunamadı, varsayılan kullanılacak:', e);
  }
}

import { arsivKaydiOlustur } from '../src/lib/arsiv/kayit.ts';
import type { TaramaSonucu } from '../src/lib/arsiv/kayit.ts';
import { sonKaydiBul, kaydiYaz } from '../src/lib/arsiv/dosya.ts';
import { yayinDurduMu } from './bot/standart.mjs';
import { fetchHtml, rastgeleBekle, detayGetir } from './kampanya-kesfi/getir.ts';
import { OKUYUCULAR } from './kampanya-kesfi/platformlar/index.ts';
import { bultenListesi } from '../src/lib/kampanya-takip.ts';
import type { TakipDosyasi } from '../src/lib/kampanya-takip.ts';

/** VAP (MKK) istatistikleri. */
interface Mkk {
  platform: number;
  sirket: number;
  yatirimci: number;
  fon: string;
  /** Canlı okunamadı, son bilinen değer kullanılıyor. */
  bayat?: boolean;
}

/** Son bilinen MKK değeri: kapanış referansında, yoksa yayındaki bulten.ts içinde. */
function mkkSonBilinen(): Mkk | null {
  if (referans.mkk) return referans.mkk;
  try {
    const eski = fs.readFileSync(path.join(rootDir, 'src', 'data', 'bulten.ts'), 'utf8');
    const m = eski.match(/\r?\n  mkk: (\{[\s\S]*?\r?\n\}),/);
    if (m) {
      const { platform, sirket, yatirimci, fon } = JSON.parse(m[1]);
      if ([platform, sirket, yatirimci].every(Number.isFinite) && typeof fon === 'string') return { platform, sirket, yatirimci, fon };
    }
  } catch {
    // okunamazsa null
  }
  return null;
}

/**
 * Sayfa okunamaz ya da beklenen alanlardan biri bulunamazsa sabit (uydurma) sayı yazılmaz: son bilinen değer
 * bayat=true ile döner, o da yoksa null (F5, 21 Ekim). Eskiden her eksik alan yerine 18 / 179 / 47.163 / ₺1,60 Milyar
 * gibi sabitler canlı veri gibi yayına giriyordu.
 */
async function scrapeMkk(yedek: Mkk | null): Promise<Mkk | null> {
  try {
    const html = await fetchHtml('https://www.vap.org.tr/');
    const platMatch = html.match(/Platform Sayısı[\s\S]*?<span class="val fBig">\s*(\d+)/i);
    const sirketMatch = html.match(/Kaydileşen Şirket Sayısı[\s\S]*?<span class="val fBig">\s*(\d+)/i);
    const yatirimciMatch = html.match(/Kaydileşen Şirketlerin Yatırımcı Sayısı[\s\S]*?<span class="val fBig">\s*([\d\.]+)/i);
    const fonMatch = html.match(/Başarılı Fonlama Tutarı[\s\S]*?<span class="val fBig">\s*([^<]+)<\/span>\s*<span class="val fNormal">\s*([^<]+)/i);
    if (!platMatch || !sirketMatch || !yatirimciMatch || !fonMatch) {
      throw new Error('VAP sayfasında beklenen alanlar bulunamadı (sayfa yapısı değişmiş olabilir)');
    }
    return {
      platform: parseInt(platMatch[1], 10),
      sirket: parseInt(sirketMatch[1], 10),
      yatirimci: parseInt(yatirimciMatch[1].replace(/\./g, ''), 10),
      fon: `${fonMatch[1].trim()} ${fonMatch[2].trim()}`,
    };
  } catch (e: any) {
    if (yedek) {
      console.error(`MKK verisi çekilemedi; son bilinen değer kullanılıyor (bayat): ${e.message}`);
      return { ...yedek, bayat: true };
    }
    console.error(`MKK verisi çekilemedi ve son bilinen değer yok; MKK şeridi boş kalacak: ${e.message}`);
    return null;
  }
}

/** Türkçe formatlı tarih: "11 Ekim 2026" */
function getTrTarih(): string {
  const aylar = [
    'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
    'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık',
  ];
  const [yil, ay, gun] = trBugunIso().split('-').map(Number);
  return `${gun} ${aylar[ay - 1]} ${yil}`;
}

/** Türkiye saatine göre bugünün tarihi, "YYYY-MM-DD" (runner UTC'de çalışıyor). */
function trBugunIso(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Istanbul' }).format(new Date());
}

/**
 * Bülten numarası tarihten türetilir: 10 Ekim 2026 = 1523, sonraki her gün +1.
 * Kapanış aynı gün kaç kez çalışırsa çalışsın numara kaymaz.
 */
function getBultenSayisi(): number {
  const capa = Date.UTC(2026, 9, 10);
  const bugun = Date.parse(`${trBugunIso()}T00:00:00Z`);
  return 1523 + Math.round((bugun - capa) / 86_400_000);
}

async function main() {
  const isKapanis = process.argv.includes('--kapanis');
  console.log(`[BÜLTEN BOTU] Başlatıldı. Mod: ${isKapanis ? 'GÜNLÜK BÜLTEN KAPANIŞI (18:00)' : 'CANLI GÜNCELLEME (Saatlik)'}`);

  // Standartlar: acil durdurma açıksa hiçbir şey yazılmaz, paylaşılmaz (paylas çıktısı verilmez).
  const dur = await yayinDurduMu({ url: process.env.MOTOR_URL, anahtar: process.env.MOTOR_ANAHTARI, site: 'kifobu' });
  if (dur.durdu) {
    console.log(`Acil durdurma açık: ${dur.neden}`);
    return;
  }
  console.log(`Acil durdurma kontrolü: ${dur.neden}`);

  // Kampanyalar ve ayarlar
  const { PLATFORM_AYARLARI, EL_LISTESI } = await import('../src/data/bulten-kaynaklari.ts');
  const takipYolu = path.join(rootDir, 'src', 'data', 'kampanya-takip.json');
  const takip: TakipDosyasi = JSON.parse(fs.readFileSync(takipYolu, 'utf8'));
  const { aktif: AKTIF_KAMPANYALAR, yakinda: YAKINDA_LISTESI } = bultenListesi(takip, EL_LISTESI);

  const girisimlerSonuc: any[] = [];
  const bugunkuToplamlar: Record<string, number> = {};
  const taramalar: TaramaSonucu[] = [];

  for (const k of AKTIF_KAMPANYALAR) {
    console.log(`- Taranıyor: ${k.ad} (${k.platform})...`);
    let toplanan = 0;
    let durum = k.sabitDurum || 'Aktif';
    let tarandiHata = false;

    try {
      const okuyucu = OKUYUCULAR[k.platform];
      if (!okuyucu) throw new Error(`${k.platform}: bu platform için okuyucu yok`);
      const detay = okuyucu.detay(await detayGetir(okuyucu, k.url));
      // Tutar okunamadıysa 0 yazmak yerine hata ver: bot dünkü değeri korur.
      if (detay.toplanan === null) throw new Error(`${k.platform}: toplanan tutar sayfada bulunamadı`);
      toplanan = detay.toplanan;
      if (!k.sabitDurum) {
        durum = detay.bitti ? 'SONA ERDİ' : detay.sonGun ? 'SON GÜN' : detay.kalanGun !== null ? `son ${detay.kalanGun} gün` : 'Aktif';
      }
    } catch (err: any) {
      console.warn(`  ! Hata (${k.ad}):`, err.message);
      tarandiHata = true;
      // Hata durumunda dünkü referansı koru
      toplanan = referans.girisimler[k.ad] || 0;
    }

    bugunkuToplamlar[k.ad] = toplanan;

    // Dünkü referansa göre bugünkü artış
    const dunkuAlinan = referans.girisimler[k.ad] ?? toplanan;
    const bugunArtis = Math.max(0, toplanan - dunkuAlinan);

    // Kalan ve Yüzde hesabı
    const kalan = k.tamamlandi || toplanan >= k.hedefFon ? null : Math.max(0, k.hedefFon - toplanan);
    const yuzde = hedefeOran(toplanan, k.hedefFon);

    girisimlerSonuc.push({
      ad: k.ad,
      platform: k.platform,
      bugun: bugunArtis,
      alinan: toplanan,
      kalan,
      degerleme: k.degerleme,
      yuzde,
      durum: k.sabitDurum || durum,
      url: k.url,
    });

    taramalar.push({
      ad: k.ad,
      platform: k.platform,
      url: k.url,
      toplanan,
      durum: k.sabitDurum || durum,
      hata: tarandiHata,
      hedef: k.hedefFon,
      degerleme: k.degerleme,
      tamamlandi: k.tamamlandi,
    });

    // Güvenlik & İnsansı Gecikme: Siteleri bombardımana tutmamak için rastgele 1.2 - 2.8 sn bekle
    await rastgeleBekle();
  }

  // Platform bazlı döküm hesapla
  const platformGruplari: Record<string, { toplam: number; girisimSayisi: number }> = {};
  let bugunGenelToplam = 0;
  let genelToplam = 0;

  for (const g of girisimlerSonuc) {
    bugunGenelToplam += g.bugun;
    genelToplam += g.alinan;

    if (!platformGruplari[g.platform]) {
      platformGruplari[g.platform] = { toplam: 0, girisimSayisi: 0 };
    }
    platformGruplari[g.platform].toplam += g.alinan;
    platformGruplari[g.platform].girisimSayisi += 1;
  }

  const platformListesi = Object.entries(platformGruplari).map(([platAd, veri]) => {
    const ayar = PLATFORM_AYARLARI[platAd] || { ad: platAd, renk: '#888888' };
    return {
      ad: ayar.ad,
      toplam: veri.toplam,
      girisim: veri.girisimSayisi,
      renk: ayar.renk,
      url: ayar.url,
    };
  });

  // Sıralama: toplam tutara göre büyükten küçüğe
  platformListesi.sort((a, b) => b.toplam - a.toplam);

  // MKK verisi
  console.log('- MKK (VAP) verisi taranıyor...');
  const mkk = await scrapeMkk(mkkSonBilinen());

  // Bülten sayısı ve tarih
  const tarih = getTrTarih();
  const sayi = getBultenSayisi();

  // KURAL: Eğer bir girişim aktif girişimler satırına taşındıysa ön talep/yakında listesinden otomatik çıkarılır
  const filtrelenmisYakinda = YAKINDA_LISTESI.filter(
    (y) => !girisimlerSonuc.some((g) => g.ad.trim().toLowerCase() === y.ad.trim().toLowerCase())
  );

  // TypeScript dosyası çıktısı oluştur
  const bultenTsIcerik = `/**
 * Günlük kitle fonlama bülteni verisi ("Bugün" tablosu).
 * Otomatik Bot tarafından oluşturulmuştur.
 * Son güncelleme: ${new Date().toISOString()}
 */
export interface Girisim {
  ad: string;
  platform: string;
  bugun: number;
  alinan: number;
  /** Kalan tutar; fonlandıysa null */
  kalan: number | null;
  degerleme: number;
  yuzde: number;
  /** "SONA ERDİ", "son 26 gün", "SON GÜN", "ÖN TALEP" ... */
  durum: string;
  url?: string;
}

export interface Platform {
  ad: string;
  toplam: number;
  girisim: number;
  renk: string;
  url?: string;
}

export interface Yakinda {
  ad: string;
  platform: string;
  url?: string;
}

export const BULTEN = {
  tarih: '${tarih}',
  sayi: ${sayi},
  girisimler: ${JSON.stringify(girisimlerSonuc, null, 4)} as Girisim[],
  platformlar: {
    bugun: ${bugunGenelToplam},
    toplam: ${genelToplam},
    liste: ${JSON.stringify(platformListesi, null, 4)} as Platform[],
  },
  yakinda: ${JSON.stringify(filtrelenmisYakinda, null, 4)} as Yakinda[],
  mkk: ${JSON.stringify(mkk ?? {}, null, 4)},
};
`;

  const hedefBultenPath = path.join(rootDir, 'src', 'data', 'bulten.ts');
  // Yalnız veri değişince yaz (ücretsiz plan denetimi B1, 21 Ekim): zaman damgası her çalışmada değiştiği için
  // saatlik canlı turların %68'i yalnız bu satır yüzünden commit atıp tam yayın tetikliyordu.
  const damgasiz = (s: string) => s.replace(/^ \* Son güncelleme: .*$/m, '');
  const eskiIcerik = fs.existsSync(hedefBultenPath) ? fs.readFileSync(hedefBultenPath, 'utf8') : '';
  if (damgasiz(eskiIcerik) === damgasiz(bultenTsIcerik)) {
    console.log(`[BÜLTEN BOTU] = bulten.ts değişmedi (yalnız zaman damgası farklı); yazılmadı.`);
  } else {
    fs.writeFileSync(hedefBultenPath, bultenTsIcerik, 'utf8');
    console.log(`[BÜLTEN BOTU] ✓ bulten.ts güncellendi!`);
  }

  // Eğer 18:00 Kapanış moduysa, bugünkü rakamları referans olarak kaydet (yarın için)
  if (isKapanis) {
    // Günlük arşiv kaydı: başarısızlık referans yazımını/kapanışı engellemez
    try {
      const arsivDizin = path.join(rootDir, 'src', 'data', 'arsiv');
      const tarihIso = trBugunIso();
      const oncekiKayit = sonKaydiBul(arsivDizin, tarihIso);
      const yol = kaydiYaz(
        arsivDizin,
        arsivKaydiOlustur({
          tarih: tarihIso,
          sayi,
          taramalar,
          referans: referans.girisimler,
          oncekiKayit,
          platformAyarlari: PLATFORM_AYARLARI,
        })
      );
      console.log(`[BÜLTEN BOTU] ✓ Arşiv kaydı yazıldı: ${yol}`);
    } catch (err: any) {
      console.warn('[BÜLTEN BOTU] ! Arşiv kaydı yazılamadı:', err.message);
    }

    // MKK: yalnız canlı okunan değer referansa girer; bayatsa dünkü referans korunur (yarınki yedek).
    const mkkCanli = mkk && !mkk.bayat ? { platform: mkk.platform, sirket: mkk.sirket, yatirimci: mkk.yatirimci, fon: mkk.fon } : referans.mkk;
    const yeniReferans = {
      tarih,
      sayi,
      girisimler: bugunkuToplamlar,
      ...(mkkCanli ? { mkk: mkkCanli } : {}),
    };
    fs.writeFileSync(referansPath, JSON.stringify(yeniReferans, null, 2), 'utf8');
    console.log(`[BÜLTEN BOTU] ✓ Yeni referans tablosu mühürlendi (bulten-referans.json).`);
  }
}

main().catch((e) => {
  console.error('[BÜLTEN BOTU] Kritik Hata:', e);
  process.exit(1);
});
