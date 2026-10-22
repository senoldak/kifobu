// kifobu haber botu: Türkiye'deki kitle fonlama ve girişim yatırımı haberlerinin (ve az sayıda küresel kaynağın)
// akışlarını okur, son 72 saatte yazılmış olayları düşürür (tekrar.mjs), aynı olayı anlatan haberleri gruplar,
// başlıklardan kifobu'ya uymayanları ayıklar, kalanları yapay zekâyla yeniden yazar, kaynaklarla karşılaştırır
// ve src/content/haberler altına kaydeder.
// Denetimden geçemeyen haber yayımlanmaz ve taslak da açılmaz (elle kontrol gerekmesin, 2026-10-11).
// GitHub Actions'ta çalışır (.github/workflows/bot.yml).
//
// Yerelde:  GEMINI_API_KEY=... node scripts/bot/calistir.mjs
// Kuru çalışma (hiçbir şey yazmaz; grupları ve teyit durumunu listeler):  node scripts/bot/calistir.mjs --kuru
//
// Ortam değişkenleri: KAYNAK_ANAHTARI (zorunlu; şifreli kaynak listesi ve kimlikler, bkz. gizli.mjs), GEMINI_API_KEY (zorunlu), GEMINI_MODEL, EN_FAZLA (çalışma başına haber, varsayılan 12),
// TEYIT (kaç farklı sitede yer almalı, varsayılan 1), YAS_GUN (en fazla kaç günlük haber, varsayılan 3),
// SURE_DK (yeni habere başlamak için dakika bütçesi, varsayılan 18; iş akışının zaman aşımı 40 dk).
import { writeFile, appendFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { KAYNAKLAR } from './kaynaklar.mjs';
import { jsonOku } from './lib.mjs';
import { butceYukle, geminiPayiBitti } from './butce.mjs';
import { adresiSil, anahtarVar, gizliId } from './gizli.mjs';
import { medyaGizle } from './yerel.mjs';
import { yayinDurduMu } from './standart.mjs';
import { havuzAc, havuzKapat } from './havuz.mjs';
import { gorulmeyen, uyarlayiciKur, yerelTur } from './uyarlayici.mjs';
import { turSec } from './motor-modu.mjs';

const ROT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const DURUM_DOSYASI = path.join(ROT, 'scripts/bot/gorulen.json');
const KURU = process.argv.includes('--kuru');
// Ortam değişkeni pozitif tam sayı değilse varsayılan kullanılır (yanlış değer sınırları kaldırmasın).
const sayiAyar = (ad, varsayilan) => {
  const n = Number(process.env[ad]);
  return Number.isInteger(n) && n > 0 ? n : varsayilan;
};
const EN_FAZLA = sayiAyar('EN_FAZLA', 12);
// Havuz girişim sitelerinden oluştuğu için tek kaynak yeterli; aynı olay birden çok sitedeyse yine tek haber olur.
const TEYIT = sayiAyar('TEYIT', 1);
const SURE_MS = sayiAyar('SURE_DK', 18) * 60_000;
const BASLANGIC = Date.now();

// Standartlar: acil durdurma. Gemini'ye ilk çağrıdan önce saate sorulur; açıksa tur hiçbir şey yazmadan ve commit etmeden biter.
if (!KURU) {
  const dur = await yayinDurduMu({ url: process.env.MOTOR_URL, anahtar: process.env.MOTOR_ANAHTARI, site: 'kifobu' });
  if (dur.durdu) {
    console.log(`Acil durdurma açık: ${dur.neden}`);
    process.exit(0);
  }
  console.log(`Acil durdurma kontrolü: ${dur.neden}`);
}

// Katman 3 (Gemini kota planı): bu turun Gemini payı; yeni habere başlamadan önce geminiPayiBitti() sorulur.
if (!KURU) console.log(await butceYukle({ url: process.env.MOTOR_URL, anahtar: process.env.MOTOR_ANAHTARI, site: 'kifobu' }));
const YAS_GUN = sayiAyar('YAS_GUN', 3);

// Actions logları herkese açık: kaynak başlıkları yayın adını içerebilir, hata mesajları adres taşıyabilir.
// Bütün modüllerin log satırlarında yayın adları "[yayın]", adresler "[adres]" olur.
for (const tur of ['log', 'warn', 'error']) {
  const asil = console[tur].bind(console);
  console[tur] = (...x) => asil(...x.map((p) => (typeof p === 'string' ? medyaGizle(adresiSil(p)) : p)));
}

// Kaynak listesi şifreli; anahtarsız bot hiçbir akış okuyamaz ve kimlikleri hesaplayamaz (bkz. gizli.mjs).
if (!anahtarVar()) {
  console.error('KAYNAK_ANAHTARI yok; şifreli kaynak listesi okunamaz. Yerelde kök dizindeki .env dosyasına ekleyin.');
  process.exit(1);
}
if (!KAYNAKLAR.length) {
  console.error('Kaynak listesi boş.');
  process.exit(1);
}

// Durum dosyasında kaynak adı ve adresi açık durmaz (repo herkese açık): bütün kimlikler anahtarlı özettir (gizliId).
// Yükleme anında açık kalmış eski anahtarlar ("kisa:adres", "haber:slug") özete çevrilir; çift ve grup anahtarları
// çalışma anında da aynı fonksiyonlarla kurulur (ciftAnahtar, grupAnahtar).
const ciftAnahtar = (a, b) => [a, b].map(gizliId).sort().join('|');
const grupKimligi = (ids) => ids.map(gizliId).sort().join('+');
const durum = await jsonOku(DURUM_DOSYASI, { gorulen: {}, hatalar: {}, kaynaklar: {} });
durum.gorulen = Object.fromEntries(Object.entries(durum.gorulen || {}).map(([k, v]) => [gizliId(k), v]));
durum.ayrik = Object.fromEntries(Object.entries(durum.ayrik || {}).map(([k, v]) => [ciftAnahtar(...k.split('|')), v]));
durum.ayni = Object.fromEntries(Object.entries(durum.ayni || {}).map(([k, v]) => [ciftAnahtar(...k.split('|')), v]));
durum.puan = Object.fromEntries(Object.entries(durum.puan || {}).map(([k, v]) => [grupKimligi(k.split('+')), v]));
durum.hatalar = Object.fromEntries(
  Object.entries(durum.hatalar || {}).map(([k, v]) => [gizliId(k), v?.mesaj ? { ...v, mesaj: adresiSil(v.mesaj) } : v]),
);
if (durum.kimlik !== 'hmac-v1' && Object.keys(durum.gorulen).length) {
  console.warn('UYARI: durum dosyası taşınmamış (kimlik: hmac-v1 yok); eski anahtarsız kimlikler eşleşmez, görülen haberler yeniden aday olabilir.');
}
// Şeffaflık sayfası için taranan her aday (gorulen yalnız karar verilenleri tutar), 30 gün: kimlik → { zaman, kod, yerli }.
// kod kaynağın kısa kodudur (kaynakKodu); kaynak adı ve adresi yazılmaz.
durum.taranan ??= {};
const simdi = new Date();

// Akış gövdesi uyarlayıcıdadır (uyarlayici.mjs); burası giriş noktası: durum, kuru çalışma, tur, durum yazımı, özet.
// Uzunluk yüzünden yayımlanmayan, eş bekleyen kısa haberler (havuz.mjs); kayıt başına şifreli, burada açılır, yazarken kapanır.
durum.havuz = havuzAc(durum.havuz ?? []);
const uyarlayici = uyarlayiciKur({
  rot: ROT,
  durum,
  simdi,
  ayar: { enFazla: EN_FAZLA, teyit: TEYIT, yasGun: YAS_GUN, sureMs: SURE_MS, baslangic: BASLANGIC },
});

if (KURU) {
  await uyarlayici.kuru(gorulmeyen(await uyarlayici.adaylar(), durum), { hepsi: process.argv.includes('--hepsi') });
  process.exit(0);
}

if (!process.env.GEMINI_API_KEY) {
  console.warn('GEMINI_API_KEY yok; haber yazılamaz. Adaylar bir sonraki çalışmada tekrar denenecek.');
}

// MOTOR_TUR=1: tur ortak motorla (MOTOR_DIZIN), aksi hâlde yerel tur. Yerelde turu durduran ayar hatası (anahtar ya da model)
// ozet.hata'ya yazılır, durum kaydedilir ve süreç normal biter. Motor modunda hata yerel tura düşmez; durum yine yazılır
// (yerel durum kaybolmasın) ve süreç sonunda hata koduyla çıkar.
let turHatasi = null;
try {
  await turSec({
    env: process.env,
    uyarlayici,
    durum,
    simdi,
    rot: ROT,
    yerel: yerelTur,
    // Motor surVar'ı varsayılan olarak hep true sayar; süre bütçesi ve Gemini tur payı burada verilir.
    surVar: () => Date.now() - BASLANGIC <= SURE_MS && !geminiPayiBitti(),
  });
} catch (e) {
  turHatasi = e;
  console.error(`Tur hatayla bitti: ${adresiSil(e?.message ?? e)}`);
}
const { ozet } = uyarlayici;

// ── Durum ve özet ──────────────────────────────────────────────────────
// 30 günden eski kayıtlar silinir (yaş sınırı yüzünden o kadar eski haber zaten aday olmaz).
for (const kayit of [durum.gorulen, durum.ayrik, durum.ayni]) for (const [id, t] of Object.entries(kayit)) if (simdi - new Date(t) > 30 * 86_400_000) delete kayit[id];
for (const [id, v] of Object.entries(durum.taranan)) if (simdi - new Date(v.zaman) > 30 * 86_400_000) delete durum.taranan[id];
// Puanlar yalnızca aday yaşı boyunca gerekir.
for (const [k, v] of Object.entries(durum.puan)) if (simdi - new Date(v.zaman) > (YAS_GUN + 1) * 86_400_000) delete durum.puan[k];
// Kimlikler anahtarlı özet (gizliId); eski anahtarsız hash'lerden taşıma yapıldığının işareti.
durum.kimlik = 'hmac-v1';
durum.havuz = havuzKapat(durum.havuz);

await writeFile(DURUM_DOSYASI, `${JSON.stringify(durum, null, 2)}\n`, 'utf8');

const sayi = ozet.yazilan.length;
console.log(`\nYazılan: ${ozet.yazilan.length}, denetimden geçemeyen: ${ozet.elenen.length}, atlanan: ${ozet.atlanan.length}, hata: ${ozet.hata.length}`);
if (process.env.GITHUB_OUTPUT) await appendFile(process.env.GITHUB_OUTPUT, `sayi=${sayi}\n`);
if (process.env.GITHUB_STEP_SUMMARY) {
  const liste = (b, x) => (x.length ? `\n### ${b}\n${x.map((s) => `- ${s}`).join('\n')}\n` : '');
  await appendFile(
    process.env.GITHUB_STEP_SUMMARY,
    medyaGizle(adresiSil(`## kifobu botu\n${liste('Yayımlandı', ozet.yazilan)}${liste('Denetimden geçemedi (yayımlanmadı)', ozet.elenen)}${liste('Atlandı', ozet.atlanan)}${liste('Hata', ozet.hata)}`)),
  );
}

if (turHatasi) process.exitCode = 1;
