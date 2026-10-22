import { test, mock } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { motorTuru, turSec } from './motor-modu.mjs';
import { uyarlayiciKur } from './uyarlayici.mjs';
import { motorKimlik } from './motor.mjs';

mock.method(console, 'log', () => {});
mock.method(console, 'warn', () => {});

const SIMDI = new Date('2026-10-22T09:00:00Z');

// Sahte motor dizini: gerçek motor, ağ yok. tur.mjs adayları alır, hepsini uyarlayıcıya verir (ya da fırlatır).
async function sahteMotor({ tur } = {}) {
  const dizin = await mkdtemp(path.join(tmpdir(), 'motor-'));
  await mkdir(path.join(dizin, 'ortak'));
  await writeFile(
    path.join(dizin, 'tur.mjs'),
    tur ??
      `export async function turCalistir(p) {
  globalThis.__tur = p;
  const a = await p.uyarlayici.adaylar({ simdi: p.simdi, log: p.log });
  const sonuclar = await p.uyarlayici.isle(a, { surVar: p.surVar, log: p.log });
  return { yazilan: sonuclar.filter((s) => s.durum === 'yazildi').map((s) => s.slug), elenen: 0, bekleyen: 0, hatalar: [] };
}\n`,
  );
  await writeFile(path.join(dizin, 'defter.mjs'), `export const defterIstemcisi = (p) => ({ sahte: 'defter', ...p });\n`);
  await writeFile(
    path.join(dizin, 'ortak/gizli.mjs'),
    `export const gizliKur = (p) => ({ sahte: 'gizli', ...p, anahtarAdi: 'KAYNAK_ANAHTARI', anahtarVar: () => true });\n`,
  );
  return dizin;
}

const bosDurum = () => ({ gorulen: {}, hatalar: {}, ayrik: {}, taranan: {}, ayni: {}, puan: {}, yayinlanan: {}, havuz: [] });
const env = (dizin) => ({ MOTOR_TUR: '1', MOTOR_DIZIN: dizin, MOTOR_URL: 'https://saat.example.com', MOTOR_ANAHTARI: 'x' });
const sahteUyarlayici = (isle, adaylar) => ({ adaylar: async () => adaylar, isle, ozet: {}, simdi: SIMDI });
const temizle = (dizin) => rm(dizin, { recursive: true, force: true });

test('MOTOR_TUR yokken yerelTur çağrılır', async () => {
  const cagrilar = [];
  const sonuc = await turSec({
    env: {},
    uyarlayici: {},
    durum: {},
    yerel: async (u, d) => cagrilar.push(['yerel', u, d]),
    motor: async () => cagrilar.push(['motor']),
  });
  assert.equal(cagrilar.length, 1);
  assert.equal(cagrilar[0][0], 'yerel');
  assert.ok(sonuc);
});

test('MOTOR_TUR=1 ve MOTOR_DIZIN yokken hata: MOTOR_DIZIN', async () => {
  const yerel = mock.fn();
  await assert.rejects(
    turSec({ env: { MOTOR_TUR: '1' }, uyarlayici: {}, durum: {}, yerel, motor: (p) => motorTuru(p) }),
    /MOTOR_DIZIN/,
  );
  assert.equal(yerel.mock.callCount(), 0); // yerel tura düşmez
});

test('MOTOR_TUR=1 ve motor import edilemezse hata ile biter, yerel tura düşmez', async () => {
  const dizin = await mkdtemp(path.join(tmpdir(), 'motor-bos-'));
  try {
    const yerel = mock.fn();
    await assert.rejects(
      turSec({ env: env(dizin), uyarlayici: {}, durum: bosDurum(), yerel, motor: (p) => motorTuru({ ...p, rot: '.' }) }),
      /motor/i,
    );
    assert.equal(yerel.mock.callCount(), 0);
  } finally {
    await temizle(dizin);
  }
});

test('motorTuru: ayar, gizli ve defter sözleşme değerleriyle kurulur', async () => {
  const dizin = await sahteMotor();
  try {
    const sonuc = await motorTuru({ motorDizin: dizin, uyarlayici: sahteUyarlayici(async () => [], []), durum: bosDurum(), env: env(dizin), simdi: SIMDI, rot: '/kok' });
    const p = globalThis.__tur;
    assert.deepEqual(p.ayar, { ad: 'kifobu', site: 'https://kifobu.com', yaziYolu: '/haber/{slug}/', havuzSaat: 24, bekleyenLimit: 50 });
    assert.equal(p.site, 'kifobu');
    assert.deepEqual(p.geminiKur(), { sayac: { cagri: 0, giris: 0, cikis: 0 } });
    assert.equal(p.defter.url, 'https://saat.example.com');
    assert.equal(p.defter.site, 'kifobu');
    assert.equal(p.defter.anahtar, 'x');
    assert.equal(p.gizli.sifreliDosya, 'scripts/bot/gizli-kaynaklar.sifreli');
    assert.equal(p.gizli.kokDizin, '/kok');
    assert.deepEqual(sonuc.yazilan, []);
  } finally {
    await temizle(dizin);
  }
});

