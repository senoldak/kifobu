import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { grafDugumleri, satteriGraf } from './yazi.mjs';

const mappe = mkdtempSync(join(tmpdir(), 'yazi-graf-'));
writeFileSync(join(mappe, 'graf-1.json'), JSON.stringify({ form: 'soyle', tittel: 'Kampanya sayısı', kilde: { navn: 'SPK' }, enhet: 'adet', desimaler: 0, serier: [{ navn: 'Kampanya', punkter: [{ x: '2024', y: 87 }, { x: '2025', y: 106 }] }] }));
writeFileSync(join(mappe, 'graf-4.json'), JSON.stringify({ form: 'soyle', tittel: 'İkinci', kilde: { navn: 'SPK' }, enhet: 'adet', desimaler: 0, serier: [{ navn: 'A', punkter: [{ x: '2025', y: 1 }] }] }));
const img = (src) => ({ type: 'element', tagName: 'img', properties: { src, alt: 'x' }, children: [] });
const em = (t) => ({ type: 'element', tagName: 'em', children: [{ type: 'text', value: t }] });
const metin = (t) => ({ type: 'text', value: t });
const p = (...children) => ({ type: 'element', tagName: 'p', children });
const kart = (d) => d.type === 'raw' && /^<figure class="g-kort" data-graf/.test(d.value);

test('grafDugumleri: JSON varsa etkileşimli kart', () => {
  const d = grafDugumleri(p(img('./graf-1.svg')), mappe);
  assert.equal(d.length, 1);
  assert.ok(kart(d[0]));
  assert.match(d[0].value, /Kampanya sayısı/);
});
test('grafDugumleri: JSON yoksa ya da başka resimse null (resim kalır)', () => {
  assert.equal(grafDugumleri(p(img('./graf-2.svg')), mappe), null);
  assert.equal(grafDugumleri(p(img('./cover.png')), mappe), null);
  assert.equal(grafDugumleri(p(metin('Yalnız metin')), mappe), null);
});
test('grafDugumleri: geçersiz JSON derlemeyi düşürmez, null', () => {
  writeFileSync(join(mappe, 'graf-3.json'), '{"form":"yok"}');
  assert.equal(grafDugumleri(p(img('./graf-3.svg')), mappe), null);
});
test('grafDugumleri: yazının italik açıklaması kartın altında aynen kalır; kartın alt başlığı ve kaynak satırı çıkmaz', () => {
  const [d] = grafDugumleri(p(img('./graf-1.svg'), metin('\n'), em('Kampanya sayısı, 2024–2025. Kaynak: SPK.')), mappe);
  assert.match(d.value, /<p class="g-bildetekst"><em>Kampanya sayısı, 2024–2025\. Kaynak: SPK\.<\/em><\/p><\/figure>$/);
  assert.doesNotMatch(d.value, /class="g-kilde"|class="g-under"/);
});
test('grafDugumleri: aynı paragrafta iki grafik iki kart olur', () => {
  const d = grafDugumleri(p(img('./graf-1.svg'), metin('\n'), em('Bir. Kaynak: SPK.'), metin('\n'), img('./graf-4.svg'), metin('\n'), em('İki.')), mappe);
  assert.equal(d.length, 2);
  assert.ok(d.every(kart));
  assert.match(d[1].value, /<em>İki\.<\/em>/);
});
test('grafDugumleri: grafikten sonra gelen metin kendi paragrafında kalır', () => {
  const d = grafDugumleri(p(metin('Önce. '), img('./graf-1.svg'), metin('\n'), em('Kaynak: SPK.'), metin('\nSonraki cümle.')), mappe);
  assert.equal(d.length, 3);
  assert.deepEqual(d[0].children, [metin('Önce. ')]);
  assert.ok(kart(d[1]));
  assert.equal(d[2].tagName, 'p');
  assert.deepEqual(d[2].children, [metin('\nSonraki cümle.')]);
});
test('grafDugumleri: açıklamada metin dışı öğe varsa açıklama kartın altına alınmaz, paragrafta kalır', () => {
  const baglanti = { type: 'element', tagName: 'em', children: [{ type: 'element', tagName: 'a', properties: { href: 'x' }, children: [metin('SPK')] }] };
  const d = grafDugumleri(p(img('./graf-1.svg'), baglanti), mappe);
  assert.equal(d.length, 2);
  assert.match(d[0].value, /class="g-kilde"/);
  assert.equal(d[1].children[0], baglanti);
});

test('satteriGraf: GRAF_KART=0 iken eklenti kapalı (yazı işlerinin onay denetimi)', () => {
  const fileURL = new URL('file:///C:/site/src/content/haberler/x/index.md');
  const once = process.env.GRAF_KART;
  try {
    process.env.GRAF_KART = '0';
    assert.equal(satteriGraf()({ fileURL }), null);
    delete process.env.GRAF_KART;
    assert.equal(satteriGraf()({ fileURL })?.name, 'kifobu-yazi-graf');
    assert.equal(satteriGraf()({ fileURL: new URL('file:///C:/site/src/pages/x.md') }), null);
  } finally {
    if (once === undefined) delete process.env.GRAF_KART;
    else process.env.GRAF_KART = once;
  }
});
