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
// SURE_DK (yeni habere başlamak için dakika bütçesi, varsayılan 18; iş akışının zaman aşımı 25 dk).
import { writeFile, appendFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { KAYNAKLAR, anahtarlar, baslikTemiz, benzer, tamMetin } from './kaynaklar.mjs';
import { MIN_DEGER, onbellekliPuanla, taslakYaz, derlemeYaz } from './yazar.mjs';
import { HAFIZA_SAAT, hafizaKur, kayitKur, tekrarBul } from './tekrar.mjs';
import { ciftleriKur, onbellekliEsle, ozelAdlar, uygula } from './esleme.mjs';
import { denetle } from './denetci.mjs';
import { adNorm, haberYaz, hentTekst, istanbulIso, jsonOku, rssOku, sonHaberler } from './lib.mjs';
import { butceYukle, geminiPayiBitti } from './butce.mjs';
import { adresiSil, anahtarVar, gizliId, kaynakIzi } from './gizli.mjs';
import { medyaGizle } from './yerel.mjs';
import { havuzOlayi, havuzAc, havuzKapat, havuzuIsle } from './havuz.mjs';

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

// Katman 3 (Gemini kota planı): bu turun Gemini payı; yeni habere başlamadan önce geminiPayiBitti() sorulur.
if (!KURU) console.log(await butceYukle({ url: process.env.MOTOR_URL, anahtar: process.env.MOTOR_ANAHTARI, site: 'kifobu' }));
const YAS_GUN = sayiAyar('YAS_GUN', 3);
const EN_FAZLA_HATA = 3;
// Kaynak metinlerinin toplamı bundan kısaysa olay yazılmaz (en az 200 kelimelik haber çıkmaz).
const KAYNAK_EN_AZ_KELIME = 180;

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
const gorulduIsaretle = (id) => (durum.gorulen[id] = simdi.toISOString());
// Yazarın "aynı olay değil" dediği haber çiftleri; bir daha aynı gruba konmaz (Gemini'ye tekrar tekrar sorulmasın).
const ayrikMi = (a, b) => Boolean(durum.ayrik[ciftAnahtar(a, b)]);
// Olayın puan anahtarı üyelerinden kurulur; gruba yeni haber katılırsa olay yeniden puanlanır.
const grupAnahtar = (g) => grupKimligi(g.uyeler.map((u) => u.id));

// Daha önce yazılmış olaylar (son 10 gün): başlık benzerliği, aynı girişim ya da (aşağıda) özel ad eşleşmesi.
const yazilmis = await sonHaberler(ROT, 10);
// Mükerrer kalkanı (tekrar.mjs): son HAFIZA_SAAT saatte yayımlanmış haberlerin başlık ve özel adları.
const hafiza = hafizaKur(yazilmis, simdi.valueOf());
// Uzunluk yüzünden yayımlanmayan, eş bekleyen kısa haberler (havuz.mjs); kayıt başına şifreli.
let havuz = havuzAc(durum.havuz ?? []);
const tekrarMi = (baslik, nerede) => {
  const t = tekrarBul(baslik, hafiza);
  if (t) console.log(`zaten yazıldı (${nerede}, son ${HAFIZA_SAAT} saat: ${t.baslik}): ${baslik}`);
  return Boolean(t);
};

// ── 1. Adaylar ─────────────────────────────────────────────────────────
// Görülmemiş ve YAS_GUN'den yeni haberler. Son 72 saatte yazılmış bir olayı anlatanlar görüldü sayılıp düşer. Bu çalışmada sıra gelmeyenler işaretlenmez, sonraki çalışmada
// yeniden denenir; yaş sınırını geçince kendiliğinden düşer.
const adaylar = [];
for (const k of KAYNAKLAR) {
  let ogeler = [];
  try {
    ogeler = rssOku(await hentTekst(k.akis));
  } catch (e) {
    console.warn(`${k.kod}: akış okunamadı (${adresiSil(e.message)})`);
    continue;
  }
  const yeni = ogeler
    .map((o) => ({ ...o, id: gizliId(`${k.kisa}:${o.guid || o.link}`), tarih: new Date(o.pubDate), baslik: baslikTemiz(o.title), kaynak: k }))
    .filter((o) => o.link.startsWith('https://') && !Number.isNaN(o.tarih.valueOf()))
    .filter((o) => simdi - o.tarih <= YAS_GUN * 86_400_000)
    .filter((o) => {
      // Zaman olarak yayın tarihi (gelecekteyse şimdi): ilk turda akışta günlerdir duran adaylar bugüne yığılmasın.
      durum.taranan[o.id] ??= { zaman: new Date(Math.min(o.tarih, simdi)).toISOString(), kod: k.kod, ...(k.yerli && { yerli: true }) };
      return !durum.gorulen[o.id];
    })
    .filter((o) => {
      if (!tekrarMi(o.baslik, 'mükerrer kalkanı')) return true;
      if (!KURU) gorulduIsaretle(o.id);
      return false;
    });
  for (const o of yeni) o.anahtar = anahtarlar(o.baslik);
  console.log(`${k.kod}: ${yeni.length} aday`);
  adaylar.push(...yeni);
}

// ── 2. Gruplama ve teyit ───────────────────────────────────────────────
// Aynı olayı anlatan başlıklar bir gruba girer. Grup, farklı site sayısı TEYIT'e ulaşınca yazılır.
const gruplar = [];
for (const a of adaylar.sort((x, y) => y.tarih - x.tarih)) {
  // Grubun ilk haberiyle karşılaştırılır; zincirleme (A~B, B~C ama A≁C) büyümeyi önler.
  const g = gruplar.find((g) => benzer(g.uyeler[0].anahtar, a.anahtar) && !g.uyeler.some((u) => ayrikMi(u.id, a.id)));
  if (g) g.uyeler.push(a);
  else gruplar.push({ uyeler: [a] });
}
const grupBilgisi = (g) => {
  g.siteler = new Set(g.uyeler.map((u) => u.kaynak.kod));
  g.yerli = g.uyeler.some((u) => u.kaynak.yerli);
  g.tarih = new Date(Math.max(...g.uyeler.map((u) => u.tarih)));
  return g;
};
gruplar.forEach(grupBilgisi);
for (const a of adaylar) a.adlar = ozelAdlar(a.baslik);

// Başlık ve spot birlikte: aynı olay farklı başlıklarla yazılabiliyor.
const yazilmisAnahtar = yazilmis.flatMap((h) => [anahtarlar(h.title), anahtarlar(`${h.title} ${h.description}`)]);
const bilinenGirisimler = new Set(yazilmis.map((h) => adNorm(h.girisim)).filter(Boolean));
const yazildiMi = (g) => g.uyeler.some((u) => yazilmisAnahtar.some((k) => benzer(k, u.anahtar)));

const teyitli = gruplar.filter((g) => g.siteler.size >= TEYIT);
console.log(`
${gruplar.length} olay, ${teyitli.length} tanesi en az ${TEYIT} sitede (${teyitli.filter((g) => g.yerli).length} yerli).`);
const grupBitti = (g) => g.uyeler.forEach((u) => gorulduIsaretle(u.id));

if (KURU) {
  for (const g of gruplar.filter((g) => g.siteler.size >= 2 || process.argv.includes('--hepsi'))) {
    console.log(`
[${g.siteler.size} site]${yazildiMi(g) ? ' (zaten yazıldı)' : ''}`);
    for (const u of g.uyeler) console.log(`  - ${u.kaynak.kod}: ${u.baslik}`);
  }
  process.exit(0);
}

if (!process.env.GEMINI_API_KEY) {
  console.warn('GEMINI_API_KEY yok; haber yazılamaz. Adaylar bir sonraki çalışmada tekrar denenecek.');
}

const ozet = { yazilan: [], elenen: [], atlanan: [], hata: [] };

// ── 3. Ön eleme ────────────────────────────────────────────────────────
// a) Başlık kelimeleri zaten yazılmış bir haberle örtüşen olaylar düşer.
let sira = [];
for (const g of teyitli) {
  if (yazildiMi(g)) {
    console.log(`zaten yazıldı: ${g.uyeler[0].baslik}`);
    grupBitti(g);
  } else sira.push(g);
}

// b) Dilden bağımsız eşleme (esleme.mjs): İngilizce kaynaklı olay yazılmış Türkçe haberle, Türkçe ve İngilizce
//    kaynaklar birbiriyle özel adlar üzerinden eşleşir; kelime benzerliğiyle kurulan gruplar da doğrulanır.
if (process.env.GEMINI_API_KEY && sira.length) {
  const yazilmisAdlar = yazilmis.map((h) => ({
    id: `haber:${h.slug}`,
    metin: `${h.title} — ${h.description}`,
    adlar: ozelAdlar(`${h.title} ${h.description} ${h.girisim ?? ''}`),
  }));
  const ciftler = ciftleriKur(sira, yazilmisAdlar, ayrikMi);
  // Gemini hatası (ör. art arda 503) turu düşürmez: eşleme atlanır, gruplar kelime benzerliğiyle kalır.
  const ayni = await onbellekliEsle(ciftler, durum.ayni, (c) => ciftAnahtar(c.idA, c.idB), { zaman: simdi.toISOString() }).catch((e) => {
    console.warn(`Eşleme hatası: ${e.message}`);
    return null;
  });
  if (ayni) {
    const sonuc = uygula(sira, ciftler, ayni);
    for (const [x, y] of sonuc.ayrik) durum.ayrik[ciftAnahtar(x, y)] = simdi.toISOString();
    sira = [];
    for (const g of sonuc.gruplar.map(grupBilgisi)) {
      if (g.yazilmis) {
        console.log(`zaten yazıldı (özel ad eşleşmesi): ${g.uyeler[0].baslik}`);
        grupBitti(g);
      } else sira.push(g);
    }
    console.log(`Eşleme: ${ciftler.length} çift soruldu, ${ayni.size} tanesi aynı olay; ${sira.length} olay kaldı.`);
  } else {
    console.warn('Eşleme yapılamadı; gruplar kelime benzerliğiyle kaldı.');
  }
}

// c) Kapsam ve haber değeri: her olaya 0–100 puan (0 kapsam dışı). MIN_DEGER altı yazılmaz.
//    Sıralama: puan, sonra yerli kaynak, sonra yeniden eskiye. Puan yoksa eski usul (yerli önce, yeni önce).
const puan = new Map();
if (process.env.GEMINI_API_KEY && sira.length) {
  const sonuc = await onbellekliPuanla(
    sira.map((g) => `${g.yerli ? '[TR]' : '[Dünya]'} ${g.uyeler.map((u) => u.baslik).join(' / ')}`),
    sira.map(grupAnahtar),
    durum.puan,
    { parca: 80, zaman: simdi.toISOString() },
  ).catch((e) => {
    // Gemini hatası turu düşürmez: puansız devam edilir (yazar yine kapsam dışını eler).
    console.warn(`Ön eleme hatası: ${e.message}`);
    return null;
  });
  const eleme = sonuc !== null;
  if (eleme) sonuc.forEach((p, n) => puan.set(sira[n], p));
  if (eleme) {
    const disari = sira.filter((g) => puan.get(g) < MIN_DEGER);
    for (const g of disari) {
      console.log(`${puan.get(g) === 0 ? 'kapsam dışı' : `düşük haber değeri (${puan.get(g)}, eşik ${MIN_DEGER})`}: ${g.uyeler[0].baslik}`);
      grupBitti(g);
    }
    console.log(`Ön eleme: ${sira.length} olaydan ${sira.length - disari.length} tanesi yazılacak; ${disari.length} tanesi ayıklandı.`);
    sira = sira.filter((g) => puan.get(g) >= MIN_DEGER);
  } else {
    puan.clear();
    console.warn('Ön eleme yapılamadı; bütün olaylar yazara gidecek.');
  }
}
sira.sort((a, b) => (puan.get(b) ?? 0) - (puan.get(a) ?? 0) || (a.yerli !== b.yerli ? (a.yerli ? -1 : 1) : b.tarih - a.tarih));

// ── 4. Yazma ───────────────────────────────────────────────────────────
let yazilanSayi = 0;

// sira döngü içinde büyüyebilir: "aynı olay değil" denen grup tek tek haberlere bölünüp sona eklenir.
for (const g of sira) {
  if (yazilanSayi >= EN_FAZLA || !process.env.GEMINI_API_KEY) break;
  if (Date.now() - BASLANGIC > SURE_MS || geminiPayiBitti()) {
    console.log(`\n${Date.now() - BASLANGIC > SURE_MS ? 'Süre bütçesi' : 'Gemini tur payı'} doldu; kalan olaylar sonraki çalışmaya kaldı.`);
    break;
  }
  const ad = g.uyeler[0].baslik;
  console.log(`\n[${[...g.siteler].join(', ')}] ${ad}`);
  const hataId = g.uyeler[0].id;
  // Bu çalışmada az önce yazılan bir olayla aynıysa (aynı turda iki gruba bölünmüş olay) yazılmaz.
  if (g.uyeler.some((u) => tekrarMi(u.baslik, 'bu çalışmada'))) {
    ozet.atlanan.push(`${ad} (son ${HAFIZA_SAAT} saatte yazıldı)`);
    grupBitti(g);
    continue;
  }
  try {
    // Her siteden bir haber (en uzun metinli), en fazla 3 kaynak.
    const secilen = [];
    for (const kod of g.siteler) secilen.push(g.uyeler.find((u) => u.kaynak.kod === kod));
    const kaynaklar = [];
    for (const u of secilen.slice(0, 3)) {
      const metin = await tamMetin(u);
      if (metin.length >= 200) {
        kaynaklar.push({ baslik: u.baslik, metin, tarih: u.tarih.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Istanbul' }) });
      }
    }
    // 250–400 kelimelik haber için kaynakta yeterli olgu olmalı; kısa özetten uzun haber yazılmaz (uydurma riski).
    const kaynakKelime = kaynaklar.reduce((n, k) => n + k.metin.split(/\s+/).filter(Boolean).length, 0);
    if (kaynaklar.length < TEYIT || kaynakKelime < KAYNAK_EN_AZ_KELIME) {
      ozet.atlanan.push(`${ad} (${kaynaklar.length < TEYIT ? 'kaynak metinleri okunamadı' : `kaynak metni kısa: ${kaynakKelime} kelime`})`);
      grupBitti(g);
      continue;
    }
    const t = await taslakYaz(kaynaklar);
    if (!t) break;
    if (!t.ayniOlay && g.uyeler.length > 1) {
      // Başlıklar benziyordu ama farklı olaylar: çiftler hatırlanır, haberler ayrı ayrı yazılmak üzere sona eklenir.
      console.log(`  aynı olay değil: ${medyaGizle(t.neden)}`);
      for (const a of g.uyeler) for (const b of g.uyeler) if (a.id < b.id) durum.ayrik[ciftAnahtar(a.id, b.id)] = simdi.toISOString();
      for (const u of g.uyeler) sira.push({ uyeler: [u], siteler: new Set([u.kaynak.kod]), tarih: u.tarih });
      continue;
    }
    if (!t.uygun) {
      console.log(`  atlandı: ${medyaGizle(t.neden)}`);
      ozet.atlanan.push(`${ad} (${medyaGizle(t.neden)})`);
      grupBitti(g);
      continue;
    }
    // Yazılan başlık da hafızayla karşılaştırılır: kaynak başlığı farklı olsa da Türkçe başlık aynı olayı anlatabilir.
    if (tekrarMi(t.title, 'yazılan başlık')) {
      ozet.atlanan.push(`${ad} (son ${HAFIZA_SAAT} saatte yazıldı)`);
      grupBitti(g);
      continue;
    }
    const girisimNorm = adNorm(t.girisim);
    if (girisimNorm && t.toplanan > 0 && bilinenGirisimler.has(girisimNorm)) {
      ozet.atlanan.push(`${ad} (aynı yatırım zaten yazıldı)`);
      grupBitti(g);
      continue;
    }
    const kunye = {
      girisim: t.girisim?.trim() || undefined,
      toplanan: t.toplanan > 0 ? t.toplanan : undefined,
      paraBirimi: t.paraBirimi,
      tur: t.tur?.trim() || undefined,
      yatirimcilar: t.yatirimcilar?.trim() || undefined,
      platform: t.platform?.trim() || undefined,
      hedef: t.hedef > 0 ? t.hedef : undefined,
      yatirimci: t.yatirimci > 0 ? t.yatirimci : undefined,
    };
    // Denetimde bütün kaynakların başlık ve metinleri birlikte kullanılır.
    const kaynakMetni = kaynaklar.map((k) => `${k.baslik}\n${k.metin}`).join('\n\n');
    const { haber, sorunlar } = await denetle({ title: t.title, description: t.description, body: t.body, kunye, why_matters: t.why_matters, key_points: t.key_points }, kaynakMetni);
    grupBitti(g);
    if (sorunlar.length) {
      // Bütün düzeltme turlarından sonra hâlâ sorunlu: yayımlanmaz, taslak da açılmaz.
      console.log(`  YAYIMLANMADI (denetim): ${medyaGizle(sorunlar.join(' | '))}`);
      ozet.elenen.push(`${haber.title} — ${medyaGizle(sorunlar.join('; '))}`);
      // Yalnız uzunluk yüzünden duran olay havuza girer: aynı kategoriden eşi gelince derleme olur.
      if (sorunlar.every((s) => s.startsWith('Metin çok kısa'))) {
        const kullanilan = secilen.slice(0, 3).map((u) => ({ ad: u.kaynak.ad, url: u.link }));
        havuz.push(havuzOlayi({ id: hataId, taslak: { ...haber, category: t.category }, basliklar: g.uyeler.map((u) => u.baslik), kaynaklar, kullanilan, iso: simdi.toISOString() }));
        console.log('  havuza alındı: eş bekleyecek');
      }
      continue;
    }
    const slug = await haberYaz(ROT, { ...haber, category: t.category, date: istanbulIso(simdi), draft: false, kaynakIzi: kaynakIzi(secilen.slice(0, 3).map((u) => ({ ad: u.kaynak.ad, url: u.link }))), why_matters: haber.why_matters ?? t.why_matters, key_points: haber.key_points ?? t.key_points });
    delete durum.hatalar[hataId];
    if (girisimNorm) bilinenGirisimler.add(girisimNorm);
    hafiza.push(kayitKur({ title: haber.title, description: haber.description, girisim: kunye.girisim, slug }));
    yazilmisAnahtar.push(anahtarlar(haber.title), anahtarlar(`${haber.title} ${haber.description}`), ...g.uyeler.map((u) => u.anahtar));
    yazilanSayi++;
    console.log(`  yazıldı: ${slug}`);
    ozet.yazilan.push(haber.title);
  } catch (e) {
    const mesaj = adresiSil(e.message);
    console.warn(`  hata: ${mesaj}`);
    if (e.ayar) {
      // Anahtar ya da model hatası: haberin suçu değil, sonra tekrar denenir.
      ozet.hata.push(mesaj);
      break;
    }
    const h = (durum.hatalar[hataId] ??= { sayi: 0 });
    h.sayi++;
    h.mesaj = mesaj;
    h.zaman = simdi.toISOString();
    ozet.hata.push(`${ad}: ${mesaj}`);
    if (h.sayi >= EN_FAZLA_HATA) grupBitti(g);
  }
}

// ── 5. Durum ve özet ───────────────────────────────────────────────────
// 30 günden eski kayıtlar silinir (yaş sınırı yüzünden o kadar eski haber zaten aday olmaz).
for (const kayit of [durum.gorulen, durum.ayrik, durum.ayni]) for (const [id, t] of Object.entries(kayit)) if (simdi - new Date(t) > 30 * 86_400_000) delete kayit[id];
for (const [id, v] of Object.entries(durum.taranan)) if (simdi - new Date(v.zaman) > 30 * 86_400_000) delete durum.taranan[id];
// Puanlar yalnızca aday yaşı boyunca gerekir.
for (const [k, v] of Object.entries(durum.puan)) if (simdi - new Date(v.zaman) > (YAS_GUN + 1) * 86_400_000) delete durum.puan[k];
// Kimlikler anahtarlı özet (gizliId); eski anahtarsız hash'lerden taşıma yapıldığının işareti.
durum.kimlik = 'hmac-v1';
// Kısa haber havuzu: aynı kategoriden biriken kısa haberler tek bir derleme yazısı olur (havuz.mjs).
if (process.env.GEMINI_API_KEY) {
  try {
    const h = await havuzuIsle(havuz, {
      simdi,
      // Bu arada (bu turda ya da son 72 saatte) tam haber olarak yazılan olay düşer.
      mukerrer: (o) => {
        const t = o.basliklar.map((b) => tekrarBul(b, hafiza)).find(Boolean);
        return t ? `son ${HAFIZA_SAAT} saatte yazıldı` : null;
      },
      yaz: derlemeYaz,
      denetle,
      kaydet: async (haber, t, grup) => {
        const slug = await haberYaz(ROT, {
          ...haber,
          category: t.category,
          date: istanbulIso(simdi),
          draft: false,
          kaynakIzi: kaynakIzi(grup.flatMap((o) => o.kullanilan ?? [])),
          why_matters: haber.why_matters ?? t.why_matters,
          key_points: haber.key_points ?? t.key_points,
        });
        hafiza.push(kayitKur({ title: haber.title, description: haber.description, slug }));
        yazilanSayi++;
        ozet.yazilan.push(`${haber.title} (derleme)`);
        return slug;
      },
      surVar: () => Date.now() - BASLANGIC <= SURE_MS && !geminiPayiBitti(),
      log: (m) => console.log(medyaGizle(m)),
    });
    havuz = h.havuz;
    if (h.ayarHatasi) ozet.hata.push(`derleme: ${adresiSil(h.ayarHatasi.message)}`);
  } catch (e) {
    console.warn(`havuz hatası: ${adresiSil(e.message)}`);
    ozet.hata.push(`havuz: ${adresiSil(e.message)}`);
  }
}
durum.havuz = havuzKapat(havuz);

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
