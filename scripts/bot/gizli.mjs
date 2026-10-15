// Haber kaynaklarının listesi ve izi repoda açık durmaz: AES-256-GCM ile şifrelenir (repo herkese açık).
// Anahtar KAYNAK_ANAHTARI ortam değişkenindedir (GitHub Secret; yerelde kök dizindeki .env).
// Anahtar yoksa liste boş döner: testler ve site derlemesi anahtarsız çalışır; bot ise anahtarsız çalışmaz.
//
// Kullanım:
//   node scripts/bot/gizli.mjs anahtar          yeni anahtar üretir (.env ve GitHub Secret'a konur)
//   node scripts/bot/gizli.mjs ac               şifreli listeyi gizli-kaynaklar.json'a açar (git'e girmez)
//   node scripts/bot/gizli.mjs kapat            gizli-kaynaklar.json'u şifreleyip .sifreli dosyasına yazar
//   node scripts/bot/gizli.mjs iz <haber.md>    bir haberin şifreli kaynak izini gösterir
import path from 'node:path';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { createCipheriv, createDecipheriv, createHmac, randomBytes } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const HER = path.dirname(fileURLToPath(import.meta.url));
const ROT = path.resolve(HER, '../..');
export const SIFRELI_DOSYA = path.join(HER, 'gizli-kaynaklar.sifreli');
export const ACIK_DOSYA = path.join(HER, 'gizli-kaynaklar.json');
const SURUM = 'v1';

let onbellek;
let testAnahtari = false;
function anahtar() {
  if (onbellek !== undefined) return onbellek;
  if (!process.env.KAYNAK_ANAHTARI && existsSync(path.join(ROT, '.env'))) {
    try {
      process.loadEnvFile(path.join(ROT, '.env'));
    } catch {
      // .env okunamazsa anahtarsız devam
    }
  }
  const ham = process.env.KAYNAK_ANAHTARI;
  if (!ham) {
    // node --test altında anahtar yoksa (CI) sabit test anahtarı: kimlik ve özetler hesaplanır, şifreli liste okunmaz.
    if (process.env.NODE_TEST_CONTEXT) {
      testAnahtari = true;
      return (onbellek = Buffer.alloc(32, 7));
    }
    return (onbellek = null);
  }
  const a = Buffer.from(ham, 'base64');
  if (a.length !== 32) throw new Error('KAYNAK_ANAHTARI 32 baytlık base64 olmalı (node scripts/bot/gizli.mjs anahtar)');
  return (onbellek = a);
}

export const anahtarVar = () => anahtar() !== null;

// Herhangi bir JSON değerini "v1.<iv>.<şifreli+etiket>" metnine çevirir.
export function sifrele(deger, a = anahtar()) {
  if (!a) throw new Error('KAYNAK_ANAHTARI yok; şifrelenemez');
  const iv = randomBytes(12);
  const c = createCipheriv('aes-256-gcm', a, iv);
  const govde = Buffer.concat([c.update(JSON.stringify(deger), 'utf8'), c.final(), c.getAuthTag()]);
  return `${SURUM}.${iv.toString('base64')}.${govde.toString('base64')}`;
}

export function coz(metin, a = anahtar()) {
  if (!a) throw new Error('KAYNAK_ANAHTARI yok; çözülemez');
  const [surum, iv, govde] = String(metin).trim().split('.');
  if (surum !== SURUM || !iv || !govde) throw new Error('şifreli metin biçimi tanınmadı');
  const b = Buffer.from(govde, 'base64');
  const d = createDecipheriv('aes-256-gcm', a, Buffer.from(iv, 'base64'));
  d.setAuthTag(b.subarray(b.length - 16));
  return JSON.parse(Buffer.concat([d.update(b.subarray(0, b.length - 16)), d.final()]).toString('utf8'));
}

// Anahtarlı özet: aynı girdi hep aynı 16 haneli kimliği verir; anahtar bilinmeden girdi tahmin edilip doğrulanamaz
// (anahtarsız SHA-256'da akıştaki adresler hash'lenip durum dosyasıyla karşılaştırılabilirdi).
export function ozet(metin, a = anahtar()) {
  if (!a) throw new Error('KAYNAK_ANAHTARI yok; özet çıkarılamaz');
  return createHmac('sha256', a).update(String(metin)).digest('hex').slice(0, 16);
}

