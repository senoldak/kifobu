/**
 * Kampanya keşfi: platformların liste ve kampanya sayfalarını okur, takip dosyasını günceller,
 * biten kampanyaları arşive taşır ve olayları bildirir.
 *
 * Kullanım: node --experimental-strip-types scripts/kampanya-kesfi/calistir.ts --mod canli|kapanis [--kuru]
 * --kuru: gerçek platformlara gider, olayları yazdırır, hiçbir dosya yazmaz ve bildirim göndermez.
 */
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { OKUYUCULAR } from './platformlar/index.ts';
import { detayGetir, fetchHtml, rastgeleBekle } from './getir.ts';
import { bildir } from './bildir.ts';
import { EL_LISTESI } from '../../src/data/bulten-kaynaklari.ts';
import { sonKaydiBul } from '../../src/lib/arsiv/dosya.ts';
import { alarmSuz, arsiveTasi, kesfiUygula, urlAnahtari } from '../../src/lib/kampanya-takip.ts';
import type { KampanyaDetay, ListeKaydi, Olay, PlatformTurSonucu, TakipDosyasi } from '../../src/lib/kampanya-takip.ts';
import { yayinDurduMu } from '../bot/standart.mjs';

const KOK = fileURLToPath(new URL('../../', import.meta.url));
const TAKIP_YOLU = `${KOK}src/data/kampanya-takip.json`;
const GECMIS_YOLU = `${KOK}src/data/kampanya-gecmis.json`;
const ARSIV_DIZINI = `${KOK}src/data/arsiv`;

const yaz = (yol: string, veri: unknown) => fs.writeFileSync(yol, JSON.stringify(veri, null, 1) + '\n', 'utf8');
const hataMetni = (e: unknown) => String((e as Error)?.message ?? e);

function guvenliAnahtar(url: string): string | null {
  try {
    return urlAnahtari(url);
  } catch {
    return null;
  }
}

