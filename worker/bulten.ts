// kifobu haftalık e-posta bülteni: abonelik, onay, ayrılma uç noktaları ve haftalık gönderim.
// Saf fonksiyonlar (doğrulama, hafta anahtarı, içerik seçimi, e-posta derleme) ve D1/fetch'e bağlı işleyiciler
// burada. Harici paket kullanılmaz; yalnız Cloudflare çalışma zamanının API'leri (D1, ASSETS, fetch, crypto).
// Kurallar: IP ya da tarayıcı bilgisi tutulmaz; onaysız kayıt 7 gün sonra silinir; ayrılan abonenin satırı silinir.

export const SITE = 'https://kifobu.com';
export const DIL = 'tr';
const DAKIKA = 60_000;
const GUN = 86_400_000;
/** Aynı adrese en sık bu aralıkla onay e-postası gider. */
export const ONAY_ARALIGI_MS = 10 * DAKIKA;
/** Onay bağlantısının ve bekleyen kaydın geçerlilik süresi. */
export const BEKLEME_MS = 7 * GUN;
export const EN_FAZLA_HABER = 10;
export const EN_FAZLA_KAMPANYA = 5;
/** Resend toplu gönderim tavanı: çağrı başına en fazla 100 e-posta. */
export const PARTI_BOYU = 100;

const BELIRTEC_DESENI = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Cloudflare D1 ve ASSETS bağlamalarının kullanılan kısmı (paket tipleri yerine).
export interface D1Hazirlik {
  bind(...degerler: unknown[]): D1Hazirlik;
  first<T = Record<string, unknown>>(): Promise<T | null>;
  all<T = Record<string, unknown>>(): Promise<{ results: T[] }>;
  run(): Promise<unknown>;
}
export interface D1 {
  prepare(sql: string): D1Hazirlik;
}
export interface Ortam {
  DB: D1;
  ASSETS: { fetch(istek: Request): Promise<Response> };
  RESEND_API_KEY?: string;
  BULTEN_GONDEREN: string;
}

export interface AboneSatiri {
  id: number;
  eposta: string;
  durum: 'bekliyor' | 'onayli';
  belirtec: string;
  olusturma: string;
  onay: string | null;
}

// ---------- Saf fonksiyonlar ----------

/** E-posta adresini doğrular ve küçük harfe çevirir; geçersizse null. */
export function epostaDogrula(ham: unknown): string | null {
  if (typeof ham !== 'string') return null;
  const e = ham.trim().toLowerCase();
  if (e.length < 6 || e.length > 254) return null;
  const [yerel] = e.split('@');
  if (yerel.length > 64) return null;
  return /^[a-z0-9._%+-]+@[a-z0-9-]+(?:\.[a-z0-9-]+)*\.[a-z]{2,}$/.test(e) ? e : null;
}

