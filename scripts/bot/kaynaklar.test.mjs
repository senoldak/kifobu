import { test } from 'node:test';
import assert from 'node:assert/strict';
import { anahtarlar, benzer } from './kaynaklar.mjs';

const ayni = (a, b) => benzer(anahtarlar(a), anahtarlar(b));

test('benzer: yalnız kalıp kelimeleri ortak olan farklı turlar aynı olay sayılmaz', () => {
  // 22 Ekim: yerli tur haberleri bu yüzden "zaten yazıldı" diye eleniyordu.
  assert.equal(ayni('Türk oyun şirketi Örnekoyun, 49 milyon dolar yatırım aldı', 'Albert, Seri B turunda 55 milyon dolar yatırım aldı'), false);
  assert.equal(ayni('Ayşe Örnek’in kurduğu Uzayco, e2vc liderliğinde tohum öncesi yatırım aldı', 'Marklo, tohum aşamasında yatırım aldı'), false);
  assert.equal(ayni('Telekomco, ACT Venture Partners’tan 1 milyon euro yatırım aldı', 'CarbonFarm 7 milyon euro seri A yatırım aldı'), false);
  assert.equal(ayni('Acme raises $20 million in Series A funding round', 'Globex raises $35 million Series A round'), false);
});

test('benzer: aynı olay farklı yazılsa da eşleşir', () => {
  assert.equal(ayni('Örnekoyun, 49 milyon dolar yatırım aldı', 'Türk oyun şirketi Örnekoyun, 49 milyon dolar yatırım aldı'), true);
  assert.equal(ayni('Paidex, DOMiNO Ventures’ın da katıldığı turda 1 milyon dolar yatırım aldı', 'Dijital yatırım platformu Paidex, DOMiNO Ventures’ın katıldığı turda 1 milyon dolar yatırım aldı'), true);
  assert.equal(ayni('Acme raises $20 million Series A', 'Acme, Seri A turunda 20 milyon dolar yatırım aldı'), true);
});
