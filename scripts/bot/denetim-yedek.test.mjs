import test from 'node:test';
import assert from 'node:assert/strict';

// Katman 4 (Gemini kota planı): Yazı işleri müdürü (degerlendir) evet/hayır denetimidir; denetim zincirinde iki
// Flash-Lite düşerse son halka Gemma olur, Flash değil (yönlendirici Faz 1).
process.env.GEMINI_API_KEY = 'test';
process.env.GEMINI_ARALIK_MS = '0';
process.env.GEMINI_BEKLE_CARPAN = '0';
delete process.env.GEMINI_MODEL;
delete process.env.GEMINI_YEDEK_MODEL;
delete process.env.GEMINI_DENETIM_YEDEK_MODEL;
delete process.env.GEMINI_ZINCIR;
const { degerlendir } = await import('./denetci.mjs');

test('Yazı işleri müdürü (degerlendir): iki Flash-Lite 503 dönerse yedek Gemma', async () => {
  const modeller = [];
  const gercek = globalThis.fetch;
  globalThis.fetch = async (url) => {
    modeller.push(String(url).match(/models\/([^:]+):/)[1]);
    if (modeller.length <= 2) return new Response('meşgul', { status: 503 });
    return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify({ onay: true, sorunlar: [] }) }] } }], usageMetadata: {} }));
  };
  try {
    await degerlendir({ title: 'Başlık', description: 'Spot.', body: 'Metin.' }, 'Kaynak.');
  } finally {
    globalThis.fetch = gercek;
  }
  assert.deepEqual(modeller, ['gemini-3.5-flash-lite', 'gemini-3.1-flash-lite', 'gemma-4-26b-a4b-it']);
});
