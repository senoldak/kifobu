import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import {
  BEKLEME_MS,
  ONAY_ARALIGI_MS,
  abonelikIstegi,
  ayrilIstegi,
  ayrilSayfasi,
  bultenUrl,
  epostaDogrula,
  epostaIcerigi,
  haftalikGonderim,
  haftalikIcerik,
  isoHafta,
  onayIstegi,
  type Ortam,
} from './bulten.ts';
import worker from './index.ts';

// Sahte D1: gerçek SQLite (node:sqlite) üzerinde, migration dosyasının şemasıyla. Üretimde D1 aynı SQL'i çalıştırır.
function sahteD1(veritabani: DatabaseSync) {
  return {
    prepare(sql: string) {
      const st = veritabani.prepare(sql);
      let args: unknown[] = [];
      const h = {
        bind(...v: unknown[]) {
          args = v;
          return h;
        },
        async first() {
          return (st.get(...(args as never[])) ?? null) as never;
        },
        async all() {
          return { results: st.all(...(args as never[])) as never[] };
        },
        async run() {
          return st.run(...(args as never[]));
        },
      };
      return h;
    },
  };
}

const MIGRASYON = readFileSync(new URL('../migrations/0001_bulten.sql', import.meta.url), 'utf8');
const JSON_ICERIK = {
  haberler: [
    { baslik: 'Örnek girişim tur kapattı', ozet: 'Özet bir.', url: 'https://kifobu.com/haber/ornek-bir/', tarih: '2026-10-14T09:00:00.000Z' },
    { baslik: 'Eski haber', ozet: 'Çok eski.', url: 'https://kifobu.com/haber/eski/', tarih: '2026-09-01T09:00:00.000Z' },
    { baslik: 'Dış adres', ozet: 'Kabul edilmez.', url: 'https://haber.example.com/x', tarih: '2026-10-14T09:00:00.000Z' },
  ],
  kampanyalar: [{ baslik: 'Örnek kampanya', ozet: 'Platform · sürüyor', url: 'https://kifobu.com/kampanya/ornek/', tarih: '2026-10-13T00:00:00.000Z' }],
};

let veritabani: DatabaseSync;
let ortam: Ortam;
let gelenler: { url: string; govde: unknown }[];
let eskiFetch: typeof fetch;
const SIMDI = new Date('2026-10-16T10:00:00.000Z');

beforeEach(() => {
  veritabani = new DatabaseSync(':memory:');
  veritabani.exec(MIGRASYON);
  ortam = {
    DB: sahteD1(veritabani) as unknown as Ortam['DB'],
    ASSETS: {
      fetch: async () => new Response(JSON.stringify(JSON_ICERIK), { headers: { 'Content-Type': 'application/json' } }),
    },
    RESEND_API_KEY: 'test-anahtar',
    BULTEN_GONDEREN: 'kifobu <bulten@kifobu.com>',
  };
  gelenler = [];
  eskiFetch = globalThis.fetch;
  globalThis.fetch = (async (girdi: string | URL | Request, init?: RequestInit) => {
    const url = typeof girdi === 'string' ? girdi : girdi instanceof URL ? girdi.href : girdi.url;
    gelenler.push({ url, govde: init?.body ? JSON.parse(String(init.body)) : undefined });
    return new Response(JSON.stringify({ data: [] }), { status: 200 });
  }) as typeof fetch;
});

afterEach(() => {
  globalThis.fetch = eskiFetch;
  veritabani.close();
});

const formIstegi = (alanlar: Record<string, string>) =>
  new Request('https://kifobu.com/api/bulten/abone', { method: 'POST', body: new URLSearchParams(alanlar) });
const belirtecAl = () => (veritabani.prepare('SELECT belirtec FROM abone').get() as { belirtec: string }).belirtec;
const aboneSayisi = () => Number((veritabani.prepare('SELECT COUNT(*) AS n FROM abone').get() as { n: number }).n);

// Saf fonksiyonlar

test('e-posta doğrulanır, küçük harfe çevrilir; bozuk adres reddedilir', () => {
  assert.equal(epostaDogrula('  Ornek@Haber.Example.COM '), 'ornek@haber.example.com');
  assert.equal(epostaDogrula('olmayan@'), null);
  assert.equal(epostaDogrula('a b@x.test'), null);
  assert.equal(epostaDogrula(undefined), null);
  assert.equal(epostaDogrula('x'.repeat(70) + '@x.test'), null);
});

