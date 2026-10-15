import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const accessToken = process.env.LINKEDIN_ACCESS_TOKEN;
// Öncelik Şirket Sayfası (organization), yoksa profil (person)
const authorUrn = process.env.LINKEDIN_ORGANIZATION_URN || process.env.LINKEDIN_PERSON_URN;

if (!accessToken || !authorUrn) {
  console.log('[LINKEDIN] LINKEDIN_ACCESS_TOKEN veya LINKEDIN_ORGANIZATION_URN tanımlı değil, LinkedIn paylaşımı atlandı.');
  process.exit(0);
}

const distGorsel = path.join(rootDir, 'dist-bulten', 'bulten-post.png');
const publicGorsel = path.join(rootDir, 'public', 'bulten-post.png');
const gorselPath = fs.existsSync(distGorsel) ? distGorsel : publicGorsel;
const metinPath = path.join(rootDir, 'dist-bulten', 'bulten-metin.txt');

if (!fs.existsSync(gorselPath)) {
  console.error(`[LINKEDIN] HATA: Gönderilecek görsel bulunamadı: ${gorselPath}`);
  process.exit(1);
}

let caption = '';
if (fs.existsSync(metinPath)) {
  caption = fs.readFileSync(metinPath, 'utf8').trim();
} else {
  const { BULTEN } = await import('../src/data/bulten.ts');
  caption = `🌻 Kitle Fonlama Ekosisteminde Bugün \n\n🗓 ${BULTEN.tarih} / ${BULTEN.sayi}\n\nBugünkü bültende:\n• Yatırım turlarından öne çıkan detaylar\n• Girişimlerden güncel gelişmeler\n• Kitle fonlama ekosisteminden istatistikler ve analizler\n\n🔗 https://kifobu.com/gunluk-bulten/\n\n#kitlefonlama #crowdfunding #girişim #startup #yatırım`;
}

function scrubSecrets(val: any): any {
  if (typeof val === 'string') {
    let s = val;
    if (accessToken) s = s.replaceAll(accessToken, '[REDACTED_ACCESS_TOKEN]');
    return s;
  }
  if (val && typeof val === 'object') {
    try {
      const str = JSON.stringify(val);
      const scrubbed = accessToken ? str.replaceAll(accessToken, '[REDACTED_ACCESS_TOKEN]') : str;
      return JSON.parse(scrubbed);
    } catch {
      return '[OBJECT]';
    }
  }
  return val;
}

async function gorselYukle(): Promise<string | null> {
  // 1. Görsel yükleme kaydı başlat (Register Upload)
  const registerUrl = 'https://api.linkedin.com/v2/assets?action=registerUpload';
  const registerPayload = {
    registerUploadRequest: {
      recipes: ['urn:li:digitalmediaRecipe:feedshare-image'],
      owner: authorUrn,
      serviceRelationships: [
        {
          relationshipType: 'OWNER',
          identifier: 'urn:li:userGeneratedContent',
        },
      ],
    },
  };

  const regRes = await fetch(registerUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'X-Restli-Protocol-Version': '2.0.0',
    },
    body: JSON.stringify(registerPayload),
    signal: AbortSignal.timeout(30_000),
  });

  const regData = (await regRes.json()) as any;
  if (!regRes.ok || !regData?.value) {
    console.error('[LINKEDIN] Görsel register hatası:', scrubSecrets(regData));
    return null;
  }

  const uploadUrl = regData.value.uploadMechanism?.['com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest']?.uploadUrl;
  const assetUrn = regData.value.asset;

  if (!uploadUrl || !assetUrn) {
    console.error('[LINKEDIN] Yanıtta uploadUrl veya asset bulunamadı.');
    return null;
  }

  // Güvenlik: Upload URL protokol kontrolü
  try {
    const parsedUpUrl = new URL(uploadUrl);
    if (parsedUpUrl.protocol !== 'https:') {
      console.error('[LINKEDIN] Güvensiz upload URL protokolü:', parsedUpUrl.protocol);
      return null;
    }
  } catch {
    console.error('[LINKEDIN] Geçersiz upload URL formatı.');
    return null;
  }

  // 2. Görsel dosyasını yükle
  const fileBuffer = fs.readFileSync(gorselPath);
  const upRes = await fetch(uploadUrl, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'image/png',
    },
    body: fileBuffer,
    signal: AbortSignal.timeout(60_000),
  });

  if (!upRes.ok) {
    console.error('[LINKEDIN] Görsel yükleme binary hatası status:', upRes.status);
    return null;
  }

  return assetUrn;
}

async function paylas() {
  console.log('[LINKEDIN] Bülten post görseli LinkedIn yüklemesi başlatılıyor...');

  const assetUrn = await gorselYukle();
  if (!assetUrn) {
    console.error('[LINKEDIN] Görsel URN alınamadı, paylaşım iptal edildi.');
    process.exit(1);
  }

  console.log(`[LINKEDIN] Görsel yüklendi (${assetUrn}), gönderi paylaşılıyor...`);

  // UGC Post paylaşımı
  const ugcUrl = 'https://api.linkedin.com/v2/ugcPosts';
  const ugcPayload = {
    author: authorUrn,
    lifecycleState: 'PUBLISHED',
    specificContent: {
      'com.linkedin.ugc.ShareContent': {
        shareCommentary: {
          text: caption,
        },
        shareMediaCategory: 'IMAGE',
        media: [
          {
            status: 'READY',
            description: {
              text: 'Kifobu Günlük Kitle Fonlama Bülteni',
            },
            media: assetUrn,
            title: {
              text: 'Günlük Kitle Fonlama Bülteni',
            },
          },
        ],
      },
    },
    visibility: {
      'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC',
    },
  };

  const shareRes = await fetch(ugcUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'X-Restli-Protocol-Version': '2.0.0',
    },
    body: JSON.stringify(ugcPayload),
    signal: AbortSignal.timeout(30_000),
  });

  const shareData = (await shareRes.json()) as any;
  if (!shareRes.ok) {
    console.error('[LINKEDIN] Paylaşım hatası:', scrubSecrets(shareData));
    process.exit(1);
  }

  console.log('[LINKEDIN] ✓ Bülten post görseli ve metni LinkedIn\'de başarıyla paylaşıldı! ID:', shareData.id);
}

paylas().catch((e) => {
  console.error('[LINKEDIN] Beklenmeyen hata:', scrubSecrets(e?.message || String(e)));
  process.exit(1);
});
