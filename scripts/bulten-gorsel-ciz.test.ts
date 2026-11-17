import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BULTEN } from '../src/data/bulten.ts';
import { bultenSvgCiz } from './bulten-gorsel-ciz.ts';

const oznitelik = (svg: string, ad: string) => Number(svg.match(new RegExp(`data-${ad}="([0-9.]+)"`))?.[1]);

for (const mod of ['post', 'story'] as const) {
  test(`18:00 bülteni ${mod}: ayçiçeği resmi yerine tohum işareti`, () => {
    const s = bultenSvgCiz(mod);
    assert.doesNotMatch(s, /<image/);
    assert.match(s, /fill="#e8b40c"/);
  });

  test(`18:00 bülteni ${mod}: tarih ve sayı eski yazımla ("18 Ekim 2026 / 1531")`, () => {
    assert.match(bultenSvgCiz(mod), new RegExp(`data-tarih="${BULTEN.tarih} / ${BULTEN.sayi}"`));
  });

  test(`18:00 bülteni ${mod}: MKK kutusu ile alt bant arasında en az bir satır boşluk`, () => {
    const s = bultenSvgCiz(mod);
    assert.ok(oznitelik(s, 'mkk-alt') + 24 <= oznitelik(s, 'alt-ust'), `${oznitelik(s, 'mkk-alt')} / ${oznitelik(s, 'alt-ust')}`);
  });
}

const yediYakinda = ['NARPOS', 'NEURATURK', 'NEUROX', 'QUAD ROBOTICS', 'TWINUP', 'DEXCOOK', 'MEDICALTEX'].map((ad) => ({ ad, platform: 'fonbulucu' }));

for (const mod of ['post', 'story'] as const) {
  test(`yakında bölümü ${mod}: üçten fazla kampanyanın hepsi çizilir, MKK boşluğu korunur`, () => {
    const s = bultenSvgCiz(mod, { ...BULTEN, yakinda: yediYakinda });
    for (const y of yediYakinda) assert.match(s, new RegExp(`data-yakinda="${y.ad}"`));
    assert.ok(oznitelik(s, 'mkk-alt') + 24 <= oznitelik(s, 'alt-ust'));
  });
}

test('yakında bölümü: üç ve daha az kampanya tek satırda', () => {
  const s = bultenSvgCiz('post', { ...BULTEN, yakinda: yediYakinda.slice(0, 2) });
  const ys = [...s.matchAll(/data-yakinda="[^"]+" x="[^"]+" y="([0-9.]+)"/g)].map((m) => m[1]);
  assert.equal(ys.length, 2);
  assert.equal(new Set(ys).size, 1);
});

test('değerlemesi 0 olan girişimde değerleme yerine "—" çizilir', () => {
  const g = { ...BULTEN.girisimler[0], degerleme: 0 };
  const svg = bultenSvgCiz('post', { ...BULTEN, girisimler: [g] });
  assert.match(svg, /data-degerleme="—"/);
  assert.doesNotMatch(svg, /data-degerleme="0"/);
  const dolu = bultenSvgCiz('post', { ...BULTEN, girisimler: [{ ...BULTEN.girisimler[0], degerleme: 50_000_000 }] });
  assert.match(dolu, /data-degerleme="50000000"/);
});
