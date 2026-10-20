// node --test scripts/bot/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ayniOlayMi, ciftleriKur, onbellekliEsle, ozelAdlar, uygula } from './esleme.mjs';
import { onbellekliPuanla, onEle } from './yazar.mjs';

const haber = (id, baslik) => ({ id, baslik, adlar: ozelAdlar(baslik) });
const hic = () => false;

test('özel adlar iki dilde aynı çıkar, yaygın kelimeler atılır', () => {
  assert.deepEqual([...ozelAdlar('Persona Raises $10M Seed Round Led By Accel')].sort(), ['accel', 'persona']);
  const en = ozelAdlar('Persona raises $10M seed round led by Accel');
  const tr = ozelAdlar("Yapay zekâ girişimi Persona, Accel liderliğinde 10 milyon dolar yatırım aldı");
  assert.ok(en.has('persona') && en.has('accel'));
  assert.ok(tr.has('persona') && tr.has('accel'));
  assert.ok(!tr.has('yapay') && !en.has('raises'));
});

test('yazılmış haberle ortak özel adı olan olay sorulur, cevap evetse yazılmış sayılır', () => {
  const g = { uyeler: [haber('tc:1', 'Persona raises $10M led by Accel')] };
  const yazilmis = [{ id: 'haber:persona', metin: 'Persona 10 milyon dolar yatırım aldı', adlar: ozelAdlar("Persona'ya Accel'den 10 milyon dolar") }];
  const ciftler = ciftleriKur([g], yazilmis, hic);
  assert.equal(ciftler.length, 1);
  assert.equal(ciftler[0].tur, 'yazili');
  const { gruplar } = uygula([g], ciftler, new Set([0]));
  assert.equal(gruplar[0].yazilmis, true);
});

test('Türkçe ve İngilizce gruplar birleşir, Türkçe grubun başı korunur', () => {
  const tr = { uyeler: [haber('wr:1', 'Getir, Mubadala liderliğinde yeni yatırım aldı')] };
  const en = { uyeler: [haber('tc:2', 'Getir lands new funding from Mubadala')] };
  const ciftler = ciftleriKur([tr, en], [], hic);
  assert.equal(ciftler.length, 1);
  const { gruplar } = uygula([tr, en], ciftler, new Set([0]));
  assert.equal(gruplar.length, 1);
  assert.deepEqual(gruplar[0].uyeler.map((u) => u.id), ['wr:1', 'tc:2']);
});

test('aynı olay değilse gruptan çıkar ve çift ayrık kaydedilir', () => {
  const g = { uyeler: [haber('a', 'Acme raises Series A'), haber('b', 'Acme launches new product')] };
  const ciftler = ciftleriKur([g], [], hic);
  const { gruplar, ayrik } = uygula([g], ciftler, new Set());
  assert.equal(gruplar.length, 2);
  assert.deepEqual(ayrik, [['a', 'b']]);
});

test('daha önce ayrık denen çift tekrar sorulmaz', () => {
  const x = { uyeler: [haber('a', 'Getir yatırım aldı')] };
  const y = { uyeler: [haber('b', 'Getir closes Istanbul office')] };
  assert.equal(ciftleriKur([x, y], [], (p, q) => [p, q].sort().join() === 'a,b').length, 0);
});

test('ayniOlayMi: geçersiz numaralar atılır, cevap yoksa null', async () => {
  const c = [{ a: 'x', b: 'y' }];
  assert.deepEqual([...(await ayniOlayMi(c, { kall: async () => ({ ayni: [0, 5, -1] }) }))], [0]);
  assert.equal(await ayniOlayMi(c, { kall: async () => null }), null);
});

test('onEle: puanlar 0–100 sınırlanır, atlanan başlık puansız kalır (yazılmaz, yeniden sorulur)', async () => {
  const p = await onEle(['a', 'b', 'c'], { kall: async () => ({ puanlar: [{ nr: 0, puan: 140 }, { nr: 2, puan: 0 }] }) });
  assert.deepEqual(p, [100, undefined, 0]);
});

test('onbellekliEsle: bilinen "aynı" çift tekrar sorulmaz, yeni evet kaydedilir', async () => {
  const ciftler = [{ idA: 'a', idB: 'b' }, { idA: 'c', idB: 'd' }, { idA: 'e', idB: 'f' }];
  const bilinen = { 'a|b': 't0' };
  let sorulan;
  const ayni = await onbellekliEsle(ciftler, bilinen, (c) => `${c.idA}|${c.idB}`, {
    zaman: 't1',
    sor: async (l) => ((sorulan = l), new Set([1])),
  });
  assert.deepEqual(sorulan.map((c) => c.idA), ['c', 'e']);
  assert.deepEqual([...ayni].sort(), [0, 2]);
  assert.equal(bilinen['e|f'], 't1');
});

test('onbellekliPuanla: kayıtlı puan yeniden sorulmaz', async () => {
  const kayit = { x: { puan: 95, olcek: 100, zaman: 't0' } };
  let sorulan;
  const p = await onbellekliPuanla(['Eski olay QQ1', 'Yeni olay QQ2'], ['x', 'y'], kayit, {
    zaman: 't1',
    kall: async ({ prompt }) => ((sorulan = prompt), { puanlar: [{ nr: 0, puan: 20 }] }),
  });
  assert.deepEqual(p, [95, 20]);
  assert.ok(sorulan.includes('0. Yeni olay QQ2') && !sorulan.includes('QQ1'));
  assert.deepEqual(kayit.y, { puan: 20, olcek: 100, zaman: 't1' });
});

test('onbellekliPuanla: eski 0–5 ölçekli kayıt yok sayılır, yeniden puanlanır', async () => {
  const kayit = { x: { puan: 4, zaman: 't0' } };
  const p = await onbellekliPuanla(['Eski ölçekli olay'], ['x'], kayit, { zaman: 't1', kall: async () => ({ puanlar: [{ nr: 0, puan: 75 }] }) });
  assert.deepEqual(p, [75]);
  assert.deepEqual(kayit.x, { puan: 75, olcek: 100, zaman: 't1' });
});

// Katman 4: aynı olay eşlemesi evet/hayır denetimidir; ana model düşerse yedek Gemma olur.
test('ayniOlayMi denetim çağrısı olarak gider', async () => {
  let p;
  await ayniOlayMi([{ a: 'Başlık A', b: 'Headline B' }], { kall: async (x) => { p = x; return { ayni: [] }; } });
  assert.equal(p.denetim, true);
});
