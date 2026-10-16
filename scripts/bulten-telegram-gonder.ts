import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Token ve Chat ID'ler (.env veya GitHub Actions environment variables)
// Format desteği: "@kifobu,@fundov:24358" veya tekil "@kifobu"
const botToken = process.env.TELEGRAM_BOT_TOKEN;
const rawChatIds = process.env.TELEGRAM_CHAT_ID;

if (!botToken || !rawChatIds) {
  console.log('[TELEGRAM] TELEGRAM_BOT_TOKEN veya TELEGRAM_CHAT_ID tanımlı değil, Telegram paylaşımı atlandı.');
  process.exit(0);
}

// Virgülle ayrılmış birden fazla hedefi ve topic ID'lerini ayrıştır
interface HedefChat {
  chatId: string;
  topicId?: string;
}

const hedefler: HedefChat[] = rawChatIds
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean)
  .map((s) => {
    const parts = s.split(':');
    return {
      chatId: parts[0].trim(),
      topicId: parts[1]?.trim() || undefined,
    };
  });

const distGorsel = path.join(rootDir, 'dist-bulten', 'bulten-post.png');
const publicGorsel = path.join(rootDir, 'public', 'bulten-post.png');
const gorselPath = fs.existsSync(distGorsel) ? distGorsel : publicGorsel;
const metinPath = path.join(rootDir, 'dist-bulten', 'bulten-metin.txt');

if (!fs.existsSync(gorselPath)) {
  console.error(`[TELEGRAM] HATA: Gönderilecek görsel bulunamadı: ${gorselPath}`);
  process.exit(1);
}

// Metin dosyasını oku veya varsayılan oluştur
let caption = '';
if (fs.existsSync(metinPath)) {
  caption = fs.readFileSync(metinPath, 'utf8').trim();
} else {
  const { BULTEN } = await import('../src/data/bulten.ts');
  caption = `🌻 Kitle Fonlama Ekosisteminde Bugün \n\n🗓 ${BULTEN.tarih} / ${BULTEN.sayi}\n\nBugünkü bültende:\n• Yatırım turlarından öne çıkan detaylar\n• Girişimlerden güncel gelişmeler\n• Kitle fonlama ekosisteminden istatistikler ve analizler\n\n🔗 https://kifobu.com/gunluk-bulten/\n\n#kitlefonlama #crowdfunding #girişim #startup #yatırım`;
}

// Bağlantı: o günün sayfası canlıysa ona, değilse genel bülten sayfasına; kanala özgü UTM ile.
const { istanbulGunu } = await import("../src/lib/gunler.ts");
const { bultenBaglantisi, metinBaglantisiniDegistir } = await import("../src/lib/paylasim.ts");
const baglanti = await bultenBaglantisi("telegram", istanbulGunu(new Date()));
console.log(`[TELEGRAM] Bağlantı: ${baglanti.gunSayfasi ? "günün bülten sayfası" : "genel bülten sayfası (günün sayfası canlıda yok)"}`);
caption = metinBaglantisiniDegistir(caption, baglanti.url);

function scrubSecrets(msg: string): string {
  if (!botToken) return msg;
  return msg.replaceAll(botToken, '[REDACTED_BOT_TOKEN]');
}

async function telegramGonder() {
  const fileBuffer = fs.readFileSync(gorselPath);
  const url = `https://api.telegram.org/bot${botToken}/sendPhoto`;
  let basarisiz = 0;

  for (const h of hedefler) {
    const hedefEtiketi = h.topicId ? `${h.chatId} (Topic: ${h.topicId})` : h.chatId;
    console.log(`[TELEGRAM] Bülten post görseli gönderiliyor: ${hedefEtiketi}...`);

    const blob = new Blob([fileBuffer], { type: 'image/png' });
    const formData = new FormData();
    formData.append('chat_id', h.chatId);
    if (h.topicId) {
      formData.append('message_thread_id', h.topicId);
    }
    formData.append('photo', blob, 'bulten-post.png');
    formData.append('caption', caption);

    // Ağ hatasında ("fetch failed") 3 kez denenir; Telegram'ın reddettiği istek yeniden gönderilmez.
    for (let deneme = 1; deneme <= 3; deneme++) {
      try {
        const res = await fetch(url, {
          method: 'POST',
          body: formData,
          signal: AbortSignal.timeout(30_000),
        });

        const data = (await res.json()) as { ok: boolean; description?: string };

        if (!data.ok) {
          basarisiz++;
          console.error(`[TELEGRAM] ! ${hedefEtiketi} hedefine gönderim başarısız:`, scrubSecrets(data.description || 'Bilinmeyen hata'));
        } else {
          console.log(`[TELEGRAM] ✓ ${hedefEtiketi} hedefine başarıyla gönderildi!`);
        }
        break;
      } catch (err: any) {
        if (deneme === 3) {
          basarisiz++;
          console.error(`[TELEGRAM] ! ${hedefEtiketi} için istek hatası (3/3 deneme bitti):`, scrubSecrets(err?.message || 'Bilinmeyen hata'));
        } else {
          console.error(`[TELEGRAM] ! ${hedefEtiketi} için istek hatası (deneme ${deneme}/3):`, scrubSecrets(err?.message || 'Bilinmeyen hata'));
          await new Promise((r) => setTimeout(r, deneme * 5_000));
        }
      }
    }
  }
  // Bir hedef gitmediyse adım kırmızı olsun ki kayıp sessiz kalmasın.
  if (basarisiz > 0) process.exitCode = 1;
}

telegramGonder();
