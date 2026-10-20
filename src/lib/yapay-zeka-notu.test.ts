import test from 'node:test';
import assert from 'node:assert/strict';
import { yapayZekaNotu, hataBildirMailto, BOT_NOTU, SAHIP_NOTU } from './yapay-zeka-notu.ts';

const URL_ = 'https://kifobu.com/haber/ornek/';

test('bot haberi otomatik yazı notunu alır, sahip notunu almaz', () => {
  const n = yapayZekaNotu({ uretim: 'yapay-zeka', author: 'kifobu', yaziTuru: 'haber' }, 'Örnek haber', URL_);
  assert.equal(n?.tur, 'bot');
  assert.equal(n?.metin, BOT_NOTU);
  assert.equal(n?.baglantiMetni, 'Hata bildir →');
});

test('sahibin adıyla ya da yazı türü dolu yazı araç kullanımı notunu alır', () => {
  assert.equal(yapayZekaNotu({ uretim: 'editor', author: 'Şenol Dak' }, 'x', URL_)?.metin, SAHIP_NOTU);
  assert.equal(yapayZekaNotu({ uretim: 'yapay-zeka', yaziTuru: 'aciklayici' }, 'x', URL_)?.tur, 'sahip');
});

test('bot değil, sahip değil: not yok', () => {
  assert.equal(yapayZekaNotu({ uretim: 'editor', author: 'kifobu', yaziTuru: 'haber' }, 'x', URL_), null);
});

test('mailto: konu ve gövde kodlanır, gövde tam adres', () => {
  const m = hataBildirMailto('Örnek & haber', URL_);
  assert.ok(m.startsWith('mailto:contact@kifobu.com?subject='));
  assert.ok(m.includes(encodeURIComponent('Hata bildirimi: Örnek & haber')));
  assert.ok(m.endsWith(`body=${encodeURIComponent(URL_)}`));
});

test('"Sorumlu" kelimesi notlarda yok', () => {
  assert.doesNotMatch(`${BOT_NOTU}${SAHIP_NOTU}`, /sorumlu/i);
});
