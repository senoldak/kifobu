// Dil kapısı + ayrı dil redaksiyonu (denetci.mjs: redakteDene, dilTuru, dil kapısı).
import test from 'node:test';
import assert from 'node:assert/strict';

process.env.GEMINI_API_KEY = 'test';
process.env.GEMINI_ARALIK_MS = '0';
process.env.GEMINI_BEKLE_CARPAN = '0';
const { denetle, redakteDene, dilDuzeltHaber } = await import('./denetci.mjs');

const govde = (n, ek = '') => `${'sözcük '.repeat(n - 1).trim()} sözcük. ${ek}`.trim();
const BASLIK = 'Örnek Girişim yeni yatırım turunu tamamladı';
const KAYNAK = 'Kaynak metni tamamen farklı sözcüklerden oluşur.';
const haber = (body, ek = {}) => ({ title: BASLIK, description: 'Turun özeti.', body, category: 'yatirimlar', ...ek });

// Müdür onaylar; redaksiyon çağrılarına sırayla yanıt verir (son yanıt tekrar edilir).
function sahte(redaksiyonlar) {
  const gercek = globalThis.fetch;
  const istemler = [];
  let i = 0;
  globalThis.fetch = async (_url, init) => {
    const istek = JSON.parse(init.body);
    const istem = istek.contents[0].parts[0].text;
    let cevap;
    if (istem.includes('yazı işleri müdürüsün')) cevap = { onay: true, sorunlar: [] };
    else if (istem.includes('SADECE dilini düzelt')) {
      istemler.push({ istem, istek });
      cevap = redaksiyonlar[Math.min(i++, redaksiyonlar.length - 1)];
    } else cevap = {};
    return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify(cevap) }] } }], usageMetadata: {} }));
  };
  return { istemler, geri: () => (globalThis.fetch = gercek) };
}
const yanit = (body, title = BASLIK) => ({ title, description: 'Turun özeti.', body });
const sessiz = () => {
  const log = console.log;
  console.log = () => {};
  return () => (console.log = log);
};

test('dilDuzeltHaber: başlık, spot ve gövdede güvenli düzeltmeler (zekâ, 3,5 milyar, %40)', () => {
  const d = dilDuzeltHaber({ title: 'Yapay zeka girişimi 3.5 milyar dolar aldı', description: 'Yüzde 40 büyüdü.', body: 'Yapay zeka alanında yüzde 40 artış.' });
  assert.equal(d.title, 'Yapay zekâ girişimi 3,5 milyar dolar aldı');
  assert.equal(d.description, '%40 büyüdü.');
  assert.equal(d.body, 'Yapay zekâ alanında %40 artış.');
});

test('denetle: redaksiyon her haberde ayrı çağrılır; sistem istemi ortak kurallar, medium düşünme, 0.2 sıcaklık', async () => {
  const s = sahte([yanit(govde(210, 'Ek cümle yok.'))]);
  const geri = sessiz();
  try {
    const r = await denetle(haber(govde(210, 'Yapay zeka alanında yüzde 40 artış oldu.')), `${KAYNAK} 40`);
    assert.ok(s.istemler.length >= 1);
    const { istek, istem } = s.istemler[0];
    assert.match(istek.systemInstruction.parts[0].text, /kıdemli redaktörsün/);
    assert.match(istek.systemInstruction.parts[0].text, /%40/);
    assert.equal(istek.generationConfig.temperature, 0.2);
    assert.equal(istek.generationConfig.thinkingConfig?.thinkingLevel, 'medium');
    assert.match(istem, /KAYNAKLAR/);
    assert.deepEqual(r.sorunlar, []);
    assert.match(r.haber.body, /Ek cümle yok/);
  } finally {
    geri();
    s.geri();
  }
});

test('redakteDene: kabul edilen çıktı uygulanır', async () => {
  const s = sahte([yanit(govde(210, 'düzeltildi.'))]);
  try {
    const r = await redakteDene(haber(govde(210)), KAYNAK, {});
    assert.equal(r.kabul, true);
    assert.match(r.haber.body, /düzeltildi/);
    assert.equal(s.istemler.length, 1);
  } finally {
    s.geri();
  }
});

