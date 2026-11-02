import test from 'node:test';
import assert from 'node:assert/strict';
import { AJANLAR, adimlar, derlemeMi, insanOkumadi, olguSatiri, sahipYazisi } from './hazirlanis.mjs';

const bot = { uretim: 'yapay-zeka', category: 'yatirimlar', title: 'Egaranti, Seri A öncesi turda 1,1 milyon dolar yatırım aldı' };

test('bot haberi: yedi adım, hepsi kayıtlı ajan; haber değeri varsa metinde', () => {
  const a = adimlar({ ...bot, haberDegeri: 72 });
  assert.deepEqual(a.map((x) => x.id), ['nil', 'baran', 'ece', 'derya', 'tuna', 'kaan', 'ada']);
  assert.ok(a.every((x) => AJANLAR[x.id]?.yz));
  assert.match(a[1].metin, /100 üzerinden 72/);
  assert.doesNotMatch(adimlar(bot)[1].metin, /\d+ buldu/);
  assert.equal(insanOkumadi(bot), true);
});

test('derleme: altı adım; eski derleme başlıktan tanınır', () => {
  assert.equal(derlemeMi({ uretim: 'yapay-zeka', title: 'Even Healthcare, seri B turunda 50 milyon dolar yatırım aldı · 20 Ekim, açılış' }), true);
  assert.equal(derlemeMi({ ...bot, derleme: true }), true);
  assert.equal(derlemeMi(bot), false);
  assert.equal(adimlar({ ...bot, derleme: true }).length, 6);
});

test('sahibin yazısı: Şenol Dak ve Elif; insan okudu', () => {
  for (const h of [{ author: 'Şenol Dak' }, { yaziTuru: 'analiz', uretim: 'yazi-isleri' }]) {
    assert.equal(sahipYazisi(h), true);
    assert.deepEqual(adimlar(h).map((x) => x.id), ['senol', 'elif']);
    assert.equal(insanOkumadi(h), false);
  }
  assert.deepEqual(olguSatiri({ author: 'Şenol Dak' })[0], { on: 'Yazan ', kalin: 'Şenol Dak' });
});

test('kart çıkmayan yazılar: günlük bülten, zincirin sahibe ait olmayan yazısı, elle girilen', () => {
  assert.equal(adimlar({ uretim: 'yapay-zeka', category: 'gunluk-bulten' }), null);
  assert.equal(adimlar({ uretim: 'yazi-isleri', yaziTuru: 'haber' }), null);
  assert.equal(adimlar({ uretim: 'editor' }), null);
});

test('olguSatiri: haber değeri yoksa boş, varsa tek parça', () => {
  assert.deepEqual(olguSatiri(bot), []);
  assert.deepEqual(olguSatiri({ ...bot, haberDegeri: 61 }), [{ on: 'Haber değeri ', kalin: '61', son: '/100' }]);
});
