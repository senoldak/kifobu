import { test } from 'node:test';
import assert from 'node:assert/strict';
import { urlAnahtari } from './kampanya-takip.ts';

test('urlAnahtari: büyük/küçük harf ve pid dışındaki parametreler anahtarı değiştirmez', () => {
  assert.equal(
    urlAnahtari('https://Fonangels.com/kampanyalar/projehakkinda/VisitExtra?pid=1803&utm=x'),
    urlAnahtari('https://fonangels.com/kampanyalar/projehakkinda/visitextra?pid=1803'),
  );
});

test('urlAnahtari: sondaki eğik çizgi anahtarı değiştirmez', () => {
  assert.equal(
    urlAnahtari('https://kfs.trinkfon.com/projeler/pupaq/kampanya'),
    urlAnahtari('https://kfs.trinkfon.com/projeler/pupaq/kampanya/'),
  );
});

test('urlAnahtari: farklı pid farklı anahtar verir', () => {
  assert.notEqual(
    urlAnahtari('https://fonangels.com/kampanyalar/projehakkinda/visitextra?pid=1803'),
    urlAnahtari('https://fonangels.com/kampanyalar/projehakkinda/visitextra?pid=1804'),
  );
});

test('urlAnahtari: fongogo URLKey kimliği taşır', () => {
  const taban = 'https://yatirim.fongogo.com/ProjectDetail/PreliminaryInformation';
  assert.notEqual(urlAnahtari(`${taban}?URLKey=ilk-proje`), urlAnahtari(`${taban}?URLKey=ikinci-proje`));
  assert.equal(
    urlAnahtari(`${taban}?URLKey=Ilk-Proje&utm_source=x`),
    urlAnahtari(`${taban}?urlkey=ilk-proje`),
  );
});
