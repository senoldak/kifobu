import { test } from 'node:test';
import assert from 'node:assert/strict';
import { detayGetir } from './getir.ts';
import type { Okuyucu } from '../../src/lib/kampanya-takip.ts';

const ANINDA = async () => {};

const okuyucu = (ek?: (u: string) => string[]): Okuyucu => ({
  platform: 'deneme',
  listeUrller: [],
  liste: () => [],
  detay: () => {
    throw new Error('kullanılmaz');
  },
  ...(ek ? { ekSayfalar: ek } : {}),
});

test('detayGetir: ekSayfalar yoksa yalnız ana sayfayı getirir', async () => {
  const istenen: string[] = [];
  const html = await detayGetir(okuyucu(), 'https://a.example.com/k', async (u) => {
    istenen.push(u);
    return 'ANA';
  });
  assert.equal(html, 'ANA');
  assert.deepEqual(istenen, ['https://a.example.com/k']);
});

test('detayGetir: ana ve ek sayfaları sırayla getirip "\n" ile birleştirir', async () => {
  const istenen: string[] = [];
  const html = await detayGetir(okuyucu((u) => [`${u}/ek1`, `${u}/ek2`]), 'https://a.example.com/k', async (u) => {
    istenen.push(u);
    return `<${u.split('/').pop()}>`;
  }, ANINDA);
  assert.deepEqual(istenen, ['https://a.example.com/k', 'https://a.example.com/k/ek1', 'https://a.example.com/k/ek2']);
  assert.equal(html, '<k>\n<ek1>\n<ek2>');
});

test('detayGetir: ek sayfa başarısızsa yalnız ana sayfayı döner', async () => {
  const html = await detayGetir(okuyucu((u) => [`${u}/ek`]), 'https://a.example.com/k', async (u) => {
    if (u.endsWith('/ek')) throw new Error('404');
    return 'ANA';
  }, ANINDA);
  assert.equal(html, 'ANA');
});

test('detayGetir: ana sayfa başarısızsa fırlatır', async () => {
  await assert.rejects(
    detayGetir(okuyucu(), 'https://a.example.com/k', async () => {
      throw new Error('çöktü');
    }),
    /çöktü/,
  );
});
