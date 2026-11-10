// TCMB EVDS'ten sekundery için: İTO İstanbul Ücretliler Geçinme İndeksi aylık değişimi, günlük USD/TRY, EUR/TRY ve gram altın.
// Çıktı: src/data/sekundery/ito-aylik.json, usd-try.json, eur-try.json, xau-try.json. Yalnız değişen dosya yazılır.
// Anahtar: EVDS_ANAHTARI (GitHub Secret); yerelde yoksa ~/.evds-mcp.json içindeki api_key. Anahtar loga yazılmaz.
// finfolis/scripts/veri/tahmin-veri.mjs ile aynı seriler ve aynı birleştirme kuralı (Şubat 2024'ten önce 1995=100, sonra 2023=100).
import { readFileSync, writeFileSync, existsSync, appendFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const EVDS = 'https://evds3.tcmb.gov.tr/igmevdsms-dis';
const ITO_ESKI = 'TP.FG.B01.95';
const ITO_YENI = 'TP.FG.IST1.23';
const ITO_GECIS = 2024 * 12 + 2;
const USD = 'TP.DK.USD.S.YTL'; // satış kuru: sahibin Excel'indeki (Sayfa154) örtük kurlarla aynı
const EUR = 'TP.DK.EUR.S.YTL'; // aynı mantıkla avro satış kuru
const ALTIN = 'TP.ALTINPIYASA.KAP02'; // Borsa İstanbul altın kapanış fiyatı, TL/kg (gram = /1000)
const ITO_DOSYA = 'src/data/sekundery/ito-aylik.json';
const USD_DOSYA = 'src/data/sekundery/usd-try.json';
const EUR_DOSYA = 'src/data/sekundery/eur-try.json';
const ALTIN_DOSYA = 'src/data/sekundery/xau-try.json';
const BASLANGIC = new Date(Date.UTC(2020, 11, 1)); // ilk kitle fonlaması kampanyalarından önce

const alanAdi = (seri, formul) => seri.replaceAll('.', '_') + (formul ? `-${formul}` : '');
const gun = (d) => `${String(d.getUTCDate()).padStart(2, '0')}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${d.getUTCFullYear()}`;

function anahtarBul() {
  if (process.env.EVDS_ANAHTARI?.trim()) return process.env.EVDS_ANAHTARI.trim();
  const yol = join(homedir(), '.evds-mcp.json');
  if (existsSync(yol)) return JSON.parse(readFileSync(yol, 'utf8')).api_key;
  return null;
}

async function cek(seriler, formuller, bas, bit, anahtar) {
  const url = `${EVDS}/series=${seriler.join('-')}&startDate=${gun(bas)}&endDate=${gun(bit)}&type=json&formulas=${formuller.join('-')}`;
  const yanit = await fetch(url, { headers: { key: anahtar }, signal: AbortSignal.timeout(60_000) });
  if (!yanit.ok) throw new Error(`EVDS HTTP ${yanit.status} (${seriler.join(', ')})`);
  const veri = await yanit.json();
  if (!Array.isArray(veri?.items)) throw new Error('EVDS yanıtı ayrıştırılamadı');
  return veri.items;
}

/** EVDS aylık kalemlerinden İTO aylık değişim satırları; boşluk varsa hata. @returns {{yil:number, ay:number, aylik:number}[]} */
export function itoSatirlari(kalemler) {
  const out = [];
  for (const it of kalemler) {
    const m = String(it.Tarih ?? '').match(/^(\d{4})-(\d{1,2})$/);
    if (!m) continue;
    const yil = Number(m[1]), ay = Number(m[2]);
    const alan = yil * 12 + ay < ITO_GECIS ? alanAdi(ITO_ESKI, 1) : alanAdi(ITO_YENI, 1);
    const d = it[alan] == null || it[alan] === '' ? NaN : Number(it[alan]);
    if (Number.isFinite(d)) out.push({ yil, ay, aylik: d });
  }
  out.sort((a, b) => a.yil * 12 + a.ay - (b.yil * 12 + b.ay));
  for (let i = 1; i < out.length; i++)
    if (out[i].yil * 12 + out[i].ay !== out[i - 1].yil * 12 + out[i - 1].ay + 1) throw new Error(`İTO serisinde boşluk: ${out[i - 1].yil}-${out[i - 1].ay}`);
  return out;
}

/** EVDS günlük kalemlerinden { "YYYY-MM-DD": kur } (tatil günleri boş gelir, atlanır). */
export function usdSatirlari(kalemler, seri = USD) {
  const out = {};
  for (const it of kalemler) {
    const m = String(it.Tarih ?? '').match(/^(\d{2})-(\d{2})-(\d{4})$/);
    const v = it[alanAdi(seri, 0)];
    if (m && v != null && v !== '' && Number.isFinite(Number(v))) out[`${m[3]}-${m[2]}-${m[1]}`] = Number(v);
  }
  return out;
}

async function calistir() {
  const anahtar = anahtarBul();
  if (!anahtar) {
    console.error('::error::EVDS_ANAHTARI tanımlı değil.');
    process.exit(2);
  }
  const bit = new Date();
  const ito = await cek([ITO_ESKI, ITO_YENI], [1, 1], BASLANGIC, bit, anahtar);
  // EVDS istek başına en çok 1.000 gözlem verir; günlük kur yıl yıl istenir.
  const kur = [];
  const altin = [];
  for (let y = BASLANGIC.getUTCFullYear(); y <= bit.getUTCFullYear(); y++) {
    const bas = y === BASLANGIC.getUTCFullYear() ? BASLANGIC : new Date(Date.UTC(y, 0, 1));
    const son = y === bit.getUTCFullYear() ? bit : new Date(Date.UTC(y, 11, 31));
    kur.push(...(await cek([USD, EUR], [0, 0], bas, son, anahtar)));
    altin.push(...(await cek([ALTIN], [0], bas, son, anahtar)));
  }
  const yazilan = [];
  const itoYeni = { kaynak: { ad: 'İstanbul Ticaret Odası (İTO) İstanbul Ücretliler Geçinme İndeksi, aylık % değişim', url: 'https://evds3.tcmb.gov.tr/', seriler: [ITO_ESKI, ITO_YENI] }, satirlar: itoSatirlari(ito) };
  const usdYeni = { kaynak: { ad: 'TCMB ABD doları döviz satış kuru (gösterge)', url: 'https://evds3.tcmb.gov.tr/', seri: USD }, kurlar: usdSatirlari(kur, USD) };
  const eurYeni = { kaynak: { ad: 'TCMB avro döviz satış kuru (gösterge)', url: 'https://evds3.tcmb.gov.tr/', seri: EUR }, kurlar: usdSatirlari(kur, EUR) };
  const altinYeni = { kaynak: { ad: 'Borsa İstanbul altın kapanış fiyatı, TL/gram (TL/kg ÷ 1.000)', url: 'https://evds3.tcmb.gov.tr/', seri: ALTIN }, kurlar: Object.fromEntries(Object.entries(usdSatirlari(altin, ALTIN)).map(([t, v]) => [t, Math.round(v / 10) / 100])) };
  for (const [yol, veri] of [[ITO_DOSYA, itoYeni], [USD_DOSYA, usdYeni], [EUR_DOSYA, eurYeni], [ALTIN_DOSYA, altinYeni]]) {
    const metin = `${JSON.stringify(veri, null, 0)}\n`;
    if (!existsSync(yol) || readFileSync(yol, 'utf8') !== metin) { writeFileSync(yol, metin); yazilan.push(yol); }
  }
  const sonIto = itoYeni.satirlar.at(-1), usdGunler = Object.keys(usdYeni.kurlar);
  console.log(`EVDS: İTO ${itoYeni.satirlar.length} ay (son ${sonIto?.yil}-${sonIto?.ay}), USD ${usdGunler.length} gün (son ${usdGunler.at(-1)}), EUR ${Object.keys(eurYeni.kurlar).length} gün, altın ${Object.keys(altinYeni.kurlar).length} gün; yazılan ${yazilan.length}.`);
  if (yazilan.length && process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `evdsDosyalar=${yazilan.join(' ')}\n`);
}

if (import.meta.url === `file:///${process.argv[1]?.replaceAll('\\', '/')}` || process.argv[1]?.endsWith('evds.mjs')) {
  calistir().catch((e) => {
    console.error(`::error::${String(e.message).replace(/key=[^&\s]+/gi, 'key=***')}`);
    process.exit(1);
  });
}
