import { test } from 'node:test';
import assert from 'node:assert/strict';
import { detayGetir, pdfMetneCevir } from './getir.ts';
import { PDF_AYRACI } from '../../src/lib/kampanya-takip.ts';
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

// ---- Zincirleme sayfa (sonrakiSayfa) ve PDF ----

const zincirliOkuyucu = (sonraki: (html: string, url: string) => string | null): Okuyucu => ({ ...okuyucu(), sonrakiSayfa: sonraki });

test('detayGetir: sonrakiSayfa her getirilen sayfadan bir sonrakini ister, null olunca durur', async () => {
  const istenen: string[] = [];
  const zincir: Record<string, string | null> = { A: 'https://b.example.com/B', B: 'https://c.example.com/C', C: null };
  const html = await detayGetir(
    zincirliOkuyucu((h) => zincir[h]),
    'https://a.example.com/A',
    async (u) => {
      istenen.push(u);
      return u.split('/').pop()!;
    },
    ANINDA,
  );
  assert.deepEqual(istenen, ['https://a.example.com/A', 'https://b.example.com/B', 'https://c.example.com/C']);
  assert.equal(html, 'A\nB\nC');
});

test('detayGetir: zincir en çok 3 adım gider (döngüye girmez)', async () => {
  let sayac = 0;
  await detayGetir(zincirliOkuyucu(() => 'https://a.example.com/tekrar'), 'https://a.example.com/A', async () => {
    sayac++;
    return 'X';
  }, ANINDA);
  assert.equal(sayac, 4); // ana + 3 adım
});

test('detayGetir: zincirde bir adım başarısızsa o ana kadar getirilenler döner', async () => {
  const html = await detayGetir(
    zincirliOkuyucu((h) => (h === 'A' ? 'https://b.example.com/B' : h === 'B' ? 'https://c.example.com/C' : null)),
    'https://a.example.com/A',
    async (u) => {
      if (u.endsWith('/C')) throw new Error('404');
      return u.split('/').pop()!;
    },
    ANINDA,
  );
  assert.equal(html, 'A\nB');
});

test('detayGetir: .pdf adresi PDF getiricisiyle alınır, metni PDF_AYRACI ile eklenir', async () => {
  const html = await detayGetir(
    zincirliOkuyucu((h) => (h === 'A' ? 'https://a.example.com/api/file/x.pdf' : null)),
    'https://a.example.com/A',
    async () => 'A',
    ANINDA,
    async (u) => `PDF(${u.split('/').pop()})`,
  );
  assert.equal(html, `A\n${PDF_AYRACI}PDF(x.pdf)`);
});

test('pdfMetneCevir: dönüştürücü bulunamazsa anlaşılır hatayla reddeder', async () => {
  await assert.rejects(pdfMetneCevir(Buffer.from('%PDF-1.4'), 'boyle-bir-komut-yok-xyz'), /PDF metne çevrilemedi/);
});
