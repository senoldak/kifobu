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
