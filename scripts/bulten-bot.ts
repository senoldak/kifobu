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
let referans = {
  tarih: '10 Ekim 2026',
  sayi: 1523,
  girisimler: {} as Record<string, number>,
};
if (fs.existsSync(referansPath)) {
  try {
    referans = JSON.parse(fs.readFileSync(referansPath, 'utf8'));
  } catch (e) {
    console.error('Referans dosyası okunamadı, varsayılan kullanılacak:', e);
  }
}

import https from 'node:https';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { arsivKaydiOlustur } from '../src/lib/arsiv/kayit.ts';
import type { TaramaSonucu } from '../src/lib/arsiv/kayit.ts';
import { sonKaydiBul, kaydiYaz } from '../src/lib/arsiv/dosya.ts';
import { yayinDurduMu } from './bot/standart.mjs';

const execFileAsync = promisify(execFile);

/** Güvenlik: SSRF ve zararlı protokolleri engelleyen URL doğrulayıcı */
function isSafeUrl(rawUrl: string): boolean {
  try {
    const parsed = new URL(rawUrl);
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return false;
    const hostname = parsed.hostname.toLowerCase();
    // Loopback, link-local, cloud metadata ve yerel ağ adreslerini engelle
    if (
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname === '::1' ||
      hostname === '169.254.169.254' ||
      hostname.endsWith('.internal') ||
      hostname.endsWith('.local')
    ) {
      return false;
    }
    // IPv4 özel ağ kontrolü (10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16, 127.0.0.0/8, 169.254.0.0/16)
    const ipMatch = hostname.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/);
    if (ipMatch) {
      const b1 = Number(ipMatch[1]);
      const b2 = Number(ipMatch[2]);
      if (b1 === 0 || b1 === 10 || b1 === 127) return false;
      if (b1 === 169 && b2 === 254) return false;
      if (b1 === 192 && b2 === 168) return false;
      if (b1 === 172 && b2 >= 16 && b2 <= 31) return false;
    }
    return true;
  } catch {
    return false;
  }
}

// Güvenlik & İnsansı Davranış: Bekleme fonksiyonu
const uyut = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const rastgeleBekle = (minMs = 1200, maxMs = 2800) => {
  const sure = Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
  return uyut(sure);
};

const DEFAULT_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
  'Accept-Language': 'tr-TR,tr;q=0.9,en-US;q=0.8',
  'Sec-Fetch-Dest': 'document',
  'Sec-Fetch-Mode': 'navigate',
  'Sec-Fetch-Site': 'none',
  'Upgrade-Insecure-Requests': '1',
};

async function fetchWithCurl(url: string): Promise<string> {
  if (!isSafeUrl(url)) {
    throw new Error(`Güvensiz veya geçersiz URL: ${url}`);
  }
  const curlCmd = process.platform === 'win32' ? 'curl.exe' : 'curl';
  const { stdout } = await execFileAsync(curlCmd, [
    '-s',
    '-L',
    '--proto', '=http,https',
    '--proto-redir', '=http,https',
    '--max-time', '20',
    '--compressed',
    '-A',
    DEFAULT_HEADERS['User-Agent'],
    '--',
    url,
  ], { maxBuffer: 10 * 1024 * 1024 });
  return stdout;
}

/** Güvenli fetch: Node HTTPS -> Hata olursa Retry -> Curl fallback */
async function fetchHtml(url: string, retrySayisi = 2): Promise<string> {
  if (!isSafeUrl(url)) {
    throw new Error(`Güvensiz veya geçersiz URL: ${url}`);
  }
  for (let deneme = 1; deneme <= retrySayisi; deneme++) {
    try {
      return await new Promise((resolve, reject) => {
        const req = https.get(url, { headers: DEFAULT_HEADERS }, (res) => {
          if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
            const nextUrl = new URL(res.headers.location, url).toString();
            if (!isSafeUrl(nextUrl)) {
              reject(new Error(`Güvensiz yönlendirme URL'si: ${nextUrl}`));
              return;
            }
            fetchHtml(nextUrl, retrySayisi).then(resolve).catch(reject);
            return;
          }
          if (res.statusCode && (res.statusCode < 200 || res.statusCode >= 400)) {
            reject(new Error(`HTTP ${res.statusCode} (${url})`));
            return;
          }
          let data = '';
          res.on('data', (chunk) => (data += chunk));
          res.on('end', () => resolve(data));
        });
        req.on('error', reject);
        req.setTimeout(12000, () => {
          req.destroy();
          reject(new Error(`Zaman aşımı (${url})`));
        });
      });
    } catch (err: any) {
      if (deneme < retrySayisi) {
        console.warn(`  ! Geçici bağlantı hatası (${url}): ${err.message}. Yeniden deneniyor (${deneme}/${retrySayisi})...`);
        await uyut(2000 * deneme);
      } else {
        // Son çare curl fallback
        try {
          return await fetchWithCurl(url);
        } catch (curlErr: any) {
          throw new Error(`Sayfa çekilemedi (${url}): ${err.message} / curl: ${curlErr.message}`);
        }
      }
    }
  }
  throw new Error(`Sayfa çekilemedi (${url})`);
}

/** Sayı temizleme: "2.532.200 TL" -> 2532200 */
function temizleSayi(str: string): number {
  if (!str) return 0;
  const temiz = str.replace(/[^\d]/g, '');
  return parseInt(temiz, 10) || 0;
}

/** Ecofolio kampanya verisi */
async function scrapeEcofolio(url: string) {
  const html = await fetchHtml(url);
  const toplananMatch = html.match(/Toplanan Talep<\/div><div[^>]*>([0-9.,]+)<!-- -->\s*TL/i);
  const gunMatch = html.match(/Son\s*(\d+)\s*G[uü]n/i);
  const durum = gunMatch ? `son ${gunMatch[1]} gün` : 'Aktif';
  const toplanan = toplananMatch ? temizleSayi(toplananMatch[1]) : 0;
  return { toplanan, durum };
}