/** ISO hafta anahtarı, örnek: 2026-W43. Hafta pazartesiyle başlar; yılın ilk haftası 4 Ocak'ı içeren haftadır. */
export function isoHafta(tarih: Date): string {
  const d = new Date(Date.UTC(tarih.getUTCFullYear(), tarih.getUTCMonth(), tarih.getUTCDate()));
  const gun = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - gun);
  const yilBasi = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const hafta = Math.ceil(((d.getTime() - yilBasi.getTime()) / GUN + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(hafta).padStart(2, '0')}`;
}

export interface Oge {
  baslik: string;
  ozet: string;
  url: string;
  tarih: string;
}

export interface HaftalikVeri {
  haberler: Oge[];
  kampanyalar: Oge[];
}

function ogeleriSec(ham: unknown, tavan: number, simdi: number): Oge[] {
  if (!Array.isArray(ham)) return [];
  const alt = simdi - 7 * GUN;
  const ust = simdi + GUN;
  const liste: Oge[] = [];
  for (const o of ham) {
    if (!o || typeof o !== 'object') continue;
    const { baslik, ozet, url, tarih } = o as Record<string, unknown>;
    if (typeof baslik !== 'string' || typeof ozet !== 'string' || typeof url !== 'string' || typeof tarih !== 'string') continue;
    if (!baslik.trim() || !url.startsWith(`${SITE}/`)) continue;
    const t = Date.parse(tarih);
    if (Number.isNaN(t) || t < alt || t > ust) continue;
    liste.push({ baslik: baslik.trim(), ozet: ozet.trim(), url, tarih });
  }
  return liste.sort((a, b) => Date.parse(b.tarih) - Date.parse(a.tarih)).slice(0, tavan);
}

/**
 * Derlemede üretilen /bulten/haftalik.json verisinden bu haftanın içeriği: son 7 günün haberleri (en fazla 10) ve
 * kampanya sayfaları (en fazla 5). Yalnız kifobu adresleri ve geçerli tarihli kayıtlar alınır.
 */
export function haftalikIcerik(ham: unknown, simdi: Date): HaftalikVeri {
  const k = (ham && typeof ham === 'object' ? ham : {}) as Record<string, unknown>;
  return {
    haberler: ogeleriSec(k.haberler, EN_FAZLA_HABER, simdi.getTime()),
    kampanyalar: ogeleriSec(k.kampanyalar, EN_FAZLA_KAMPANYA, simdi.getTime()),
  };
}

/** Bülten bağlantısına UTM ekler: utm_source=bulten, utm_medium=email, utm_campaign=haftalik-<hafta>. */
export function bultenUrl(url: string, hafta: string): string {
  const u = new URL(url);
  u.searchParams.set('utm_source', 'bulten');
  u.searchParams.set('utm_medium', 'email');
  u.searchParams.set('utm_campaign', `haftalik-${hafta}`);
  return u.toString();
}

export function kacis(metin: string): string {
  return metin.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string);
}

function tarihYazi(iso: string): string {
  return new Intl.DateTimeFormat('tr-TR', { timeZone: 'Europe/Istanbul', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(iso));
}

/** Bir alıcı için e-posta (HTML ve düz metin). Ayrılma bağlantısı alıcıya özeldir. */
export function epostaIcerigi(veri: HaftalikVeri, hafta: string, ayrilmaUrl: string): { konu: string; html: string; metin: string } {
  const konu = 'kifobu haftalık bülten: bu haftanın öne çıkanları';
  const bolum = (baslik: string, ogeler: Oge[]) =>
    ogeler.length === 0
      ? ''
      : `<h2 style="font-size:17px;margin:28px 0 12px;color:#141a17;border-top:2px solid #141a17;padding-top:12px">${kacis(baslik)}</h2>` +
        ogeler
          .map(
            (o) =>
              `<p style="margin:0 0 18px"><a href="${kacis(bultenUrl(o.url, hafta))}" style="color:#24503f;font-weight:bold;font-size:16px;text-decoration:underline">${kacis(o.baslik)}</a><br><span style="color:#3c4742;font-size:14px;line-height:1.5">${kacis(o.ozet)}</span><br><span style="color:#5b6660;font-size:12px">${kacis(tarihYazi(o.tarih))}</span></p>`,
          )
          .join('');
  const html = `<!doctype html><html lang="tr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${kacis(konu)}</title></head>
<body style="margin:0;padding:0;background:#eef1ed;font-family:Arial,Helvetica,sans-serif;color:#141a17">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#eef1ed"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff">
<tr><td style="background:#1d2723;color:#ecefe9;padding:18px 24px;font-size:20px;font-weight:bold">kifobu</td></tr>
<tr><td style="padding:24px">
<p style="margin:0 0 8px;font-size:15px;line-height:1.5">Son yedi günün kitle fonlaması haberleri ve takibe alınan kampanyaları.</p>
${bolum('Haberler', veri.haberler)}${bolum('Bu hafta takibe alınan kampanyalar', veri.kampanyalar)}
</td></tr>
<tr><td style="padding:16px 24px;border-top:1px solid #c3cbc5;font-size:12px;line-height:1.6;color:#5b6660">
Bu e-postayı kifobu haftalık bülten aboneliğiniz nedeniyle alıyorsunuz. Aboneliği tek tıkla bitirebilirsiniz: <a href="${kacis(ayrilmaUrl)}" style="color:#24503f">Aboneliği bitir</a>.<br>
Verilerin nasıl işlendiği: <a href="${SITE}/gizlilik/" style="color:#24503f">Gizlilik</a>.
</td></tr>
</table></td></tr></table></body></html>`;
  const metin = [
    'kifobu haftalık bülten',
    '',
    'Son yedi günün kitle fonlaması haberleri ve takibe alınan kampanyaları.',
    '',
    ...(veri.haberler.length ? ['HABERLER', ...veri.haberler.flatMap((o) => [o.baslik, o.ozet, bultenUrl(o.url, hafta), tarihYazi(o.tarih), ''])] : []),
    ...(veri.kampanyalar.length
      ? ['BU HAFTA TAKİBE ALINAN KAMPANYALAR', ...veri.kampanyalar.flatMap((o) => [o.baslik, o.ozet, bultenUrl(o.url, hafta), tarihYazi(o.tarih), ''])]
      : []),
    '---',
    `Bu e-postayı kifobu haftalık bülten aboneliğiniz nedeniyle alıyorsunuz. Aboneliği bitirmek için: ${ayrilmaUrl}`,
    `Verilerin nasıl işlendiği: ${SITE}/gizlilik/`,
  ].join('\n');
  return { konu, html, metin };
}

// ---------- Yanıt yardımcıları ----------

const yonlendir = (yol: string, durum = 303) => new Response(null, { status: durum, headers: { Location: yol } });
const kontrolYanit = () => yonlendir('/bulten/?durum=kontrol');

// ---------- Resend ----------

async function resendIstegi(ortam: Ortam, yol: string, govde: unknown): Promise<Response> {
  return fetch(`https://api.resend.com${yol}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${ortam.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(govde),
    signal: AbortSignal.timeout(30_000),
  });
}

