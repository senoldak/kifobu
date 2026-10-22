// Standartlar Faz 0 akışı: fail-closed denetim, kırmızı/sarı kapı, acil durdurma.
import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { spawn } from 'node:child_process';
import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

process.env.GEMINI_API_KEY = 'test';
process.env.GEMINI_ARALIK_MS = '0';
process.env.GEMINI_BEKLE_CARPAN = '0';
const { denetle } = await import('./denetci.mjs');
const { standartKapisi } = await import('./standart-kapi.mjs');
const { standartDenetle } = await import('./standart.mjs');
const { onEle, onbellekliPuanla } = await import('./yazar.mjs');

const HER = path.dirname(fileURLToPath(import.meta.url));
const govde = (n) => `${'kelime '.repeat(n - 1).trim()} kelime.`;
const BASLIK = 'Kitle fonlama platformları yeni dönemde ilerliyor';
const taslak = () => ({ title: BASLIK, description: 'Dilimin özeti.', body: govde(210), category: 'yatirimlar' });
const KAYNAK = 'Kaynak metni tamamen farklı sözcüklerden oluşur.';

// Yazı işleri müdürü çağrılarını sırayla taklit eder; null = boş yanıt (kota, zaman aşımı).
function sahteGemini(onaylar) {
  const gercek = globalThis.fetch;
  let n = 0;
  globalThis.fetch = async (_url, init) => {
    const istem = JSON.parse(init.body).contents[0].parts[0].text;
    let cevap;
    if (istem.includes('yazı işleri müdürüsün')) {
      const o = onaylar[n++];
      if (o === null) return new Response(JSON.stringify({ candidates: [] }));
      cevap = o ? { onay: true, sorunlar: [] } : { onay: false, sorunlar: ['Kaynakta yok: bir rakam'] };
    } else cevap = { title: BASLIK, description: 'Dilimin özeti.', body: govde(210) };
    return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify(cevap) }] } }], usageMetadata: {} }));
  };
  return { geri: () => (globalThis.fetch = gercek), say: () => n };
}

test('müdürün son itirazı yayını durdurur (iki ret + düzeltme sonrası da ret)', async () => {
  const g = sahteGemini([false, false, false]);
  try {
    const r = await denetle(taslak(), KAYNAK);
    assert.ok(r.sorunlar.some((s) => s.startsWith('Yazı işleri onayı alınamadı')), r.sorunlar.join('|'));
    assert.equal(g.say(), 3); // iki tur + son metnin yeniden sorulması
  } finally {
    g.geri();
  }
});

test('iki ret sonrası düzeltilen metni müdür onaylarsa yayımlanabilir', async () => {
  const g = sahteGemini([false, false, true]);
  try {
    const r = await denetle(taslak(), KAYNAK);
    assert.deepEqual(r.sorunlar, []);
    assert.equal(r.belirsiz, false);
  } finally {
    g.geri();
  }
});

test('Gemini kalıcı hata verirse denetim fırlatır: haber yazılmaz, yeniden denenir', async () => {
  const gercek = globalThis.fetch;
  globalThis.fetch = async () => new Response('{}', { status: 503 });
  try {
    await assert.rejects(() => denetle(taslak(), KAYNAK));
  } finally {
    globalThis.fetch = gercek;
  }
});

test('ön eleme: modelin atladığı başlık puansız kalır ve önbelleğe yazılmaz', async () => {
  const p = await onEle(['a', 'b'], { kall: async () => ({ puanlar: [{ nr: 0, puan: 80 }] }) });
  assert.deepEqual(p, [80, undefined]);
  const kayit = {};
  const q = await onbellekliPuanla(['a', 'b'], ['ka', 'kb'], kayit, { kall: async () => ({ puanlar: [{ nr: 0, puan: 80 }] }), zaman: 't' });
  assert.deepEqual(q, [80, undefined]);
  assert.deepEqual(Object.keys(kayit), ['ka']);
});

test('ön eleme: Gemini yanıtı yoksa null (çağıran bu tur hiçbir olayı yazmaz)', async () => {
  assert.equal(await onbellekliPuanla(['a'], ['ka'], {}, { kall: async () => null }), null);
});

