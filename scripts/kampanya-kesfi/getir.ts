import https from 'node:https';
import { execFile } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import { PDF_AYRACI } from '../../src/lib/kampanya-takip.ts';

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
export const rastgeleBekle = (minMs = 1200, maxMs = 2800): Promise<void> => {
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
export async function fetchHtml(url: string, retrySayisi = 2): Promise<string> {
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

const PDF_AZAMI_BAYT = 20 * 1024 * 1024;

/** PDF'i ikili olarak indirir (yönlendirmeleri güvenli adreslerle izler, en çok 20 MB). */
function pdfIndir(url: string, kalanYonlendirme = 3): Promise<Buffer> {
  if (!isSafeUrl(url)) return Promise.reject(new Error(`Güvensiz veya geçersiz URL: ${url}`));
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers: { ...DEFAULT_HEADERS, Accept: 'application/pdf,*/*;q=0.8' } }, (res) => {
      const kod = res.statusCode ?? 0;
      if (kod >= 300 && kod < 400 && res.headers.location) {
        res.resume();
        if (kalanYonlendirme <= 0) return reject(new Error(`Çok fazla yönlendirme (${url})`));
        pdfIndir(new URL(res.headers.location, url).toString(), kalanYonlendirme - 1).then(resolve, reject);
        return;
      }
      if (kod < 200 || kod >= 400) {
        res.resume();
        return reject(new Error(`HTTP ${kod} (${url})`));
      }
      const parcalar: Buffer[] = [];
      let boy = 0;
      res.on('data', (p: Buffer) => {
        boy += p.length;
        if (boy > PDF_AZAMI_BAYT) {
          req.destroy();
          reject(new Error(`PDF çok büyük (${url})`));
          return;
        }
        parcalar.push(p);
      });
      res.on('end', () => resolve(Buffer.concat(parcalar)));
    });
    req.on('error', reject);
    req.setTimeout(30000, () => {
      req.destroy();
      reject(new Error(`Zaman aşımı (${url})`));
    });
  });
}

/**
 * PDF içeriğini `pdftotext` aracıyla UTF-8 metne çevirir (yeni npm bağımlılığı yok; araç sistemde olmalı).
 * PDF geçici bir dosyaya yazılır: poppler stdin okur ama xpdf sürümü okumaz, dosya ikisinde de çalışır.
 */
export async function pdfMetneCevir(pdf: Buffer, komut = 'pdftotext'): Promise<string> {
  const dizin = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'kesif-pdf-'));
  const dosya = path.join(dizin, 'form.pdf');
  try {
    await fs.promises.writeFile(dosya, pdf);
    const { stdout } = await execFileAsync(komut, ['-enc', 'UTF-8', dosya, '-'], {
      maxBuffer: 20 * 1024 * 1024,
      timeout: 30000,
      encoding: 'utf8',
    });
    return stdout;
  } catch (e: any) {
    throw new Error(`PDF metne çevrilemedi (${komut}): ${String(e?.message ?? e).slice(0, 200)}`);
  } finally {
    await fs.promises.rm(dizin, { recursive: true, force: true });
  }
}

/** PDF adresini indirip metne çevirir. */
export async function pdfMetni(url: string): Promise<string> {
  return pdfMetneCevir(await pdfIndir(url));
}

const PDF_MI = (url: string) => {
  try {
    return /\.pdf$/i.test(new URL(url).pathname);
  } catch {
    return false;
  }
};

/** Zincirde en çok kaç sayfa daha izlenir (sonsuz döngüye karşı). */
const ZINCIR_ADIM = 3;

/**
 * Bir kampanyanın ana sayfasını ve okuyucunun istediği ek sayfaları sırayla (aralarında rastgele bekleyerek)
 * getirir; HTML'leri "\n" ile birleştirir. Ek sayfa açılmazsa yalnız ana sayfa döner; ana sayfa açılmazsa fırlatır.
 * Okuyucunun sonrakiSayfa'sı varsa ardından zinciri izler: her adımda son getirilen sayfadan sıradaki adresi ister.
 * PDF adresleri metne çevrilip başına PDF_AYRACI konur. Zincir bir adımda koparsa o ana kadar getirilenler döner.
 */
export async function detayGetir(
  okuyucu: { ekSayfalar?(url: string): string[]; sonrakiSayfa?(html: string, url: string): string | null },
  url: string,
  getirFn: (url: string) => Promise<string> = fetchHtml,
  bekleFn: () => Promise<void> = rastgeleBekle,
  pdfFn: (url: string) => Promise<string> = pdfMetni,
): Promise<string> {
  const ana = await getirFn(url);
  const ekler = okuyucu.ekSayfalar?.(url) ?? [];
  const parcalar = [ana];
  try {
    for (const ek of ekler) {
      await bekleFn();
      parcalar.push(await getirFn(ek));
    }
  } catch (e: any) {
    console.log(`  ! Ek sayfa getirilemedi (${url}): ${e?.message ?? e}; yalnız ana sayfa kullanılacak.`);
    return ana;
  }

  if (okuyucu.sonrakiSayfa) {
    let sonHtml = ana;
    let sonUrl = url;
    for (let adim = 0; adim < ZINCIR_ADIM; adim++) {
      const sonraki = okuyucu.sonrakiSayfa(sonHtml, sonUrl);
      if (!sonraki) break;
      try {
        await bekleFn();
        const pdf = PDF_MI(sonraki);
        const icerik = pdf ? await pdfFn(sonraki) : await getirFn(sonraki);
        parcalar.push(pdf ? PDF_AYRACI + icerik : icerik);
        sonHtml = icerik;
        sonUrl = sonraki;
      } catch (e: any) {
        console.log(`  ! Zincirdeki sayfa getirilemedi (${sonraki}): ${e?.message ?? e}; o ana kadar getirilenler kullanılacak.`);
        break;
      }
    }
  }
  return parcalar.join('\n');
}
