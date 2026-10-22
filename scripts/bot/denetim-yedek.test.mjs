import test from 'node:test';
import assert from 'node:assert/strict';

// Katman 4 (Gemini kota planı): Yazı işleri müdürü (degerlendir) evet/hayır denetimidir; ana model düşerse yedek Gemma olur, Flash değil.
process.env.GEMINI_API_KEY = 'test';
process.env.GEMINI_ARALIK_MS = '0';
process.env.GEMINI_BEKLE_CARPAN = '0';
delete process.env.GEMINI_MODEL;
delete process.env.GEMINI_YEDEK_MODEL;
delete process.env.GEMINI_DENETIM_YEDEK_MODEL;
const { degerlendir } = await import('./denetci.mjs');

test('Yazı işleri müdürü (degerlendir): ana model 503 dönerse yedek Gemma', async () => {
  const modeller = [];
  const gercek = globalThis.fetch;
  globalThis.fetch = async (url) => {
    modeller.push(String(url).match(/models\/([^:]+):/)[1]);
    if (modeller.length === 1) return new Response('meşgul', { status: 503 });
    return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify({ onay: true, sorunlar: [] }) }] } }], usageMetadata: {} }));
  };
  try {
    await degerlendir({ title: 'Başlık', description: 'Spot.', body: 'Metin.' }, 'Kaynak.');
  } finally {
    globalThis.fetch = gercek;
  }
  assert.deepEqual(modeller, ['gemini-flash-lite-latest', 'gemma-4-26b-a4b-it']);
});
