import { test } from 'node:test';
import assert from 'node:assert/strict';
import { bildir } from './bildir.ts';

const ORTAM = { MOTOR_URL: 'https://saat.example.com', MOTOR_ANAHTARI: 'gizli-anahtar' };

test('bildir: doğru adrese, Bearer başlığı ve { metin } gövdesiyle POST eder', async () => {
  const cagrilar: { url: string; init: RequestInit }[] = [];
  const sahte = (async (url: string, init: RequestInit) => {
    cagrilar.push({ url, init });
    return new Response(JSON.stringify({ gonderildi: true }), { status: 200 });
  }) as unknown as typeof fetch;
  assert.equal(await bildir('merhaba', ORTAM, sahte), true);
  assert.equal(cagrilar.length, 1);
  assert.equal(cagrilar[0].url, 'https://saat.example.com/motor/kifobu/bildirim');
  assert.equal(cagrilar[0].init.method, 'POST');
  const basliklar = cagrilar[0].init.headers as Record<string, string>;
  assert.equal(basliklar.Authorization, 'Bearer gizli-anahtar');
  assert.equal(basliklar['Content-Type'], 'application/json');
  assert.deepEqual(JSON.parse(String(cagrilar[0].init.body)), { metin: 'merhaba' });
});

test('bildir: metni 3500 karaktere kırpar', async () => {
  let govde = '';
  const sahte = (async (_u: string, init: RequestInit) => {
    govde = String(init.body);
    return new Response('{}', { status: 200 });
  }) as unknown as typeof fetch;
  await bildir('a'.repeat(5000), ORTAM, sahte);
  assert.equal(JSON.parse(govde).metin.length, 3500);
});

test('bildir: ortam boşken false döner ve fetch çağrılmaz', async () => {
  let cagri = 0;
  const sahte = (async () => {
    cagri++;
    return new Response('{}');
  }) as unknown as typeof fetch;
  assert.equal(await bildir('x', {}, sahte), false);
  assert.equal(await bildir('x', { MOTOR_URL: 'https://a.example.com' }, sahte), false);
  assert.equal(cagri, 0);
});

test('bildir: başarısız yanıtta false döner, fırlatmaz', async () => {
  const sahte = (async () => new Response('yok', { status: 404 })) as unknown as typeof fetch;
  assert.equal(await bildir('x', ORTAM, sahte), false);
});

test('bildir: fetch fırlatırsa false döner ve anahtarı yazdırmaz', async () => {
  const sahte = (async () => {
    throw new Error('ağ yok');
  }) as unknown as typeof fetch;
  const eskiLog = console.log;
  const satirlar: string[] = [];
  console.log = (...a: unknown[]) => satirlar.push(a.join(' '));
  try {
    assert.equal(await bildir('x', ORTAM, sahte), false);
  } finally {
    console.log = eskiLog;
  }
  assert.ok(!satirlar.join('\n').includes('gizli-anahtar'));
});
