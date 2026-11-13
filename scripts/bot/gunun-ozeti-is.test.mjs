import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, access } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { gunHaberleri, ozetYaz } from './gunun-ozeti-is.mjs';

const SIMDI = new Date('2026-11-13T17:45:00Z'); // İstanbul 20:45
const govde = 'Kelime '.repeat(130);
const md = ({ title, description = 'Mirendil 1 milyar dolar topladı ve büyüdü.', category = 'yatirimlar', date, extra = '' }) =>
  `---\ntitle: ${JSON.stringify(title)}\ndescription: ${JSON.stringify(description)}\ncategory: ${JSON.stringify(category)}\ndate: ${JSON.stringify(date)}\n${extra}---\n\n${govde}\n`;

async function kur(haberler) {
  const kok = await mkdtemp(path.join(os.tmpdir(), 'ozet-'));
  for (const [slug, h] of Object.entries(haberler)) {
    await mkdir(path.join(kok, 'src/content/haberler', slug), { recursive: true });
    await writeFile(path.join(kok, 'src/content/haberler', slug, 'index.md'), md(h));
  }
  return kok;
}

const GUN = {
  mirendil: { title: 'Mirendil, Seri A turunda 1 milyar dolar yatırım aldı', description: 'Yapay zekâ araştırma araçları geliştiren Mirendil, Kleiner Perkins ve Clearlake Capital liderliğinde 1 milyar dolar Seri A yatırım topladı.', date: '2026-11-13T03:20:00Z' },
  qctrl: { title: 'Q-CTRL, Seri C turunda 290 milyon dolar yatırım alarak unicorn unvanı kazandı', description: 'Kuantum yazılım girişimi Q-CTRL 290 milyon dolar toplayarak 1,4 milyar dolar değerlemeye ulaştı.', date: '2026-11-13T03:21:00Z' },
  norwest: { title: 'Norwest Venture Partners 4 milyar dolar büyüklüğünde yeni fon oluşturdu', description: '4 milyar dolarlık Norwest 18 fonunu tamamladı.', date: '2026-11-13T09:20:00Z' },
  dun: { title: 'Dünkü haber', date: '2026-11-12T20:00:00Z' },
  'sabah-bulteni-13-kasim-2026': { title: 'Sabah Bülteni — 13 Kasım 2026', category: 'gunluk-bulten', date: '2026-11-13T06:00:00Z' },
  taslak: { title: 'Taslak', date: '2026-11-13T10:00:00Z', extra: 'draft: true\n' },
  kisa: { title: 'Kısa', date: '2026-11-13T10:00:00Z', extra: 'noindex: true\n' },
  gelecek: { title: 'Gelecek', date: '2026-11-13T19:00:00Z' },
};
const GECERLI = "Günün en büyük turu Mirendil'den geldi. Şirket, Kleiner Perkins ve Clearlake Capital liderliğinde 1 milyar dolar Seri A yatırımı aldı. Q-CTRL 290 milyon dolarlık turla 1,4 milyar dolar değerlemeye ulaştı.";
const oku = async (kok) => JSON.parse(await readFile(path.join(kok, 'src/data/gunun-ozeti/2026-11-13.json'), 'utf8'));
const sessiz = () => {};

test('gunHaberleri: yalnız bugünün yayımlanmış, indekslenir haberleri, yayın sırasıyla; bülten yok', async () => {
  const kok = await kur(GUN);
  assert.deepEqual((await gunHaberleri({ simdi: SIMDI, kok })).map((h) => h.id), ['mirendil', 'qctrl', 'norwest']);
});

test('ozetYaz: haber yoksa null, dosya yazılmaz', async () => {
  const kok = await kur({ dun: GUN.dun });
  assert.equal(await ozetYaz({ simdi: SIMDI, kok, geminiFn: async () => assert.fail('çağrılmamalı'), log: sessiz }), null);
  await assert.rejects(access(path.join(kok, 'src/data/gunun-ozeti/2026-11-13.json')));
});

test('ozetYaz: geçerli paragraf → yazan gemini, kimlikler kaydedilir, istem siteye göre', async () => {
  const kok = await kur(GUN);
  let istem;
  const r = await ozetYaz({ simdi: SIMDI, kok, log: sessiz, geminiFn: async (a) => ((istem = a), { paragraf: GECERLI, kimlikler: ['mirendil', 'qctrl'] }) });
  assert.deepEqual(r, { tarih: '2026-11-13', yazan: 'gemini' });
  assert.match(istem.sistem, /kitle fonlaması/);
  assert.match(istem.prompt, /kimlik: mirendil/);
  assert.ok(istem.schema.required.includes('paragraf'));
  const j = await oku(kok);
  assert.deepEqual([j.tarih, j.paragraf, j.kimlikler, j.yazan, j.olusturma], ['2026-11-13', GECERLI, ['mirendil', 'qctrl'], 'gemini', SIMDI.toISOString()]);
});

test('ozetYaz: dosya varsa yeniden yazmaz', async () => {
  const kok = await kur(GUN);
  await ozetYaz({ simdi: SIMDI, kok, log: sessiz, geminiFn: async () => ({ paragraf: GECERLI, kimlikler: ['mirendil', 'qctrl'] }) });
  assert.equal(await ozetYaz({ simdi: SIMDI, kok, log: sessiz, geminiFn: async () => assert.fail('çağrılmamalı') }), null);
});

for (const [ad, geminiFn] of [
  ['gemini null (anahtar yok)', async () => null],
  ['gemini hata (kota)', async () => { throw Object.assign(new Error('kota'), { kota: true }); }],
  ['uydurma rakam', async () => ({ paragraf: GECERLI.replace('1 milyar', '3 milyar'), kimlikler: ['mirendil', 'qctrl'] })],
  ['dil kapısı kesin sorun', async () => ({ paragraf: `${GECERLI} Tur kapsamında beş yüz milyon dolar toplandı.`, kimlikler: ['mirendil', 'qctrl'] })],
]) {
  test(`ozetYaz: ${ad} → yedek paragraf`, async () => {
    const kok = await kur(GUN);
    assert.deepEqual(await ozetYaz({ simdi: SIMDI, kok, log: sessiz, geminiFn }), { tarih: '2026-11-13', yazan: 'yedek' });
    const j = await oku(kok);
    assert.match(j.paragraf, /^Günün öne çıkanları: Mirendil, Seri A turunda 1 milyar dolar yatırım aldı\. /);
    assert.deepEqual(j.kimlikler, ['mirendil', 'qctrl', 'norwest']);
  });
}

test('ozetYaz: 600 karakteri aşan paragraf tümce sınırında kısalır', async () => {
  const kok = await kur(GUN);
  const uzun = `${GECERLI} ${'Mirendil Seri A yatırımı aldı. '.repeat(20)}`.trim();
  await ozetYaz({ simdi: SIMDI, kok, log: sessiz, geminiFn: async () => ({ paragraf: uzun, kimlikler: ['mirendil', 'qctrl'] }) });
  const j = await oku(kok);
  assert.ok(j.paragraf.length <= 600);
  assert.match(j.paragraf, /\.$/);
});