async function onayEpostasiGonder(ortam: Ortam, eposta: string, belirtec: string): Promise<void> {
  const onayUrl = `${SITE}/api/bulten/onay?t=${belirtec}`;
  const res = await resendIstegi(ortam, '/emails', {
    from: ortam.BULTEN_GONDEREN,
    to: [eposta],
    subject: 'kifobu bülten aboneliğinizi onaylayın',
    text: `Haftalık kitle fonlaması bülteni aboneliğinizi onaylamak için bağlantıya tıklayın:\n${onayUrl}\n\nBağlantı 7 gün geçerlidir. Bu isteği siz yapmadıysanız bu e-postayı yok sayabilirsiniz.`,
    html: `<p>Haftalık kitle fonlaması bülteni aboneliğinizi onaylamak için <a href="${kacis(onayUrl)}">buraya tıklayın</a>.</p><p>Bağlantı 7 gün geçerlidir. Bu isteği siz yapmadıysanız bu e-postayı yok sayabilirsiniz.</p>`,
  });
  if (!res.ok) throw new Error(`Resend onay yanıtı ${res.status}`);
}

// ---------- Uç nokta işleyicileri ----------

/** POST /api/bulten/abone */
export async function abonelikIstegi(istek: Request, ortam: Ortam, simdi: Date = new Date()): Promise<Response> {
  if (!ortam.RESEND_API_KEY) return yonlendir('/bulten/?durum=kapali');
  let form: FormData;
  try {
    form = await istek.formData();
  } catch {
    return yonlendir('/bulten/?durum=eposta');
  }
  // Tuzak alanı doluysa bot sayılır: aynı yanıt, hiçbir şey yapılmaz.
  if (String(form.get('web') ?? '') !== '') return kontrolYanit();
  const eposta = epostaDogrula(form.get('eposta'));
  if (!eposta) return yonlendir('/bulten/?durum=eposta');

  const simdiIso = simdi.toISOString();
  let mevcut = await ortam.DB.prepare('SELECT id, eposta, durum, belirtec, olusturma, onay FROM abone WHERE eposta = ?').bind(eposta).first<AboneSatiri>();
  if (mevcut?.durum === 'onayli') return kontrolYanit();
  if (mevcut && mevcut.durum === 'bekliyor' && simdi.getTime() - Date.parse(mevcut.olusturma) > BEKLEME_MS) {
    await ortam.DB.prepare('DELETE FROM abone WHERE id = ?').bind(mevcut.id).run();
    mevcut = null;
  }
  if (mevcut?.onay && simdi.getTime() - Date.parse(mevcut.onay) < ONAY_ARALIGI_MS) return kontrolYanit();

  const belirtec = crypto.randomUUID();
  if (mevcut) {
    await ortam.DB.prepare('UPDATE abone SET belirtec = ?, onay = ? WHERE id = ?').bind(belirtec, simdiIso, mevcut.id).run();
  } else {
    await ortam.DB.prepare("INSERT INTO abone (eposta, dil, durum, belirtec, olusturma, onay) VALUES (?, ?, 'bekliyor', ?, ?, ?)")
      .bind(eposta, DIL, belirtec, simdiIso, simdiIso)
      .run();
  }
  try {
    await onayEpostasiGonder(ortam, eposta, belirtec);
  } catch (hata) {
    // Adres günlüğe yazılmaz; yalnız hatanın türü.
    console.error('[BULTEN] Onay e-postası gönderilemedi:', hata instanceof Error ? hata.message : 'bilinmeyen hata');
  }
  return kontrolYanit();
}

