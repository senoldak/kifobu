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