test("motor modunda da karar verilen üyeler gorulen'e işaretlenir ve hatalar sayılır", async () => {
  const dizin = await sahteMotor();
  try {
    const durum = bosDurum();
    const girdi = ['a', 'b', 'c', 'd'].map((id) => ({ kimlik: motorKimlik(`bir:${id}`), yuk: { id: `bir:${id}` }, baslik: id }));
    const [a, b, c, d] = girdi;
    const uyarlayici = sahteUyarlayici(async (liste) => {
      assert.equal(liste.length, 4);
      // uyarlayıcının kendi hata sayımı çalışmaya devam eder (3 deneme kuralı durum.hatalar'dan okunur)
      durum.hatalar['bir:c'] = { sayi: 1, mesaj: 'x', zaman: SIMDI.toISOString() };
      return [
        { kimlik: a.kimlik, durum: 'yazildi', slug: 's1' },
        { kimlik: b.kimlik, durum: 'elendi', gerekce: 'kapsam dışı' },
        { kimlik: c.kimlik, durum: 'bekliyor', hata: new Error('geçici') },
        { kimlik: d.kimlik, durum: 'bekliyor', gerekce: 'havuzda', havuzda: true },
      ];
    }, girdi);
    const sonuc = await motorTuru({ motorDizin: dizin, uyarlayici, durum, env: env(dizin), simdi: SIMDI, rot: '.' });
    assert.deepEqual(sonuc.yazilan, ['s1']);
    assert.deepEqual(Object.keys(durum.gorulen).sort(), ['bir:a', 'bir:b', 'bir:d']);
    assert.equal(durum.gorulen['bir:a'], SIMDI.toISOString());
    assert.equal(durum.hatalar['bir:c'].sayi, 1); // bekleyen hatalı üye gorulen'e girmez, hatası sayılı kalır
  } finally {
    await temizle(dizin);
  }
});

test("motor turu fırlatırsa kısmi sonuçlar gorulen'e işlenir ve hata yeniden fırlatılır", async () => {
  const dizin = await sahteMotor({
    tur: `export async function turCalistir(p) {
  const a = await p.uyarlayici.adaylar({});
  await p.uyarlayici.isle(a, {});
}\n`,
  });
  try {
    const durum = bosDurum();
    const a = { kimlik: motorKimlik('bir:a'), yuk: { id: 'bir:a' }, baslik: 'a' };
    const hata = Object.assign(new Error('ayar'), { ayar: true, sonuclar: [{ kimlik: a.kimlik, durum: 'yazildi', slug: 's1' }] });
    const uyarlayici = sahteUyarlayici(async () => {
      throw hata;
    }, [a]);
    await assert.rejects(motorTuru({ motorDizin: dizin, uyarlayici, durum, env: env(dizin), simdi: SIMDI, rot: '.' }), (e) => e === hata);
    assert.ok(durum.gorulen['bir:a']);
  } finally {
    await temizle(dizin);
  }
});

test('motor modunda taranan yine dolar', async () => {
  const dizin = await sahteMotor();
  try {
    const durum = bosDurum();
    const K1 = { ad: 'Birinci Kaynak', kisa: 'bir', akis: 'https://haber.example.com/bir.xml', etiket: 'kodbir' };
    const oge = { guid: 'g1', link: 'https://haber.example.com/g1', title: 'Orionlab yeni cip tanitti', description: 'ozet', pubDate: new Date(SIMDI.getTime() - 3_600_000).toUTCString() };
    const uyarlayici = uyarlayiciKur({
      rot: '.',
      durum,
      simdi: SIMDI,
      bag: { KAYNAKLAR: [K1], hentTekst: async () => 'xml', rssOku: () => [oge], sonHaberler: async () => [], onbellekliEsle: async () => null, onbellekliPuanla: async (b) => b.map(() => 0), geminiPayiBitti: () => false, motorYaz: async () => {} },
    });
    await motorTuru({ motorDizin: dizin, uyarlayici, durum, env: env(dizin), simdi: SIMDI, rot: '.' });
    assert.equal(Object.keys(durum.taranan).length, 1);
  } finally {
    await temizle(dizin);
  }
});
