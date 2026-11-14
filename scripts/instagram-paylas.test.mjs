import test from 'node:test';
import assert from 'node:assert/strict';
import { adresler, igMetni } from './instagram-paylas.mjs';

test('adresler: özet ve bülten için sayfa, post ve story', () => {
  assert.deepEqual(adresler('ozet', '2026-11-14'), {
    sayfa: 'https://kifobu.com/gunun-ozeti/2026-11-14/',
    post: 'https://kifobu.com/kapak/gunun-ozeti/dikey/2026-11-14.png',
    story: 'https://kifobu.com/kapak/gunun-ozeti/story/2026-11-14.png',
  });
  assert.equal(adresler('bulten', 'ogle-bulteni-14-kasim-2026').story, 'https://kifobu.com/kapak/story/ogle-bulteni-14-kasim-2026.png');
});

test('igMetni özet: Telegram metni, bağlantı satırı yok, etiketler; o günün etiketi yoksa null', () => {
  const html = '<meta name="gunun-ozeti" content="2026-11-14"><meta name="gunun-ozeti-paragraf" content="Paragraf &amp; devamı.">';
  assert.equal(
    igMetni('ozet', '2026-11-14', html),
    '📰 Günün Özeti · 14 Kasım 2026\n\nParagraf & devamı.\n\n#kitlefonlama #girişim #yatırım',
  );
  assert.equal(igMetni('ozet', '2026-11-15', html), null);
});

test('igMetni bülten: başlık ve maddeler; madde yoksa null', () => {
  const html = '<meta property="og:title" content="Öğle Bülteni — 14 Kasım 2026"><nav><li><a href="/hakkimizda/">X</a></li></nav>' +
    '<article><ul><li><a href="/haber/a/">FluoRok yatırım aldı</a></li><li><a href="/haber/b/">Q-CTRL &amp; unicorn</a></li></ul></article>';
  assert.equal(igMetni('bulten', 'ogle', html), '📰 Öğle Bülteni — 14 Kasım 2026\n\n• FluoRok yatırım aldı\n• Q-CTRL & unicorn\n\n#kitlefonlama #girişim #yatırım');
  assert.equal(igMetni('bulten', 'ogle', '<article><p>boş</p></article>'), null);
});
