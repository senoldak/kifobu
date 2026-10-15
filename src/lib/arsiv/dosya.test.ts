import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { sonKaydiBul, kaydiYaz } from './dosya.ts';
import type { ArsivKaydi } from './tipler.ts';

function kayit(tarih: string, sayi = 1): ArsivKaydi {
  return { tarih, sayi, baslangic: false, girisimler: [], platformlar: [] };
}

function gecici(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'arsiv-'));
}

test('sonKaydiBul bugünü hariç tutar', () => {
  const d = gecici();
  kaydiYaz(d, kayit('2026-10-13'));
  kaydiYaz(d, kayit('2026-10-14'));
  assert.equal(sonKaydiBul(d, '2026-10-14')?.tarih, '2026-10-13');
});

test('boş dizinde null', () => {
  const d = gecici();
  assert.equal(sonKaydiBul(d, '2026-10-14'), null);
  assert.equal(sonKaydiBul(path.join(d, 'yok'), '2026-10-14'), null);
});

test('kaydiYaz üzerine yazar', () => {
  const d = gecici();
  const yol = kaydiYaz(d, kayit('2026-10-14', 1));
  kaydiYaz(d, kayit('2026-10-14', 2));
  assert.deepEqual(fs.readdirSync(d), ['2026-10-14.json']);
  assert.equal(JSON.parse(fs.readFileSync(yol, 'utf8')).sayi, 2);
});

test('bozuk en yeni dosya atlanır', () => {
  const d = gecici();
  kaydiYaz(d, kayit('2026-10-12'));
  kaydiYaz(d, kayit('2026-10-13'));
  fs.writeFileSync(path.join(d, '2026-10-14.json'), '{"tarih": "2026-10-');
  assert.equal(sonKaydiBul(d, '2026-10-15')?.tarih, '2026-10-13');
  fs.writeFileSync(path.join(d, '2026-10-13.json'), '');
  assert.equal(sonKaydiBul(d, '2026-10-15')?.tarih, '2026-10-12');
});
