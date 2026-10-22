// node --test scripts/bot/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { bultenYaz } from './ozet-bulten.mjs';

test('bülten başlığı ve slug tarihi (yıl dahil) taşır', () => {
  const { slug, md } = bultenYaz({ donem: 'sabah', simdi: new Date('2026-10-15T06:00:00Z'), haberler: [{ title: 'Örnek haber', slug: 'ornek-haber' }] });
  assert.equal(slug, 'sabah-bulteni-15-ekim-2026');
  assert.match(md, /^title: "Sabah Bülteni — 15 Ekim 2026"$/m);
  const ogle = bultenYaz({ donem: 'ogle', simdi: new Date('2026-10-16T10:00:00Z'), haberler: [{ title: 'A', slug: 'a' }] });
  assert.equal(ogle.slug, 'ogle-bulteni-16-ekim-2026');
});

test('ileri tarihli haber ve ileri tarihli bülten bültene girmez, son bülten sayılmaz', async () => {
  const { mkdtemp, mkdir, writeFile, readFile, rm } = await import('node:fs/promises');
  const { tmpdir } = await import('node:os');
  const path = await import('node:path');
  const { calistir } = await import('./ozet-bulten.mjs');
  const kok = await mkdtemp(path.join(tmpdir(), 'ozet-bulten-'));
  const yaz = async (slug, onyuz) => {
    await mkdir(path.join(kok, slug));
    await writeFile(path.join(kok, slug, 'index.md'), `---\n${onyuz}\n---\n\nGövde.\n`, 'utf8');
  };
  try {
    const simdi = new Date('2026-11-14T06:00:00Z');
    await yaz('gecmis-haber', 'title: "Geçmiş haber"\ndate: 2026-11-14T04:00:00Z\ncategory: yatirim');
    await yaz('ileri-haber', 'title: "İleri haber"\ndate: "2026-11-14T10:00:00+03:00"\ncategory: yatirim');
    // Planlanmış (ileri tarihli) bir bülten, vakti gelmeden "son bülten" sayılıp yeni haberleri yutmamalı.
    await yaz('ileri-bulten', 'title: "İleri bülten"\ndate: 2026-11-14T07:00:00Z\ncategory: gunluk-bulten');
    const slug = await calistir({ simdi, donem: 'sabah', kok });
    assert.equal(slug, 'sabah-bulteni-14-kasim-2026');
    const md = await readFile(path.join(kok, slug, 'index.md'), 'utf8');
    assert.match(md, /\/haber\/gecmis-haber\//);
    assert.doesNotMatch(md, /ileri-haber/);
  } finally {
    await rm(kok, { recursive: true, force: true });
  }
});
