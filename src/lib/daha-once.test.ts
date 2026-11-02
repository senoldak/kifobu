import test from 'node:test';
import assert from 'node:assert/strict';
import { ayniKonu, dahaOnce, ozelAdlar, type OnceAday } from './daha-once.ts';

const h = (id: string, title: string, gun: number, ek: Partial<OnceAday['data']> = {}): OnceAday => ({
  id,
  data: { title, date: new Date(Date.UTC(2026, 9, gun)), category: 'yatirimlar', uretim: 'yapay-zeka', ...ek },
});
const benzer = () => 0.9;
const uzak = () => 0.5;

test('ozelAdlar: büyük harfli adlar, genel sözcükler ve ekler atılır', () => {
  assert.deepEqual([...ozelAdlar("Nvidia'dan Birleşik Krallık'taki araştırmacılara destek")], ['nvidia']);
  assert.deepEqual([...ozelAdlar('Ares Intelligence, Seri A turunda yatırım aldı')], ['ares']);
});

test('ayniKonu: aynı girişim yeter; ortak ad yalnız anlam benzerliğiyle', () => {
  assert.equal(ayniKonu(h('a', 'X aldı', 2, { girisim: 'egaranti' }), h('b', 'Y oldu', 1, { girisim: 'Egaranti' }), uzak), true);
  assert.equal(ayniKonu(h('a', 'Nvidia Avrupa yatırımı', 2), h('b', 'Nvidia İngiltere desteği', 1), benzer), true);
  assert.equal(ayniKonu(h('a', 'Nvidia Avrupa yatırımı', 2), h('b', 'Nvidia İngiltere desteği', 1), uzak), false);
  assert.equal(ayniKonu(h('a', 'Ares Intelligence yatırım aldı', 2), h('b', 'Enact Intelligence yatırım aldı', 1), benzer), false);
});

test('dahaOnce: yalnız eski haberler, eskiden yeniye, en çok dört; bülten, derleme ve sahibin yazısı sayılmaz', () => {
  const bu = h('bu', 'Nvidia son yatırım', 21);
  const hepsi = [
    bu,
    h('a', 'Nvidia birinci', 14),
    h('b', 'Nvidia ikinci', 15),
    h('c', 'Nvidia üçüncü', 16),
    h('d', 'Nvidia dördüncü', 17),
    h('e', 'Nvidia beşinci', 18),
    h('sonra', 'Nvidia sonra', 25),
    h('bulten', 'Nvidia bülten', 19, { category: 'gunluk-bulten' }),
    h('derleme', 'Nvidia derleme', 19, { derleme: true }),
    h('analiz', 'Nvidia analizi', 19, { author: 'Şenol Dak' }),
  ];
  assert.deepEqual(dahaOnce(bu, hepsi, benzer).map((x) => x.id), ['b', 'c', 'd', 'e']);
  assert.deepEqual(dahaOnce(h('analiz2', 'Nvidia', 22, { yaziTuru: 'analiz' }), hepsi, benzer), []);
});
