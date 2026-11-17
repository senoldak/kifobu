import { test } from 'node:test';
import assert from 'node:assert/strict';
import { metne, para, tamSayi, oran, tarih } from './ayristir.ts';

test('para: para biçimlerini sayıya çevirir, okunamayanı null yapar', () => {
  assert.equal(para('₺5.000.000'), 5000000);
  assert.equal(para('1.000.032 ₺'), 1000032);
  assert.equal(para('121.782'), 121782);
  assert.equal(para(''), null);
  assert.equal(para('yok'), null);
  assert.equal(para(null), null);
  assert.equal(para(undefined), null);
});

test('tamSayi: rakam yoksa null', () => {
  assert.equal(tamSayi('1.234 yatırımcı'), 1234);
  assert.equal(tamSayi('-'), null);
});

test('oran: yüzdeyi orana çevirir', () => {
  assert.equal(oran('%10,00'), 0.1);
  assert.equal(oran('%3,91'), 0.0391);
  assert.equal(oran('yok'), null);
});

test('tarih: iki biçimi ISO tarihe çevirir', () => {
  assert.equal(tarih('16.11.2026'), '2026-11-16');
  assert.equal(tarih('19 Ağustos 2026'), '2026-08-19');
  assert.equal(tarih('16 Ekim 2026'), '2026-10-16');
  assert.equal(tarih('garip'), null);
});

test('metne: script/style siler, etiketleri boşluğa çevirir, varlıkları çözer', () => {
  assert.equal(metne('<p>A&amp;B</p><script>x</script>  <b>C</b>'), 'A&B C');
});

test('metne: adlı Türkçe harf varlıkları çözülür (ü, Ü, ö, Ö, ç, Ç)', () => {
  assert.equal(metne('<b>Y&uuml;zey &Uuml; &ouml;&Ouml; &ccedil;&Ccedil;</b>'), 'Yüzey Ü öÖ çÇ');
});
