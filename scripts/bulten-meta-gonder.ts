import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// 18:00 bülteni Facebook Sayfasına ve Instagram'a post + story olarak gider (Meta Graph API, ücretsiz).
// Görseller kifobu.com/bulten-post.png ve /bulten-story.png'den Meta tarafından çekilir; bu yüzden betik günün
// sayfası yayına girdikten sonra çalışır (bulten-otomasyon.yml "Sosyal medyada paylaş").
// Facebook post metnindeki bağlantı o günün kalıcı sayfasına gider (UTM'li; sayfa canlı değilse genel bülten sayfası).
// Instagram metni bağlantısızdır: Instagram metindeki bağlantıyı tıklatmaz.
//
// META_TOKEN: kifobu portföyündeki "kifobu-paylasim" sistem kullanıcısının süresiz token'ı (GitHub Secret).
// Facebook: META_PAGE_ID + META_TOKEN; Sayfa token'ı her çalışmada bu token'dan alınır. Yoksa Facebook atlanır.
// Instagram: INSTAGRAM_USER_ID + META_TOKEN (ya da ayrı INSTAGRAM_TOKEN). Token "IG" ile başlıyorsa Instagram Login
// (graph.instagram.com), değilse Sayfaya bağlı hesap (graph.facebook.com) kabul edilir. Yoksa Instagram atlanır.
const API_SURUMU = 'v25.0';

const sayfaId = process.env.META_PAGE_ID;
const metaToken = process.env.META_TOKEN;
const igKullanici = process.env.INSTAGRAM_USER_ID;
const igToken = process.env.INSTAGRAM_TOKEN || metaToken;
let sayfaToken: string | undefined;

const facebookVar = Boolean(sayfaId && metaToken);
const instagramVar = Boolean(igKullanici && igToken);

if (!facebookVar && !instagramVar) {
  console.log('[META] Facebook ve Instagram bilgileri tanımlı değil, paylaşım atlandı.');
  process.exit(0);
}

const { istanbulGunu } = await import('../src/lib/gunler.ts');
const { bultenBaglantisi, dosyaOzeti, gorselAdresi, gorselYayindaMi, metinBaglantisiniCikar, metinBaglantisiniDegistir } = await import('../src/lib/paylasim.ts');

const gun = istanbulGunu(new Date());

// --kontrol: hiçbir şey yayımlamadan token'ın Sayfaya ve Instagram'a erişimini sınar (bulten-otomasyon.yml mod=meta-kontrol).
const kontrol = process.argv.includes('--kontrol');

// Meta görseli siteden çeker. Adres, bu çalışmada üretilen dosyanın özetini taşır ve sitedeki kopya onunla aynı olana
// kadar (yayın bitene kadar) beklenir; en çok 15 dakika. Olmazsa eski görsel gitmesin diye hiçbir şey yayımlanmaz.
// 31 Ekim: gün sayfası canlı güncellemelerle zaten yayındaydı, bekleme hemen geçti ve Instagram'a 30 Ekim görseli gitti.
async function guncelGorselAdresi(dosya: string): Promise<string> {
  const yerel = path.join(rootDir, 'public', dosya);
  if (!fs.existsSync(yerel)) throw new Error(`Görsel bulunamadı: ${yerel}`);
  const ozet = dosyaOzeti(fs.readFileSync(yerel));
  const url = gorselAdresi(dosya, ozet);
  for (let i = 0; i < 30; i++) {
    if (await gorselYayindaMi(url, ozet)) return url;
    if (i === 0) console.log(`[META] ${dosya} sitede henüz güncel değil, yayın bekleniyor...`);
    await new Promise((r) => setTimeout(r, 30_000));
  }
  throw new Error(`${dosya} 15 dakikada sitede güncellenmedi; eski görsel paylaşılmasın diye Meta'ya gönderilmedi.`);
}

let postGorseli = '';
let storyGorseli = '';
if (!kontrol) {
  try {
    postGorseli = await guncelGorselAdresi('bulten-post.png');
    storyGorseli = await guncelGorselAdresi('bulten-story.png');
    console.log('[META] Sitedeki görseller bu çalışmanın görselleriyle aynı.');
  } catch (err: any) {
    console.error(`[META] HATA: ${err?.message}`);
    process.exit(1);
  }
}

const metinPath = path.join(rootDir, 'dist-bulten', 'bulten-metin.txt');
if (!kontrol && !fs.existsSync(metinPath)) {
  console.error(`[META] HATA: Paylaşım metni bulunamadı: ${metinPath}`);
  process.exit(1);
}
const hamMetin = kontrol ? '' : fs.readFileSync(metinPath, 'utf8').trim();
const metin = metinBaglantisiniCikar(hamMetin);
let facebookMetni = metin;
if (!kontrol && facebookVar) {
  const baglanti = await bultenBaglantisi('facebook', gun);
  console.log(`[META] Facebook bağlantısı: ${baglanti.gunSayfasi ? 'günün bülten sayfası' : 'genel bülten sayfası (günün sayfası canlıda yok)'}`);
  facebookMetni = metinBaglantisiniDegistir(hamMetin, baglanti.url);
}

function gizle(msg: string): string {
  let m = msg;
  for (const t of [metaToken, sayfaToken, igToken]) if (t) m = m.replaceAll(t, '[REDACTED_TOKEN]');
  return m;
}