async function main() {
  const argv = process.argv.slice(2);
  const modIdx = argv.indexOf('--mod');
  const mod = modIdx >= 0 ? argv[modIdx + 1] : undefined;
  const kuru = argv.includes('--kuru');
  if (mod !== 'canli' && mod !== 'kapanis') {
    console.error('Kullanım: --mod canli|kapanis [--kuru]');
    process.exit(2);
  }

  const dur = await yayinDurduMu({ url: process.env.MOTOR_URL, anahtar: process.env.MOTOR_ANAHTARI, site: 'kifobu' });
  if (dur.durdu) {
    console.log(`Yayın durduruldu, keşif yapılmadı: ${dur.neden ?? ''}`);
    return;
  }

  const gun = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Istanbul' }).format(new Date());
  const takip: TakipDosyasi = JSON.parse(fs.readFileSync(TAKIP_YOLU, 'utf8'));
  if (mod === 'canli' && takip.sonKesif === gun) {
    if (!kuru) {
      console.log(`Bugün (${gun}) keşif yapıldı, canlı tur atlanıyor.`);
      return;
    }
    console.log(`Bugün (${gun}) keşif yapılmış; kuru çalıştırma olduğu için sürüyor.`);
  }
  const gecmisDosyasi = JSON.parse(fs.readFileSync(GECMIS_YOLU, 'utf8'));
  const arsivAdlari: string[] = gecmisDosyasi.kampanyalar.map((k: { ad: string }) => k.ad);

  console.log(`Keşif başlıyor: mod=${mod}${kuru ? ' (kuru)' : ''}, gün=${gun}`);

  let ilkIstek = true;
  const bekle = async () => {
    if (!ilkIstek) await rastgeleBekle();
    ilkIstek = false;
  };

  const sonuclar: PlatformTurSonucu[] = [];
  for (const okuyucu of Object.values(OKUYUCULAR)) {
    const sonuc: PlatformTurSonucu = { platform: okuyucu.platform, hata: null, liste: [], detaylar: {} };
    sonuclar.push(sonuc);

    const liste: ListeKaydi[] = [];
    try {
      for (const listeUrl of okuyucu.listeUrller) {
        await bekle();
        liste.push(...okuyucu.liste(await fetchHtml(listeUrl), listeUrl));
      }
    } catch (e) {
      sonuc.hata = hataMetni(e);
      console.log(`${okuyucu.platform}: liste alınamadı: ${sonuc.hata}`);
      continue;
    }
    sonuc.liste = liste;

    // Detay: takipte olmayan her liste kaydı (yeni aday) ve takipteki bitmemiş her kayıt. Biten kayıtların sayfası kalkmış olabilir.
    const takipli = takip.kampanyalar.filter((k) => k.platform === okuyucu.platform);
    const takipliAnahtarlar = new Set(takipli.map((k) => guvenliAnahtar(k.url)).filter((x): x is string => x !== null));
    const hedefler = new Map<string, string>();
    for (const l of liste) {
      const an = guvenliAnahtar(l.url);
      if (an !== null && !takipliAnahtarlar.has(an)) hedefler.set(an, l.url);
    }
    for (const k of takipli) {
      const an = guvenliAnahtar(k.url);
      if (an !== null && k.durum !== 'bitti') hedefler.set(an, k.url);
    }

    for (const [an, url] of hedefler) {
      let detay: KampanyaDetay | null = null;
      try {
        await bekle();
        detay = okuyucu.detay(await detayGetir(okuyucu, url));
      } catch (e) {
        console.log(`  ! ${okuyucu.platform}: kampanya sayfası okunamadı (${an}): ${hataMetni(e)}`);
      }
      sonuc.detaylar[an] = detay;
    }
    console.log(`${okuyucu.platform}: listede ${liste.length} kampanya, ${hedefler.size} sayfa okundu.`);
  }

  const kesif = kesfiUygula({ takip, sonuclar, gun, el: EL_LISTESI, arsivAdlari });
  const son = sonKaydiBul(ARSIV_DIZINI, gun);
  const gunlukSonAlinan: Record<string, number> = {};
  for (const g of son?.girisimler ?? []) {
    if (typeof g.alinan === 'number') gunlukSonAlinan[g.ad] = g.alinan;
  }
  const arsiv = arsiveTasi({ takip: kesif.takip, arsiv: gecmisDosyasi.kampanyalar, gun, gunlukSonAlinan, el: EL_LISTESI });
  const suzulen = alarmSuz([...kesif.olaylar, ...arsiv.olaylar], arsiv.takip.alarmlar, gun);
  const yeniTakip: TakipDosyasi = { ...arsiv.takip, alarmlar: suzulen.alarmlar };
  const arsivDegisti = JSON.stringify(arsiv.yeniArsiv) !== JSON.stringify(gecmisDosyasi.kampanyalar);

  const olaylar: Olay[] = suzulen.gonderilecek;
  console.log(`Olaylar: ${kesif.olaylar.length + arsiv.olaylar.length} üretildi, ${olaylar.length} gönderilecek.`);
  for (const o of olaylar) console.log(`- [${o.tur}] ${o.metin.replace(/\n/g, ' | ')}`);

  if (kuru) {
    console.log(`Kuru çalıştırma: dosya yazılmadı, bildirim gönderilmedi (arşiv değişirdi: ${arsivDegisti ? 'evet' : 'hayır'}).`);
    return;
  }

  // Önce arşiv, sonra takip: arşiv yazımı düşerse kampanya takipte kalır, iki yerden birden kaybolmaz.
  if (arsivDegisti) yaz(GECMIS_YOLU, { ...gecmisDosyasi, kampanyalar: arsiv.yeniArsiv });
  yaz(TAKIP_YOLU, yeniTakip);

  let gonderilen = 0;
  for (const o of olaylar) {
    if (await bildir(o.metin, { MOTOR_URL: process.env.MOTOR_URL, MOTOR_ANAHTARI: process.env.MOTOR_ANAHTARI })) gonderilen++;
    else console.log(`GÖNDERİLEMEDİ: [${o.tur}] ${o.metin.replace(/\n/g, ' | ')}`);
  }
  console.log(`Bitti: ${gonderilen}/${olaylar.length} bildirim gönderildi.`);
}

main().catch((e) => {
  console.error(`Keşif başarısız: ${hataMetni(e)}`);
  process.exit(1);
});
