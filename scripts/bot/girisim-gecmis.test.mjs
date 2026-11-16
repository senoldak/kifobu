import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { girisimBul, girisimListesi, girisimleriKur, kanitVar, zenginlestir } from './girisim-gecmis.mjs';

const rot = path.resolve(import.meta.dirname, '../..');

test('Bebehum: iki tur, kayıttan rakamlar, sayfa bağlantısı, boş künye dolar', async () => {
  const liste = await girisimListesi(rot);
  const haber = { title: 't', body: 'Gürler Global yeni pazarlara açıldı.' };
  const z = zenginlestir(haber, { girisim: 'Bebehum' }, liste, 'Bebehum Köprü Yatırım Turu duyurusu');
  assert.equal(z.girisim, 'bebehum');
  assert.match(z.haber.body, /^Gürler Global yeni pazarlara açıldı\.\n\n## 2 kampanyada 75,8 milyon TL/);
  assert.match(z.haber.body, /Bebehum kitle fonlamasına 2 kez çıktı/);
  assert.match(z.haber.body, /3\.247 yatırımcı 32,2 milyon TL yatırdı/);
  assert.match(z.haber.body, /360 milyon TL değer/);
  assert.match(z.haber.body, /\[Bebehum sayfasında\]\(\/girisim\/bebehum\/\)/);
  assert.deepEqual({ ...z.kunye }, { girisim: 'Bebehum', platform: 'Fonbulucu', toplanan: 43612637, hedef: 36000000, yatirimci: 2303, durum: 'basarili', paraBirimi: 'TRY' });
});

test('haberin kendi künyesi (yeni tur) korunur', async () => {
  const liste = await girisimListesi(rot);
  const z = zenginlestir({ body: 'x kitle fonlaması' }, { girisim: 'Bebehum', toplanan: 5, hedef: 10 }, liste);
  assert.equal(z.kunye.toplanan, 5);
  assert.equal(z.kunye.platform, undefined);
});

test('kanıt yoksa aynı adlı yabancı girişim bağlanmaz', () => {
  const liste = girisimleriKur([{ anahtar: 'SUGAR', ad: 'Sugar', platform: 'fonbulucu', durum: 'fonlandi', baslangic: '2024-01-01', bitis: null, hedef: 1e6, alinan: 1e6, sirket: 'ŞEKER YAZILIM A.Ş.' }]);
  const z = zenginlestir({ body: 'Sugar raised a Series A in New York.' }, { girisim: 'Sugar' }, liste, 'Sugar raised $10M');
  assert.equal(z.girisim, null);
  assert.ok(kanitVar(liste[0], 'Fonbulucu kampanyası'));
});

test('belirsiz eşleşme ve kısa ad bağlanmaz', () => {
  const k = (ad, anahtar) => ({ anahtar, ad, platform: 'p', durum: 'fonlandi', baslangic: '2024-01-01', hedef: 1, alinan: 1, sirket: null });
  const liste = girisimleriKur([k('Ortak', 'A'), k('Ortak', 'B')]);
  assert.equal(girisimBul(liste, 'Ortak'), null);
  assert.equal(girisimBul(liste, 'Or'), null);
});
