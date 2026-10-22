import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { haberYaz } from './lib.mjs';
import { TASLAK_SEMASI } from './yazar.mjs';

test('TASLAK_SEMASI why_matters ve key_points alanlarını içerir', () => {
  assert.ok(TASLAK_SEMASI.properties.why_matters);
  assert.equal(TASLAK_SEMASI.properties.why_matters.type, 'string');
  assert.ok(TASLAK_SEMASI.properties.key_points);
  assert.equal(TASLAK_SEMASI.properties.key_points.type, 'array');
  assert.equal(TASLAK_SEMASI.properties.key_points.maxItems, 3);
});

test('haberYaz why_matters ve key_points frontmatter\'a yazar', async () => {
  const rot = await mkdtemp(path.join(os.tmpdir(), 'kifobu-'));
  const h = {
    title: 'Yeni Girişim Tohum Yatırım Aldı',
    description: 'Yapay zekâ girişimi 1 milyon dolar yatırım aldı.',
    body: 'Girişim yatırım alarak büyümeyi hedefliyor.',
    category: 'yatirimlar',
    date: '2026-10-14T10:00:00+03:00',
    why_matters: 'Ekosistemde yerli yapay zekâ yatırımlarının artışı açısından kritik bir gösterge.',
    key_points: ['1 milyon dolar tohum yatırım', '3 yeni yatırımcı katıldı'],
  };
  const slug = await haberYaz(rot, h);
  const md = await readFile(path.join(rot, 'src/content/haberler', slug, 'index.md'), 'utf8');
  assert.match(md, /why_matters: "Ekosistemde yerli yapay zekâ/);
  assert.match(md, /key_points:\n  - "1 milyon dolar tohum yatırım"\n  - "3 yeni yatırımcı katıldı"/);
});

test('haberYaz gövdedeki HTML etiketlerini ve yorumlarını atar, Markdown ve metni korur', async () => {
  const rot = await mkdtemp(path.join(os.tmpdir(), 'kifobu-'));
  const body = [
    'Girişim <b>2 milyon dolar</b> topladı.<script>alert(1)</script>',
    '<a href="https://haber.example.com" onclick="x()">tıkla</a> <!-- gizli -->',
    '<div class="kutu">',
    'Oran 3 < 5 ve 7 > 2; ayrıntı için [rapor](https://www.spk.gov.tr/).',
    '</div><br/> <!-- kapanmamış',
  ].join('\n');
  const slug = await haberYaz(rot, { title: 'Etiketli', description: 'x', body, category: 'yatirimlar', date: '2026-10-14T10:00:00+03:00' });
  const md = await readFile(path.join(rot, 'src/content/haberler', slug, 'index.md'), 'utf8');
  const metin = md.split('---').slice(2).join('---');
  assert.doesNotMatch(metin, /<\/?(b|a|script|div|br)\b/i);
  assert.doesNotMatch(metin, /<!--|onclick|gizli|kapanmamış|alert/);
  assert.match(metin, /2 milyon dolar/);
  assert.match(metin, /tıkla/);
  assert.match(metin, /3 < 5 ve 7 > 2/);
  assert.match(metin, /\[rapor\]\(https:\/\/www\.spk\.gov\.tr\/\)/);
});