test('ISO hafta anahtarı doğru hesaplanır', () => {
  assert.equal(isoHafta(new Date('2021-01-04T12:00:00Z')), '2021-W01');
  assert.equal(isoHafta(new Date('2020-12-31T12:00:00Z')), '2020-W53');
  assert.equal(isoHafta(new Date('2026-10-19T06:00:00Z')), '2026-W43');
  assert.equal(isoHafta(new Date('2026-10-12T12:00:00Z')), '2026-W42');
});

test('içerik: yalnız son 7 gün, yalnız kifobu adresleri, en fazla 10 haber', () => {
  const v = haftalikIcerik(JSON_ICERIK, SIMDI);
  assert.deepEqual(v.haberler.map((h) => h.baslik), ['Örnek girişim tur kapattı']);
  assert.equal(v.kampanyalar.length, 1);
  const cok = { haberler: Array.from({ length: 15 }, (_, i) => ({ baslik: `h${i}`, ozet: 'o', url: `https://kifobu.com/haber/${i}/`, tarih: '2026-10-15T00:00:00Z' })) };
  assert.equal(haftalikIcerik(cok, SIMDI).haberler.length, 10);
  assert.deepEqual(haftalikIcerik(null, SIMDI), { haberler: [], kampanyalar: [] });
});

test('bülten bağlantısına UTM eklenir', () => {
  assert.equal(
    bultenUrl('https://kifobu.com/haber/ornek-bir/', '2026-W43'),
    'https://kifobu.com/haber/ornek-bir/?utm_source=bulten&utm_medium=email&utm_campaign=haftalik-2026-W43',
  );
});

test('e-posta: kişiye özel ayrılma bağlantısı, kaçışlı metin, kaynak ve yapay zekâ notu yok', () => {
  const ayril = 'https://kifobu.com/api/bulten/ayril?t=11111111-2222-3333-4444-555555555555';
  const v = { haberler: [{ baslik: 'A & <B>', ozet: 'Özet', url: 'https://kifobu.com/haber/a/', tarih: '2026-10-14T09:00:00.000Z' }], kampanyalar: [] };
  const { html, metin, konu } = epostaIcerigi(v, '2026-W43', ayril);
  assert.ok(html.includes(ayril));
  assert.ok(html.includes('A &amp; &lt;B&gt;'));
  assert.ok(metin.includes(ayril));
  assert.ok(konu.length > 0);
  assert.doesNotMatch(html + metin, /yapay zek|kaynak|example\.com/i);
});

// Abonelik

test('RESEND anahtarı yoksa abonelik kapalı yönlendirmesi', async () => {
  ortam.RESEND_API_KEY = undefined;
  const y = await abonelikIstegi(formIstegi({ eposta: 'a@x.test' }), ortam, SIMDI);
  assert.equal(y.status, 303);
  assert.equal(y.headers.get('Location'), '/bulten/?durum=kapali');
});

test('tuzak doluysa hiçbir şey yapılmaz, aynı yanıt verilir', async () => {
  const y = await abonelikIstegi(formIstegi({ eposta: 'bot@x.test', web: 'dolu' }), ortam, SIMDI);
  assert.equal(y.headers.get('Location'), '/bulten/?durum=kontrol');
  assert.equal(aboneSayisi(), 0);
  assert.equal(gelenler.length, 0);
});

test('yeni adres bekliyor kaydı olur, onay e-postası gider, yanıt aynıdır', async () => {
  const y = await abonelikIstegi(formIstegi({ eposta: 'Yeni@Kisi.test' }), ortam, SIMDI);
  assert.equal(y.headers.get('Location'), '/bulten/?durum=kontrol');
  const satir = veritabani.prepare('SELECT eposta, durum, belirtec FROM abone').get() as { eposta: string; durum: string; belirtec: string };
  assert.equal(satir.eposta, 'yeni@kisi.test');
  assert.equal(satir.durum, 'bekliyor');
  assert.equal(gelenler.length, 1);
  assert.equal(gelenler[0].url, 'https://api.resend.com/emails');
  assert.ok(JSON.stringify(gelenler[0].govde).includes(`/api/bulten/onay?t=${satir.belirtec}`));
});