// Durum dosyasındaki kimlik: açık metin ("kisa:adres", "haber:slug") anahtarlı özete çevrilir, zaten özet olan
// (16 hane onaltılık) olduğu gibi kalır. Yükleme ve çalışma anında aynı fonksiyon kullanılır.
// Anahtar yalnızca { a } seçeneğiyle verilir: dizi.map(gizliId) sıra numarasını anahtar sanmasın.
export const gizliId = (metin, secenek) => {
  if (!metin) return '';
  const s = String(metin);
  return /^[a-f0-9]{16}$/.test(s) ? s : ozet(s, secenek?.a ?? anahtar());
};

// Kaynağın loglarda adı ve kısa adı yerine geçen kısa kod.
export const kaynakKodu = (kisa, a = anahtar()) => `k${ozet(`kod:${kisa}`, a).slice(0, 6)}`;

// Haberin kaynaklarını ({ ad, url } listesi) frontmatter'a girecek şifreli metne çevirir.
// Kaynak yoksa ya da anahtar yoksa undefined: alan hiç yazılmaz.
export function kaynakIzi(liste) {
  const tekil = [];
  for (const k of liste ?? []) if (k?.url && !tekil.some((x) => x.url === k.url)) tekil.push({ ad: k.ad, url: k.url });
  return tekil.length && anahtarVar() ? sifrele(tekil) : undefined;
}

// Hata mesajındaki adresleri siler: açık Actions loglarına ve durum dosyasına kaynak adresi düşmesin.
export const adresiSil = (mesaj) => String(mesaj).replace(/https?:\/\/\S+/gi, '[adres]');

// { kaynaklar: [{ ad, kisa, akis, sayfa?, bitis?, yerli?, adlar? }], medya: [ad] }
// medya: haber metninde anılmaması gereken ek yayın adları (yerel.mjs → MEDYA).
// Anahtar varken dosya yoksa ya da çözülemezse hata atılır: bot kaynaksız kalıp sessizce boş çalışmasın.
export function gizliKaynaklar({ dosya = SIFRELI_DOSYA, a = anahtar(), uyar = console.warn } = {}) {
  const bos = { kaynaklar: [], medya: [] };
  if (!a) {
    uyar('UYARI: KAYNAK_ANAHTARI yok; şifreli kaynak listesi okunmadı.');
    return bos;
  }
  if (testAnahtari && dosya === SIFRELI_DOSYA) return bos;
  if (!existsSync(dosya)) throw new Error(`${path.basename(dosya)} yok; kaynak listesi okunamadı.`);
  let v;
  try {
    v = coz(readFileSync(dosya, 'utf8'), a);
  } catch {
    throw new Error(`${path.basename(dosya)} çözülemedi; KAYNAK_ANAHTARI yanlış olabilir.`);
  }
  const kaynaklar = v.kaynaklar ?? [];
  if (!kaynaklar.length) throw new Error(`${path.basename(dosya)} içinde kaynak yok.`);
  return { kaynaklar, medya: v.medya ?? [] };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const [komut, arg] = process.argv.slice(2);
  if (komut === 'anahtar') {
    console.log(randomBytes(32).toString('base64'));
  } else if (komut === 'ac') {
    writeFileSync(ACIK_DOSYA, JSON.stringify(coz(readFileSync(SIFRELI_DOSYA, 'utf8')), null, 2) + '\n');
    console.log(`Açıldı: ${path.relative(ROT, ACIK_DOSYA)} (git'e girmez; düzenleyip "kapat" çalıştırın)`);
  } else if (komut === 'kapat') {
    writeFileSync(SIFRELI_DOSYA, sifrele(JSON.parse(readFileSync(ACIK_DOSYA, 'utf8'))) + '\n');
    console.log(`Şifrelendi: ${path.relative(ROT, SIFRELI_DOSYA)}`);
  } else if (komut === 'iz' && arg) {
    const m = readFileSync(arg, 'utf8').match(/^kaynakIzi:\s*"?([^"\r\n]+)"?\r?$/m);
    console.log(m ? JSON.stringify(coz(m[1]), null, 2) : 'Bu haberde kaynak izi yok.');
  } else {
    console.log('Kullanım: node scripts/bot/gizli.mjs anahtar | ac | kapat | iz <haber.md>');
    process.exitCode = 1;
  }
}
