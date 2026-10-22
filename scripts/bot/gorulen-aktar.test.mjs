import { test } from 'node:test';
import assert from 'node:assert/strict';
import { aktarimKayitlari, aktar } from './gorulen-aktar.mjs';
import { motorKimlik } from './motor.mjs';

const ISO = '2026-10-12T00:00:00.000Z';
const A = 'k111111:aaaaaaaaaaaaaaaa';
const B = 'k222222:bbbbbbbbbbbbbbbb';
const C = 'https://haber.example.com/x';
const havuzAcSahte = (kayitlar) => kayitlar.map((k) => k.acik);

test('havuzdaki id aktarılmaz', () => {
  const durum = {
    gorulen: { [A]: ISO, [B]: ISO, [C]: ISO },
    havuz: [{ id: A, sifreli: 'x', acik: { id: A, uyeIdler: [A, B] } }],
  };
  const k = aktarimKayitlari(durum, { havuzAcFn: havuzAcSahte });
  assert.deepEqual(k.map((x) => x.kimlik), [motorKimlik(C)]);
});

test('kimlik motorKimlik(id) ile aynı', () => {
  const [k] = aktarimKayitlari({ gorulen: { [A]: ISO }, havuz: [] }, { havuzAcFn: havuzAcSahte });
  assert.equal(k.kimlik, motorKimlik(A));
  assert.equal(k.durum, 'elendi');
  assert.equal(k.gerekce, 'aktarım: eski düzende karar verildi');
  assert.match(k.kimlik, /^[A-Za-z0-9:_-]{1,128}$/);
});

test('gövde 35 kayıtta bölünür', async () => {
  const gorulen = Object.fromEntries(Array.from({ length: 80 }, (_, i) => [`k1:${String(i).padStart(4, '0')}`, ISO]));
  const govdeler = [];
  const fetchFn = async (url, init) => { govdeler.push(JSON.parse(init.body).haberler.length); return { ok: true, status: 200 }; };
  const n = await aktar({ durum: { gorulen, havuz: [] }, url: 'https://motor.example.com/', anahtar: 't', fetchFn, havuzAcFn: havuzAcSahte });
  assert.deepEqual(govdeler, [35, 35, 10]);
  assert.equal(n, 80);
});

test('istekte kaynak adresi yok', async () => {
  const istekler = [];
  const fetchFn = async (url, init) => { istekler.push({ url, init }); return { ok: true, status: 200 }; };
  await aktar({ durum: { gorulen: { [C]: ISO, [A]: ISO }, havuz: [] }, url: 'https://motor.example.com', anahtar: 't', fetchFn, havuzAcFn: havuzAcSahte });
  assert.equal(istekler[0].url, 'https://motor.example.com/motor/kifobu/kaydet');
  assert.equal(istekler[0].init.headers.Authorization, 'Bearer t');
  assert.ok(!istekler[0].init.body.includes('haber.example.com'));
  assert.ok(!istekler[0].init.body.includes('https://')); // kimlik motorKimlik ile temizlenir; ham adres gitmez
});

test('2xx olmayan yanıtta hata fırlatır', async () => {
  const fetchFn = async () => ({ ok: false, status: 500 });
  await assert.rejects(aktar({ durum: { gorulen: { [A]: ISO }, havuz: [] }, url: 'https://m.example.com', anahtar: 't', fetchFn, havuzAcFn: havuzAcSahte }), /500/);
});

test('havuz açılamazsa hata fırlatır', async () => {
  const durum = { gorulen: { [A]: ISO }, havuz: [{ id: A, sifreli: 'x' }] };
  assert.throws(() => aktarimKayitlari(durum, { havuzAcFn: () => [] }), /havuz/);
});