test('10 dakika içinde tekrar istenirse e-posta gitmez; sonrasında yeni belirteçle gider', async () => {
  await abonelikIstegi(formIstegi({ eposta: 'a@x.test' }), ortam, SIMDI);
  const eski = belirtecAl();
  await abonelikIstegi(formIstegi({ eposta: 'a@x.test' }), ortam, new Date(SIMDI.getTime() + ONAY_ARALIGI_MS - 1000));
  assert.equal(gelenler.length, 1);
  await abonelikIstegi(formIstegi({ eposta: 'a@x.test' }), ortam, new Date(SIMDI.getTime() + ONAY_ARALIGI_MS + 1000));
  assert.equal(gelenler.length, 2);
  assert.notEqual(belirtecAl(), eski);
});

test('zaten onaylı adrese e-posta gitmez', async () => {
  await abonelikIstegi(formIstegi({ eposta: 'a@x.test' }), ortam, SIMDI);
  await onayIstegi(new Request(`https://kifobu.com/api/bulten/onay?t=${belirtecAl()}`), ortam, SIMDI);
  const y = await abonelikIstegi(formIstegi({ eposta: 'a@x.test' }), ortam, new Date(SIMDI.getTime() + 3 * ONAY_ARALIGI_MS));
  assert.equal(y.headers.get('Location'), '/bulten/?durum=kontrol');
  assert.equal(gelenler.length, 1);
});

test('geçersiz adres doğrulama durumu döner', async () => {
  const y = await abonelikIstegi(formIstegi({ eposta: 'bozuk' }), ortam, SIMDI);
  assert.equal(y.headers.get('Location'), '/bulten/?durum=eposta');
  assert.equal(gelenler.length, 0);
});

// Onay

test('geçerli belirtecle onay; geçersiz belirteç reddedilir', async () => {
  await abonelikIstegi(formIstegi({ eposta: 'a@x.test' }), ortam, SIMDI);
  const bozuk = await onayIstegi(new Request('https://kifobu.com/api/bulten/onay?t=yanlis'), ortam, SIMDI);
  assert.equal(bozuk.headers.get('Location'), '/bulten/?durum=gecersiz');
  const ok = await onayIstegi(new Request(`https://kifobu.com/api/bulten/onay?t=${belirtecAl()}`), ortam, SIMDI);
  assert.equal(ok.headers.get('Location'), '/bulten/?durum=onaylandi');
  assert.equal((veritabani.prepare('SELECT durum FROM abone').get() as { durum: string }).durum, 'onayli');
});

test('7 günden eski bekleyen kayıt onaylanmaz ve silinir', async () => {
  await abonelikIstegi(formIstegi({ eposta: 'a@x.test' }), ortam, SIMDI);
  const gec = new Date(SIMDI.getTime() + BEKLEME_MS + 60_000);
  const y = await onayIstegi(new Request(`https://kifobu.com/api/bulten/onay?t=${belirtecAl()}`), ortam, gec);
  assert.equal(y.headers.get('Location'), '/bulten/?durum=gecersiz');
  assert.equal(aboneSayisi(), 0);
});

// Ayrılma

test('ayrılma sayfası GET ile silmez; POST siler; One-Click 200 döner', async () => {
  await abonelikIstegi(formIstegi({ eposta: 'a@x.test' }), ortam, SIMDI);
  const belirtec = belirtecAl();
  const sayfa = await ayrilSayfasi(new Request(`https://kifobu.com/api/bulten/ayril?t=${belirtec}`)).text();
  assert.ok(sayfa.includes('method="post"'));
  assert.equal(aboneSayisi(), 1);
  const bir = await ayrilIstegi(new Request(`https://kifobu.com/api/bulten/ayril?t=${belirtec}`, { method: 'POST', body: 'List-Unsubscribe=One-Click' }), ortam);
  assert.equal(bir.status, 200);
  assert.equal(aboneSayisi(), 0);
});