/** GET /api/bulten/onay?t=<belirtec> */
export async function onayIstegi(istek: Request, ortam: Ortam, simdi: Date = new Date()): Promise<Response> {
  const t = new URL(istek.url).searchParams.get('t') ?? '';
  const gecersiz = () => yonlendir('/bulten/?durum=gecersiz');
  if (!BELIRTEC_DESENI.test(t)) return gecersiz();
  const satir = await ortam.DB.prepare('SELECT id, durum, olusturma FROM abone WHERE belirtec = ?').bind(t).first<{ id: number; durum: string; olusturma: string }>();
  if (!satir) return gecersiz();
  if (satir.durum === 'onayli') return yonlendir('/bulten/?durum=onaylandi');
  if (simdi.getTime() - Date.parse(satir.olusturma) > BEKLEME_MS) {
    await ortam.DB.prepare('DELETE FROM abone WHERE id = ?').bind(satir.id).run();
    return gecersiz();
  }
  await ortam.DB.prepare("UPDATE abone SET durum = 'onayli', onay = ? WHERE id = ?").bind(simdi.toISOString(), satir.id).run();
  return yonlendir('/bulten/?durum=onaylandi');
}

/** GET /api/bulten/ayril?t=: tek tuşlu onay sayfası. Bağlantı tarayıcı ön yüklemesi aboneliği silmesin diye GET silmez. */
export function ayrilSayfasi(istek: Request): Response {
  const t = new URL(istek.url).searchParams.get('t') ?? '';
  const gecerli = BELIRTEC_DESENI.test(t);
  const govde = gecerli
    ? `<form method="post" action="/api/bulten/ayril?t=${t}"><p>Haftalık bültenin gönderilmesini durdurmak istiyor musunuz?</p><button type="submit">Aboneliği bitir</button></form>`
    : '<p>Bu bağlantı geçersiz. Bülten e-postasındaki bağlantıyı kullanın ya da <a href="/bulten/">bülten sayfasına</a> dönün.</p>';
  const html = `<!doctype html><html lang="tr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>Aboneliği bitir | kifobu</title>
<style>body{font-family:Arial,Helvetica,sans-serif;background:#eef1ed;color:#141a17;margin:0;padding:48px 16px}main{max-width:520px;margin:0 auto;background:#fff;padding:24px;border-top:4px solid #1d2723}button{font:inherit;font-weight:bold;padding:10px 16px;border:2px solid #141a17;background:#fff;color:#141a17;cursor:pointer}button:hover{background:#1d2723;color:#ecefe9}a{color:#24503f}</style></head>
<body><main><h1 style="font-size:22px">kifobu haftalık bülten</h1>${govde}</main></body></html>`;
  return new Response(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; base-uri 'none'",
      'X-Robots-Tag': 'noindex',
    },
  });
}

