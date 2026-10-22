import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { gonderildiMi, isaretle, kaydiOku, kaydiYaz } from './bulten-paylasim-kaydi.mjs';

test('gonderildiMi: yalnız aynı gün ve aynı kanal için evet', () => {
  const kayit = { gun: '2026-10-22', kanallar: ['telegram'] };
  assert.equal(gonderildiMi(kayit, '2026-10-22', 'telegram'), true);
  assert.equal(gonderildiMi(kayit, '2026-10-22', 'meta'), false);
  assert.equal(gonderildiMi(kayit, '2026-10-23', 'telegram'), false);
  assert.equal(gonderildiMi({}, '2026-10-22', 'telegram'), false);
});

test('isaretle: aynı gün kanal eklenir, tekrar eklenmez; yeni gün eski listeyi sıfırlar', () => {
  let k = isaretle({}, '2026-10-22', 'telegram');
  k = isaretle(k, '2026-10-22', 'meta');
  k = isaretle(k, '2026-10-22', 'telegram');
  assert.deepEqual(k, { gun: '2026-10-22', kanallar: ['telegram', 'meta'] });
  assert.deepEqual(isaretle(k, '2026-10-23', 'linkedin'), { gun: '2026-10-23', kanallar: ['linkedin'] });
});

test('kaydiOku: dosya yoksa ya da bozuksa boş kayıt; kaydiYaz geri okunur', async () => {
  const dizin = await mkdtemp(path.join(os.tmpdir(), 'bpk-'));
  const dosya = path.join(dizin, 'kayit.json');
  assert.deepEqual(kaydiOku(dosya), {});
  await writeFile(dosya, '{bozuk');
  assert.deepEqual(kaydiOku(dosya), {});
  kaydiYaz(dosya, { gun: '2026-10-22', kanallar: ['telegram'] });
  assert.deepEqual(kaydiOku(dosya), { gun: '2026-10-22', kanallar: ['telegram'] });
  assert.ok((await readFile(dosya, 'utf8')).endsWith('\n'));
});