test('tarayıcı formu POST ile ayrılır ve ayrıldı yanıtı verilir', async () => {
  await abonelikIstegi(formIstegi({ eposta: 'a@x.test' }), ortam, SIMDI);
  const y = await ayrilIstegi(new Request(`https://kifobu.com/api/bulten/ayril?t=${belirtecAl()}`, { method: 'POST' }), ortam);
  assert.equal(y.headers.get('Location'), '/bulten/?durum=ayrildi');
  assert.equal(aboneSayisi(), 0);
});

test('bilinmeyen /api yolu 404 döner, önbelleğe alınmaz', async () => {
  const y = await worker.fetch(new Request('https://kifobu.com/api/baska'), ortam);
  assert.equal(y.status, 404);
  assert.equal(y.headers.get('Cache-Control'), 'no-store');
});

test("statik istekler ASSETS'e geçer", async () => {
  let geldi = '';
  ortam.ASSETS = { fetch: async (r: Request) => ((geldi = r.url), new Response('sayfa')) };
  const y = await worker.fetch(new Request('https://kifobu.com/gunluk-bulten/'), ortam);
  assert.equal(await y.text(), 'sayfa');
  assert.equal(geldi, 'https://kifobu.com/gunluk-bulten/');
});

// Haftalık gönderim

function aboneEkle(eposta: string, durum: 'bekliyor' | 'onayli', olusturma = SIMDI.toISOString()) {
  veritabani
    .prepare('INSERT INTO abone (eposta, dil, durum, belirtec, olusturma, onay) VALUES (?, ?, ?, ?, ?, ?)')
    .run(eposta, 'tr', durum, crypto.randomUUID(), olusturma, null);
}

test('haftalık gönderim: onaylılara toplu gönderir, hafta kaydını yazar, aynı hafta tekrar göndermez', async () => {
  aboneEkle('bir@x.test', 'onayli');
  aboneEkle('iki@x.test', 'onayli');
  aboneEkle('onaysiz@x.test', 'bekliyor');

  const ilk = await haftalikGonderim(ortam, SIMDI);
  assert.match(ilk, /2026-W42: 2 e-posta gönderildi/);
  const toplu = gelenler.filter((g) => g.url === 'https://api.resend.com/emails/batch');
  assert.equal(toplu.length, 1);
  const alicilar = (toplu[0].govde as { to: string[] }[]).map((m) => m.to[0]).sort();
  assert.deepEqual(alicilar, ['bir@x.test', 'iki@x.test']);
  assert.equal((veritabani.prepare('SELECT adet FROM gonderim').get() as { adet: number }).adet, 2);

  const ikinci = await haftalikGonderim(ortam, SIMDI);
  assert.match(ikinci, /zaten gönderildi/);
  assert.equal(gelenler.filter((g) => g.url.endsWith('/batch')).length, 1);
});

test('haber yoksa gönderilmez', async () => {
  ortam.ASSETS = { fetch: async () => new Response(JSON.stringify({ haberler: [], kampanyalar: [] })) };
  aboneEkle('bir@x.test', 'onayli');
  const sonuc = await haftalikGonderim(ortam, SIMDI);
  assert.match(sonuc, /haber yok/);
  assert.equal(gelenler.length, 0);
  assert.equal(Number((veritabani.prepare('SELECT COUNT(*) AS n FROM gonderim').get() as { n: number }).n), 0);
});

test('7 günden eski onaysız kayıtlar gönderimden önce silinir', async () => {
  aboneEkle('eski@x.test', 'bekliyor', new Date(SIMDI.getTime() - BEKLEME_MS - 60_000).toISOString());
  aboneEkle('bir@x.test', 'onayli');
  await haftalikGonderim(ortam, SIMDI);
  assert.equal(Number((veritabani.prepare("SELECT COUNT(*) AS n FROM abone WHERE eposta = 'eski@x.test'").get() as { n: number }).n), 0);
});

test("100'den fazla abone birden çok partiye bölünür", async () => {
  for (let i = 0; i < 205; i++) aboneEkle(`k${i}@x.test`, 'onayli');
  const sonuc = await haftalikGonderim(ortam, SIMDI);
  assert.match(sonuc, /205 e-posta/);
  const partiler = gelenler.filter((g) => g.url.endsWith('/batch')).map((g) => (g.govde as unknown[]).length);
  assert.deepEqual(partiler, [100, 100, 5]);
});
