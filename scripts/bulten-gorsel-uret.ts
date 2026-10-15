import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { bultenSvgCiz } from './bulten-gorsel-ciz.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const ciktiKlasoru = path.join(rootDir, 'dist-bulten');
if (!fs.existsSync(ciktiKlasoru)) {
  fs.mkdirSync(ciktiKlasoru, { recursive: true });
}

async function uret() {
  console.log('[BÜLTEN GÖRSELİ] Üretim başlatıldı...');

  // 1. Instagram Gönderi (Post) - 1080 x 1350
  console.log('- Post (1080x1350) çiziliyor...');
  const postSvg = bultenSvgCiz('post');
  fs.writeFileSync(path.join(ciktiKlasoru, 'bulten-post.svg'), postSvg, 'utf8');
  const postPng = await sharp(Buffer.from(postSvg))
    .png({ quality: 95 })
    .toFile(path.join(ciktiKlasoru, 'bulten-post.png'));
  console.log(`  ✓ bulten-post.png hazır! (${postPng.width}x${postPng.height})`);

  // 2. Instagram Hikaye (Story) - 1080 x 1920
  console.log('- Story (1080x1920) çiziliyor...');
  const storySvg = bultenSvgCiz('story');
  fs.writeFileSync(path.join(ciktiKlasoru, 'bulten-story.svg'), storySvg, 'utf8');
  const storyPng = await sharp(Buffer.from(storySvg))
    .png({ quality: 95 })
    .toFile(path.join(ciktiKlasoru, 'bulten-story.png'));
  console.log(`  ✓ bulten-story.png hazır! (${storyPng.width}x${storyPng.height})`);

  // 3. Sosyal Medya Paylaşım Metni (Kullanıcı Şablonu)
  const { BULTEN } = await import('../src/data/bulten.ts');
  const paylasimMetni = `🌻 Kitle Fonlama Ekosisteminde Bugün \n\n🗓 ${BULTEN.tarih} / ${BULTEN.sayi}\n\nBugünkü bültende:\n• Yatırım turlarından öne çıkan detaylar\n• Girişimlerden güncel gelişmeler\n• Kitle fonlama ekosisteminden istatistikler ve analizler\n\n🔗 https://kifobu.com/gunluk-bulten/\n\n#kitlefonlama #crowdfunding #girişim #startup #yatırım`;

  fs.writeFileSync(path.join(ciktiKlasoru, 'bulten-metin.txt'), paylasimMetni, 'utf8');
  console.log('\n────────────────────────────────────────────────────────────');
  console.log('📢 SOSYAL MEDYA PAYLAŞIM METNİ:\n');
  console.log(paylasimMetni);
  console.log('────────────────────────────────────────────────────────────\n');
  console.log(`[BÜLTEN GÖRSELİ] Başarıyla tamamlandı! Dosyalar: ${ciktiKlasoru}`);
}

uret().catch((e) => {
  console.error('Görsel üretim hatası:', e);
  process.exit(1);
});