test('kırmızı haber yazılmaz: kapı yayimla=false döner ve motora elendi + gerekçe gider', async () => {
  const kayitlar = [];
  const kapi = await standartKapisi({
    baslik: 'Örnek girişim yatırım turu açıkladı',
    ozet: 'Şirket açıklaması.',
    metin: 'Bu hisseyi mutlaka alın, kesin kazanç sağlayacak.',
    kimlik: 'abc123',
    motor: { url: 'https://saat.example', anahtar: 'k' },
    log: () => {},
    kaydet: async (k) => (kayitlar.push(k), true),
  });
  assert.equal(kapi.yayimla, false);
  assert.equal(kayitlar.length, 1);
  assert.equal(kayitlar[0].site, 'kifobu');
  assert.equal(kayitlar[0].kayit.durum, 'elendi');
  assert.match(kayitlar[0].kayit.gerekce, /^standart:kirmizi:/);
});

test('sarı haber yazılır ve gerekçe motora gider; temiz haberde kayıt yok', async () => {
  const kayitlar = [];
  const kaydet = async (k) => (kayitlar.push(k), true);
  const temiz = await standartKapisi({ baslik: BASLIK, ozet: 'Dilimin özeti.', metin: 'Şirket yeni bir tur açıkladı.', kimlik: 'x', log: () => {}, kaydet });
  assert.equal(temiz.yayimla, true);
  await temiz.yazildi('ornek-slug');
  assert.equal(kayitlar.length, 0);
  const aday = ['Girişimin kurucusu bir trafik kazasında yaralandı.', 'Şirket seçim öncesi duyuru yaptı.'];
  const sari = aday.find((m) => standartDenetle({ dil: 'tr', baslik: BASLIK, ozet: 'Özet.', metin: m }).karar === 'sari');
  assert.ok(sari, 'sarı üreten örnek metin bulunamadı');
  const kapi = await standartKapisi({ baslik: BASLIK, ozet: 'Özet.', metin: sari, kimlik: 'y', log: () => {}, kaydet });
  assert.equal(kapi.yayimla, true);
  await kapi.yazildi('sari-slug');
  assert.equal(kayitlar[0].kayit.durum, 'yazildi');
  assert.equal(kayitlar[0].kayit.slug, 'sari-slug');
  assert.match(kayitlar[0].kayit.gerekce, /^standart:sari:/);
});

// Yerel motor sunucusu: durum ucu verilen değeri döner.
async function motorSunucusu(durdu) {
  const sunucu = http.createServer((req, res) => {
    res.setHeader('content-type', 'application/json');
    res.end(JSON.stringify(req.url.endsWith('/durum') ? { durdu, zaman: '2026-10-20T10:00:00Z' } : {}));
  });
  await new Promise((r) => sunucu.listen(0, '127.0.0.1', r));
  return { url: `http://127.0.0.1:${sunucu.address().port}`, kapat: () => sunucu.close() };
}

function calistir(betik, env) {
  return new Promise((coz) => {
    const p = spawn(process.execPath, [path.join(HER, betik)], { env: { ...process.env, ...env }, cwd: path.join(HER, '../..') });
    let cikti = '';
    p.stdout.on('data', (d) => (cikti += d));
    p.stderr.on('data', (d) => (cikti += d));
    p.on('close', (kod) => coz({ kod, cikti }));
  });
}

test('acil durdurma: haber botu tur başında 0 ile biter, loga neden yazar', async () => {
  const m = await motorSunucusu(true);
  try {
    const r = await calistir('calistir.mjs', { MOTOR_URL: m.url, MOTOR_ANAHTARI: 'anahtar-anahtar-anahtar', GEMINI_API_KEY: 'test' });
    assert.equal(r.kod, 0, r.cikti);
    assert.match(r.cikti, /Acil durdurma açık: acil durdurma/);
    assert.doesNotMatch(r.cikti, /olay,/);
  } finally {
    m.kapat();
  }
});

test('acil durdurma: iş akışı adımı durdu=1 yazar; açık değilse durdu=0', async () => {
  const dizin = await mkdtemp(path.join(tmpdir(), 'durdu-'));
  for (const [durdu, beklenen] of [[true, 'durdu=1'], [false, 'durdu=0']]) {
    const m = await motorSunucusu(durdu);
    try {
      const cikti = path.join(dizin, `cikti-${beklenen}`);
      const r = await calistir('durdu.mjs', { MOTOR_URL: m.url, MOTOR_ANAHTARI: 'anahtar-anahtar-anahtar', GITHUB_OUTPUT: cikti });
      assert.equal(r.kod, 0, r.cikti);
      assert.match(await readFile(cikti, 'utf8'), new RegExp(beklenen));
    } finally {
      m.kapat();
    }
  }
});