/** Graph API'ye form gövdeli POST; hata gövdesini anlaşılır mesaja çevirir. Ağ hatasında 3 kez dener. */
async function graphPost(kok: string, yol: string, alanlar: Record<string, string>, token: string): Promise<any> {
  const govde = new URLSearchParams({ ...alanlar, access_token: token });
  for (let deneme = 1; ; deneme++) {
    try {
      const res = await fetch(`${kok}/${API_SURUMU}/${yol}`, { method: 'POST', body: govde, signal: AbortSignal.timeout(60_000) });
      const veri = (await res.json()) as any;
      if (!res.ok || veri.error) throw new Error(`Graph ${res.status}: ${veri.error?.message ?? 'bilinmeyen hata'}`);
      return veri;
    } catch (err: any) {
      // Meta'nın reddettiği istek yeniden gönderilmez; yalnız ağ/zaman aşımı hatası tekrarlanır.
      if (String(err?.message).startsWith('Graph ') || deneme === 3) throw err;
      await new Promise((r) => setTimeout(r, deneme * 5_000));
    }
  }
}

async function graphGet(kok: string, yol: string, alanlar: Record<string, string>, token: string): Promise<any> {
  const q = new URLSearchParams({ ...alanlar, access_token: token });
  const res = await fetch(`${kok}/${API_SURUMU}/${yol}?${q}`, { signal: AbortSignal.timeout(30_000) });
  const veri = (await res.json()) as any;
  if (!res.ok || veri.error) throw new Error(`Graph ${res.status}: ${veri.error?.message ?? 'bilinmeyen hata'}`);
  return veri;
}

// --- Instagram: önce medya kabı oluşturulur, hazır olunca yayımlanır.
const igKok = igToken?.startsWith('IG') ? 'https://graph.instagram.com' : 'https://graph.facebook.com';

async function instagramYayimla(alanlar: Record<string, string>): Promise<string> {
  const kap = await graphPost(igKok, `${igKullanici}/media`, alanlar, igToken!);
  for (let i = 0; i < 20; i++) {
    const { status_code } = await graphGet(igKok, kap.id, { fields: 'status_code' }, igToken!);
    if (status_code === 'FINISHED') break;
    if (status_code === 'ERROR' || status_code === 'EXPIRED') throw new Error(`Instagram medya kabı: ${status_code}`);
    await new Promise((r) => setTimeout(r, 3_000));
  }
  const yayin = await graphPost(igKok, `${igKullanici}/media_publish`, { creation_id: kap.id }, igToken!);
  return yayin.id;
}

// --- Facebook Sayfası: post doğrudan, story için önce yayımlanmamış fotoğraf yüklenir.
const fbKok = 'https://graph.facebook.com';

/** Sistem kullanıcısı token'ından Sayfa token'ı (Sayfa paylaşımları bunu ister). */
async function sayfaTokeniAl(): Promise<string> {
  if (!sayfaToken) {
    const { access_token } = await graphGet(fbKok, sayfaId!, { fields: 'access_token' }, metaToken!);
    if (!access_token) throw new Error('Sayfa token alınamadı (sistem kullanıcısına Sayfa atanmış mı?)');
    sayfaToken = access_token as string;
  }
  return sayfaToken;
}

async function facebookPost(): Promise<string> {
  const r = await graphPost(fbKok, `${sayfaId}/photos`, { url: postGorseli, message: facebookMetni, published: 'true' }, await sayfaTokeniAl());
  return r.post_id ?? r.id;
}

async function facebookStory(): Promise<string> {
  const token = await sayfaTokeniAl();
  const foto = await graphPost(fbKok, `${sayfaId}/photos`, { url: storyGorseli, published: 'false' }, token);
  const r = await graphPost(fbKok, `${sayfaId}/photo_stories`, { photo_id: foto.id }, token);
  return r.post_id ?? r.id ?? foto.id;
}

const kontroller: [string, boolean, () => Promise<string>][] = [
  ['Facebook Sayfa token', facebookVar, async () => {
    await sayfaTokeniAl();
    const { name } = await graphGet(fbKok, sayfaId!, { fields: 'name' }, sayfaToken!);
    return name;
  }],
  ['Instagram hesabı', instagramVar, async () => {
    const { username } = await graphGet(igKok, igKullanici!, { fields: 'username' }, igToken!);
    const { data } = await graphGet(igKok, `${igKullanici}/content_publishing_limit`, { fields: 'quota_usage,config' }, igToken!);
    return `@${username}, 24 saatlik yayın kotası ${data?.[0]?.quota_usage ?? '?'}/${data?.[0]?.config?.quota_total ?? '?'}`;
  }],
];

const isler: [string, boolean, () => Promise<string>][] = kontrol ? kontroller : [
  ['Instagram post', instagramVar, () => instagramYayimla({ image_url: postGorseli, caption: metin })],
  ['Instagram story', instagramVar, () => instagramYayimla({ image_url: storyGorseli, media_type: 'STORIES' })],
  ['Facebook post', facebookVar, facebookPost],
  ['Facebook story', facebookVar, facebookStory],
];

let basarisiz = 0;
for (const [ad, acik, is] of isler) {
  if (!acik) {
    console.log(`[META] ${ad} atlandı (bilgiler tanımlı değil).`);
    continue;
  }
  try {
    const id = await is();
    console.log(`[META] ✓ ${ad} ${kontrol ? "erişilebilir" : "yayımlandı"} (${id}).`);
  } catch (err: any) {
    basarisiz++;
    console.error(`[META] ! ${ad} başarısız:`, gizle(err?.message || 'Bilinmeyen hata'));
  }
}
// Biri gitmediyse adım kırmızı olsun ki kayıp sessiz kalmasın.
if (basarisiz > 0) process.exitCode = 1;