test('redakteDene: kısaltan çıktı reddedilir, ret nedenleriyle bir kez yeniden denenir, kabul edilir', async () => {
  const s = sahte([yanit(govde(100)), yanit(govde(205))]);
  try {
    const r = await redakteDene(haber(govde(210)), KAYNAK, {});
    assert.equal(r.kabul, true);
    assert.equal(s.istemler.length, 2);
    assert.match(s.istemler[1].istem, /Önceki redaksiyon reddedildi/);
    assert.match(s.istemler[1].istem, /%90-115 dışında/);
  } finally {
    s.geri();
  }
});

test('redakteDene: iki deneme de reddedilirse önceki metin korunur ve günlüğe yazılır', async () => {
  const s = sahte([yanit(govde(100))]);
  const gunluk = [];
  const log = console.log;
  console.log = (...a) => gunluk.push(a.join(' '));
  try {
    const once = haber(govde(210));
    const r = await redakteDene(once, KAYNAK, {});
    assert.equal(r.kabul, false);
    assert.equal(r.haber, once);
    assert.equal(s.istemler.length, 2);
    assert.ok(gunluk.some((g) => g.includes('dil redaksiyonu atıldı:') && g.includes('%90-115')));
  } finally {
    console.log = log;
    s.geri();
  }
});

test('redakteDene: kaynakta olmayan rakam ekleyen çıktı reddedilir', async () => {
  const s = sahte([yanit(govde(210, 'Şirket 777 milyon dolar aldı.'))]);
  const geri = sessiz();
  try {
    const r = await redakteDene(haber(govde(210)), KAYNAK, {});
    assert.equal(r.kabul, false);
    assert.ok(r.nedenler.length);
  } finally {
    geri();
    s.geri();
  }
});

test('dil kapısı: yazıyla yazılmış sayı redaksiyonla da düzelmezse haber yayımlanmaz (dil: öneki)', async () => {
  const kotu = govde(210, 'Şirket otuz dört milyon dolar yatırım aldı.');
  const s = sahte([yanit(kotu)]);
  const geri = sessiz();
  try {
    const r = await denetle(haber(kotu), KAYNAK);
    assert.ok(r.sorunlar.some((x) => x.startsWith('dil:') && /yazıyla/.test(x)), r.sorunlar.join('|'));
  } finally {
    geri();
    s.geri();
  }
});

test('dil kapısı: kapıdaki redaksiyon turu yazılı sayıyı düzeltirse haber geçer', async () => {
  const kotu = govde(210, 'Şirket otuz dört milyon dolar yatırım aldı.');
  const iyi = govde(210, 'Şirket 34 milyon dolar yatırım aldı.');
  const s = sahte([yanit(kotu), yanit(iyi)]);
  const geri = sessiz();
  try {
    const r = await denetle(haber(kotu), `${KAYNAK} 34 milyon dolar.`);
    assert.deepEqual(r.sorunlar, []);
    assert.match(r.haber.body, /34 milyon dolar/);
  } finally {
    geri();
    s.geri();
  }
});

test('dil kapısı: çevrilmemiş İngilizce cümle yayını durdurur', async () => {
  const kotu = govde(210, 'The company said that it will raise more money in the next round.');
  const s = sahte([yanit(kotu)]);
  const geri = sessiz();
  try {
    const r = await denetle(haber(kotu), KAYNAK);
    assert.ok(r.sorunlar.some((x) => x.startsWith('dil:') && /İngilizce/.test(x)), r.sorunlar.join('|'));
  } finally {
    geri();
    s.geri();
  }
});

test('dil kapısı: başlıktaki yazılı sayı da engeller', async () => {
  const g = govde(210);
  const t = 'Örnek Girişim otuz dört milyon dolar aldı';
  const s = sahte([yanit(g, t)]);
  const geri = sessiz();
  try {
    const r = await denetle(haber(g, { title: t }), KAYNAK);
    assert.ok(r.sorunlar.some((x) => x.startsWith('dil:')), r.sorunlar.join('|'));
  } finally {
    geri();
    s.geri();
  }
});

test('denetle: dilDuzeltTr çıktıya uygulanır (zekâ, %) redaksiyon atılsa bile', async () => {
  const s = sahte([yanit(govde(50))]); // redaksiyon reddedilir
  const geri = sessiz();
  try {
    const r = await denetle(haber(govde(210, 'Yapay zeka alanında yüzde 40 artış oldu.'), { title: 'Örnek Girişim yapay zeka turunu tamamladı' }), `${KAYNAK} 40`);
    assert.match(r.haber.body, /Yapay zekâ alanında %40 artış/);
    assert.match(r.haber.title, /yapay zekâ/);
  } finally {
    geri();
    s.geri();
  }
});