/** POST /api/bulten/ayril?t=: aboneliği siler. RFC 8058 tek tıkla (List-Unsubscribe=One-Click) isteğine 200 döner. */
export async function ayrilIstegi(istek: Request, ortam: Ortam): Promise<Response> {
  const t = new URL(istek.url).searchParams.get('t') ?? '';
  if (BELIRTEC_DESENI.test(t)) await ortam.DB.prepare('DELETE FROM abone WHERE belirtec = ?').bind(t).run();
  const govde = await istek.text().catch(() => '');
  if (govde.includes('List-Unsubscribe=One-Click')) return new Response('Aboneliğiniz bitirildi.', { status: 200 });
  return yonlendir('/bulten/?durum=ayrildi');
}

// ---------- Haftalık gönderim ----------

/**
 * Pazartesi sabahı çalışır. Sırayla: 7 günden eski onaysız kayıtları siler; bu hafta gönderildiyse çıkar; haber
 * yoksa ya da kimse onaylı değilse çıkar; değilse onaylı abonelere Resend toplu gönderimiyle e-posta yollar ve
 * gonderim satırını yazar. Dönüş değeri günlük için kısa bir durumdur.
 */
export async function haftalikGonderim(ortam: Ortam, simdi: Date = new Date()): Promise<string> {
  const onaysizSinir = new Date(simdi.getTime() - BEKLEME_MS).toISOString();
  await ortam.DB.prepare("DELETE FROM abone WHERE durum = 'bekliyor' AND olusturma < ?").bind(onaysizSinir).run();

  const hafta = isoHafta(simdi);
  const onceden = await ortam.DB.prepare('SELECT hafta FROM gonderim WHERE hafta = ? AND dil = ?').bind(hafta, DIL).first();
  if (onceden) return `${hafta}: bu hafta zaten gönderildi`;

  const yanit = await ortam.ASSETS.fetch(new Request(`${SITE}/bulten/haftalik.json`));
  if (!yanit.ok) return `${hafta}: haftalik.json yok (${yanit.status})`;
  const veri = haftalikIcerik(await yanit.json().catch(() => null), simdi);
  if (veri.haberler.length === 0) return `${hafta}: bu hafta haber yok, gönderilmedi`;

  const { results: aboneler } = await ortam.DB.prepare("SELECT eposta, belirtec FROM abone WHERE durum = 'onayli' AND dil = ?").bind(DIL).all<{ eposta: string; belirtec: string }>();
  if (aboneler.length === 0) return `${hafta}: onaylı abone yok`;
  if (!ortam.RESEND_API_KEY) throw new Error('RESEND_API_KEY tanımlı değil');

  const mailler = aboneler.map((a) => {
    const ayrilmaUrl = `${SITE}/api/bulten/ayril?t=${a.belirtec}`;
    const { konu, html, metin } = epostaIcerigi(veri, hafta, ayrilmaUrl);
    return {
      from: ortam.BULTEN_GONDEREN,
      to: [a.eposta],
      subject: konu,
      html,
      text: metin,
      headers: { 'List-Unsubscribe': `<${ayrilmaUrl}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' },
    };
  });

  let gonderilen = 0;
  for (let i = 0; i < mailler.length; i += PARTI_BOYU) {
    const parti = mailler.slice(i, i + PARTI_BOYU);
    const res = await resendIstegi(ortam, '/emails/batch', parti);
    if (!res.ok) throw new Error(`Resend toplu gönderim yanıtı ${res.status} (${hafta}, ${gonderilen} e-posta gitmişti)`);
    const sonuc = (await res.json().catch(() => ({}))) as { errors?: unknown[] };
    const hatali = Array.isArray(sonuc.errors) ? sonuc.errors.length : 0;
    if (hatali > 0) console.error(`[BULTEN] ${hafta}: parti içinde ${hatali} e-posta reddedildi`);
    gonderilen += parti.length - hatali;
  }

  await ortam.DB.prepare('INSERT INTO gonderim (hafta, dil, zaman, adet) VALUES (?, ?, ?, ?)').bind(hafta, DIL, simdi.toISOString(), gonderilen).run();
  return `${hafta}: ${gonderilen} e-posta gönderildi`;
}
