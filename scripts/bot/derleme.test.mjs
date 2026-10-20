// Dilim derlemesi: alt sınır kuralı ve uzatma (denetci.mjs → derlemeEnAz, denetle opts.uzat).
import test from 'node:test';
import assert from 'node:assert/strict';

process.env.GEMINI_API_KEY = 'test';
process.env.GEMINI_ARALIK_MS = '0';
process.env.GEMINI_BEKLE_CARPAN = '0';
const { derlemeEnAz, denetle, kelimeSayisi, EN_AZ_KELIME } = await import('./denetci.mjs');

const govde = (n) => `${'kelime '.repeat(n - 1).trim()} kelime.`;
const BASLIK = 'Kitle fonlama platformları yeni dönemde ilerliyor';
const taslak = (n) => ({ title: BASLIK, description: 'Dilimin özeti.', body: govde(n), category: 'yatirimlar' });
const KAYNAK = 'Kaynak metni tamamen farklı sözcüklerden oluşur.';

test('derlemeEnAz: min(200, max(150, n×20))', () => {
  assert.equal(derlemeEnAz(2), 150);
  assert.equal(derlemeEnAz(7), 150);
  assert.equal(derlemeEnAz(8), 160);
  assert.equal(derlemeEnAz(10), 200);
  assert.equal(derlemeEnAz(30), EN_AZ_KELIME);
});

// fetch'i yazı işleri, düzeltme ve redaksiyon çağrıları için taklit eder.
function sahteGemini({ onaylar = [], duzeltBody } = {}) {
  const gercek = globalThis.fetch;
  let degerlendirme = 0;
  globalThis.fetch = async (_url, init) => {
    const istem = JSON.parse(init.body).contents[0].parts[0].text;
    let cevap;
    if (istem.includes('yazı işleri müdürüsün')) {
      cevap = onaylar[degerlendirme++] ? { onay: true, sorunlar: [] } : { onay: false, sorunlar: ['Kaynakta yok: bir rakam'] };
    } else if (istem.includes('taslağında sorunlar buldu')) {
      cevap = { title: BASLIK, description: 'Dilimin özeti.', body: duzeltBody };
    } else {
      cevap = { title: BASLIK, description: 'Dilimin özeti.', body: (istem.split('METİN:\n')[1] ?? '').trim() };
    }
    return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify(cevap) }] } }], usageMetadata: {} }));
  };
  return () => (globalThis.fetch = gercek);
}

test('denetle: kısa derleme değerlendirmeden önce uzatılır', async () => {
  const geri = sahteGemini({ onaylar: [true] });
  const cagrilar = [];
  try {
    const r = await denetle(taslak(100), KAYNAK, {
      enAz: derlemeEnAz(2),
      uzat: async (t, kelime) => (cagrilar.push(kelime), { ...t, body: govde(170) }),
    });
    assert.deepEqual(cagrilar, [100]);
    assert.deepEqual(r.sorunlar.filter((s) => s.startsWith('Metin çok kısa')), []);
    assert.ok(kelimeSayisi(r.haber.body) >= 150);
  } finally {
    geri();
  }
});

test('denetle: düzeltme turu derlemeyi alt sınırın altına indirirse bir kez yeniden uzatılır', async () => {
  const geri = sahteGemini({ onaylar: [false, true], duzeltBody: govde(120) });
  const cagrilar = [];
  try {
    const r = await denetle(taslak(100), KAYNAK, {
      enAz: 150,
      uzat: async (t, kelime) => (cagrilar.push(kelime), { ...t, body: govde(170) }),
    });
    assert.deepEqual(cagrilar, [100, 120]); // değerlendirme öncesi, sonra düzeltme sonrası
    assert.deepEqual(r.sorunlar.filter((s) => s.startsWith('Metin çok kısa')), []);
  } finally {
    geri();
  }
});

test('denetle: uzatma işe yaramazsa gerekçede uzatmadan önceki sayı var; en çok iki uzatma', async () => {
  const geri = sahteGemini({ onaylar: [false, false, false, false, false], duzeltBody: govde(100) });
  const cagrilar = [];
  try {
    const r = await denetle(taslak(90), KAYNAK, { enAz: 150, uzat: async (t, kelime) => (cagrilar.push(kelime), t) });
    assert.ok(r.sorunlar.some((s) => /uzatmadan önce 90 kelime/.test(s)));
    assert.ok(r.sorunlar.some((s) => s.startsWith('Metin çok kısa')));
    assert.equal(cagrilar.length, 2);
  } finally {
    geri();
  }
});

test('denetle: opts yoksa tek haber davranışı aynı (200 kelime alt sınırı)', async () => {
  const geri = sahteGemini({ onaylar: [true, true, true, true, true, true], duzeltBody: govde(180) });
  try {
    const r = await denetle(taslak(180), KAYNAK);
    assert.ok(r.sorunlar.some((s) => /en az 200/.test(s)));
  } finally {
    geri();
  }
});

test('denetle: onay veren değerlendirme redaksiyonu da verirse ayrı redaksiyon çağrısı yapılmaz', async () => {
  const gercek = globalThis.fetch;
  const istemler = [];
  globalThis.fetch = async (_url, init) => {
    const istem = JSON.parse(init.body).contents[0].parts[0].text;
    istemler.push(istem);
    const cevap = istem.includes('yazı işleri müdürüsün')
      ? { onay: true, sorunlar: [], duzeltilmis: { title: BASLIK, description: 'Dilimin özeti.', body: govde(210) } }
      : { title: BASLIK, description: 'Dilimin özeti.', body: govde(210) };
    return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify(cevap) }] } }], usageMetadata: {} }));
  };
  try {
    const r = await denetle(taslak(210), KAYNAK);
    assert.equal(istemler.length, 1);
    assert.match(istemler[0], /"duzeltilmis" alanında aynı haberin redaksiyonunu/);
    assert.match(istemler[0], /TDK Yazım Kılavuzu/);
    assert.equal(r.haber.body, govde(210));
    assert.equal(r.haber.category, 'yatirimlar'); // taslağın diğer alanları korunur
  } finally {
    globalThis.fetch = gercek;
  }
});