/** Fonangels kampanya verisi */
async function scrapeFonangels(url: string, pid?: string) {
  const html = await fetchHtml(url);
  // Toplam Yatırım: &#x20BA;2.532.200 veya ₺2.532.200
  const yatirimMatch = html.match(/Toplam Yat[^<]*:<\/th>\s*<th[^>]*>[\s\S]*?(?:&#x20BA;|₺|\b)\s*([\d\.,]+)/i);
  let durum = 'Aktif';

  // Kalan süre için ana sayfadaki kartlara da bakabiliriz
  try {
    const listHtml = await fetchHtml('https://fonangels.com/kampanyalar');
    const paramPid = pid || (url.match(/pid=(\d+)/) ? url.match(/pid=(\d+)/)![1] : '');
    if (paramPid) {
      const idx = listHtml.indexOf(`pid=${paramPid}`);
      if (idx !== -1) {
        const snippet = listHtml.substring(Math.max(0, idx - 1200), idx);
        const dayMatch = snippet.match(/Kalan S[^\s:]+:\s*(\d+)\s*G[^\s<]+/i);
        if (dayMatch) {
          durum = `son ${dayMatch[1]} gün`;
        }
      }
    }
  } catch (e) {
    // Liste taranamadıysa varsayılan kalsın
  }

  const toplanan = yatirimMatch ? temizleSayi(yatirimMatch[1]) : 0;
  return { toplanan, durum };
}

/** Trinkfon kampanya verisi */
async function scrapeTrinkfon(url: string) {
  const html = await fetchHtml(url);
  // Alınan: 24.282 ₺
  const alinanMatch = html.match(/Alınan:[\s\S]*?([0-9.,]+)\s*₺/i);
  // Kalan gün veya SON GÜN
  let durum = 'Aktif';
  if (html.includes('SON GÜN') || html.includes('Son Gün')) {
    durum = 'SON GÜN';
  } else {
    const gunMatch = html.match(/(\d+)\s*g[uü]n\s*kald/i);
    if (gunMatch) durum = `son ${gunMatch[1]} gün`;
  }
  const toplanan = alinanMatch ? temizleSayi(alinanMatch[1]) : 0;
  return { toplanan, durum };
}

/** VAP (MKK) istatistikleri */
async function scrapeMkk() {
  try {
    const html = await fetchHtml('https://www.vap.org.tr/');
    const platMatch = html.match(/Platform Sayısı[\s\S]*?<span class="val fBig">\s*(\d+)/i);
    const sirketMatch = html.match(/Kaydileşen Şirket Sayısı[\s\S]*?<span class="val fBig">\s*(\d+)/i);
    const yatirimciMatch = html.match(/Kaydileşen Şirketlerin Yatırımcı Sayısı[\s\S]*?<span class="val fBig">\s*([\d\.]+)/i);
    const fonMatch = html.match(/Başarılı Fonlama Tutarı[\s\S]*?<span class="val fBig">\s*([^<]+)<\/span>\s*<span class="val fNormal">\s*([^<]+)/i);

    return {
      platform: platMatch ? parseInt(platMatch[1], 10) : 18,
      sirket: sirketMatch ? parseInt(sirketMatch[1], 10) : 179,
      yatirimci: yatirimciMatch ? parseInt(yatirimciMatch[1].replace(/\./g, ''), 10) : 47163,
      fon: fonMatch ? `${fonMatch[1].trim()} ${fonMatch[2].trim()}` : '₺1,60 Milyar',
    };
  } catch (e) {
    console.error('MKK verisi çekilemedi, yedek kullanılıyor:', e);
    return { platform: 18, yatirimci: 47165, sirket: 179, fon: '₺1,60 Milyar' };
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
  const { AKTIF_KAMPANYALAR, PLATFORM_AYARLARI, YAKINDA_LISTESI } = await import('../src/data/bulten-kaynaklari.ts');

  const girisimlerSonuc: any[] = [];
  const bugunkuToplamlar: Record<string, number> = {};
  const taramalar: TaramaSonucu[] = [];

  for (const k of AKTIF_KAMPANYALAR) {
    console.log(`- Taranıyor: ${k.ad} (${k.platform})...`);
    let toplanan = 0;
    let durum = k.sabitDurum || 'Aktif';
    let tarandiHata = false;

    try {
      if (k.platform === 'ecofolio') {
        const res = await scrapeEcofolio(k.url);
        toplanan = res.toplanan;
        if (!k.sabitDurum) durum = res.durum;
      } else if (k.platform === 'fonangels') {
        const res = await scrapeFonangels(k.url);
        toplanan = res.toplanan;
        if (!k.sabitDurum) durum = res.durum;
      } else if (k.platform === 'trinkfon') {
        const res = await scrapeTrinkfon(k.url);
        toplanan = res.toplanan;
        if (!k.sabitDurum) durum = res.durum;
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
  const mkk = await scrapeMkk();

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
  mkk: ${JSON.stringify(mkk, null, 4)},
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

    const yeniReferans = {
      tarih,
      sayi,
      girisimler: bugunkuToplamlar,
    };
    fs.writeFileSync(referansPath, JSON.stringify(yeniReferans, null, 2), 'utf8');
    console.log(`[BÜLTEN BOTU] ✓ Yeni referans tablosu mühürlendi (bulten-referans.json).`);
  }
}

main().catch((e) => {
  console.error('[BÜLTEN BOTU] Kritik Hata:', e);
  process.exit(1);
});
