// Yazar: aynı olayı anlatan bir ya da birkaç kaynak haberi okuyup kifobu'nun diliyle tek bir haber yazar
// ve varsa künyeyi (girişim, tutar, tur, yatırımcılar) çıkarır. onEle: yazmadan önce başlıklardan
// kifobu'ya uymayanları ve haber değeri düşük olanları tek çağrıda ayıklar (her habere ayrı yazma çağrısı harcanmasın).
import { gemini, KATEGORILER, PARA_BIRIMLERI } from './lib.mjs';

export const TASLAK_SEMASI = {
  type: 'object',
  properties: {
    ayniOlay: { type: 'boolean', description: 'Kaynakların hepsi aynı olayı mı anlatıyor?' },
    uygun: { type: 'boolean', description: 'Haber kifobu için uygun mu?' },
    neden: { type: 'string', description: 'Uygun değilse ya da aynı olay değilse kısa gerekçe' },
    title: { type: 'string', description: 'En fazla 90 karakter başlık; girişim, platform ya da kurum adıyla başlar, iki noktalı önek yok' },
    description: { type: 'string', description: '1-2 cümlelik spot' },
    body: { type: 'string', description: 'Markdown haber metni, 250-400 kelime, 4-6 paragraf; ilk paragrafta rakamlar' },
    category: { type: 'string', enum: KATEGORILER },
    girisim: { type: 'string', description: 'Yatırım ya da fon alan girişimin adı; yatırım haberi değilse boş' },
    toplanan: { type: 'number', description: 'Yatırım tutarı, tam sayı (1,1 milyon → 1100000); yoksa 0' },
    paraBirimi: { type: 'string', enum: PARA_BIRIMLERI },
    tur: { type: 'string', description: 'Yatırım turu (Tohum, Seri A ...); yoksa boş' },
    yatirimcilar: { type: 'string', description: 'Yatırım yapan fon ve kişiler, virgülle, öncü önce; yoksa boş' },
    platform: { type: 'string', description: 'Sadece kitle fonlama kampanyasıysa platformun adı; değilse boş' },
    hedef: { type: 'number', description: 'Sadece kitle fonlama kampanyasının hedef tutarı; yoksa 0' },
    yatirimci: { type: 'number', description: 'Sadece kitle fonlamasında yatırımcı sayısı; yoksa 0' },
    why_matters: { type: 'string', description: '1-2 cümle: Bu girişim/yatırım gelişmesi ekosistem için neden önemli?' },
    key_points: { type: 'array', maxItems: 3, items: { type: 'string' }, description: 'Haberden 3 somut madde / rakam' },
  },
  required: ['ayniOlay', 'uygun', 'neden', 'title', 'description', 'body', 'category', 'girisim', 'toplanan', 'paraBirimi', 'tur', 'yatirimcilar', 'platform', 'hedef', 'yatirimci'],
};

// kifobu'nun haber kapsamı: yazar da ön eleme de aynı tanımı kullanır.
// Kapsam daraltıldı (2026-10-15, site sahibinin kararı): kifobu genel teknoloji sitesi değil, Türkiye'nin kitle fonlama
// ve girişim yatırımı bültenidir. Büyük teknoloji şirketlerinin ürün, model, işten çıkarma ve donanım haberleri yazılmaz.
export const KAPSAM = `kifobu'nun konusu dardır. Uygun haberler:
1. Türkiye'de paya dayalı ya da ödül bazlı kitle fonlama kampanyaları: açılan, süren, hedefe ulaşan ya da ulaşamayan kampanyalar; toplanan tutar, hedef, yatırımcı sayısı, platform.
2. Türkiye'deki kitle fonlama platformları: yeni lisanslar, platform verileri, platform duyuruları, birleşme ve kapanışlar.
3. SPK'nın ve diğer kamu kurumlarının kitle fonlamasını, girişim sermayesini ve melek yatırımı ilgilendiren kararları, tebliğleri, bültenleri; vergi teşvikleri.
4. Türk girişimlerinin (Türkiye'de kurulmuş ya da Türk kurucuların) yatırım turları, satın alınmaları, halka arzları; Türkiye'deki girişim sermayesi fonları, melek ağları, hızlandırıcılar ve bunların yatırımları; Türkiye girişim ekosistemi raporları.
5. Dünyadan yalnızca çok önemli kitle fonlama ve girişim yatırımı haberleri: büyük kitle fonlama platformlarının (ör. Republic, Wefunder, Crowdcube, Seedrs, Kickstarter) önemli gelişmeleri, kitle fonlama mevzuatı (ör. AB ECSP), ekosistemde çok konuşulacak dev yatırım turları ya da girişim satın almaları.
Uygun olmayanlar: büyük teknoloji şirketlerinin (Apple, Google, Microsoft, Amazon, Meta, OpenAI, Anthropic, Nvidia, SpaceX, Netflix vb.) ürün, model, özellik, güncelleme, fiyat, üretim, işten çıkarma, yönetici ve güvenlik haberleri; donanım, telefon, otomobil ve geri çağırma haberleri; yatırım içermeyen genel yapay zekâ ve teknoloji haberleri; yabancı girişimlerin sıradan yatırım turları ve ürün tanıtımları; borsa, kripto para ve banka haberleri; ürün incelemesi, indirim, "nasıl yapılır" rehberi, etkinlik tanıtımı, haftalık toplu özet, oyun/film/magazin, sponsorlu tanıtım, köşe yazısı ve dedikodu.`;

export const YAZIM_KURALLARI = `Yazım kuralları:
- Kendi cümlelerinle yaz. Kaynakların cümlelerini, paragraf yapısını ve sıralamasını kopyalama; olguları al, metni yeniden kur. Hiçbir kaynaktan art arda 7 kelimeden uzun bir parça geçmesin (özel adlar hariç).
- Sadece kaynaklardaki bilgileri kullan. Kaynaklarda olmayan rakam, tarih, isim, kurum, yorum ya da tahmin ekleme. Kaynaklar bir rakamda çelişiyorsa o rakamı yazma.
- Kaynak sitelerin adını anma ("X'in haberine göre" yazma); haberi doğrudan ver. Şirket açıklaması, rapor gibi asıl kaynak varsa ona atfedebilirsin.
- Rakamlar Türkçe yazılır: ondalık virgül, binlik nokta ("1,1 milyon dolar", "2,8 milyon TL", "%40").
- Doğrudan alıntı yapacaksan kaynaktaki sözü kelimesi kelimesine, “ ” işaretleri içinde ve kime ait olduğunu yazarak ver. Alıntı şart değil.
- "bugün", "dün", "yarın", "bu hafta" gibi göreli zaman ifadeleri kullanma; gerekiyorsa tarihi yaz.
- Tarafsız ve sade ol: övgü, abartı ("dev", "çığır açan", "şok"), tık tuzağı, reklam dili ve yatırım tavsiyesi yok.
- Başlık olguyu söylesin, merak tuzağı kurmasın. Yatırım haberinde: kim, hangi turda, ne kadar aldı. Sonunda nokta yok.
- Başlık okurun arayacağı kelimeyle başlasın: girişimin, platformun ya da kurumun adı ya da konunun kendisi (ör. "Örnek Girişim, Seri A turunda 5 milyon dolar yatırım aldı"; "SPK, kitle fonlama platformlarına yeni yükümlülük getirdi"). "SPK: ...", "Kurum: ...", "Son dakika: ..." gibi iki noktalı önekle başlama. "Bu girişim", "Bir şirket", "Neden ...", "İşte ..." gibi belirsiz başlangıç ve soru başlık kullanma.
- Uzunluk: gövde 250-400 kelime, 4-6 paragraf. Bu uzunluğu yalnızca kaynaklardaki olgularla doldur; kaynakta olmayan arka plan, yorum ya da tahmin ekleme.
- Sıra: önce rakamlar. İlk paragraf haberin özü: kim, ne kadar (tutar), hedef, hangi platform ya da hangi tur, hangi tarih. Sonraki paragraflarda kaynaklardaki bağlam: girişimin ne yaptığı, yatırımcılar, paranın nereye harcanacağı, önceki turlar, kampanyanın ya da kararın ayrıntıları. Başlık (#) ekleme.
- Dil: doğal, akıcı Türkçe; çeviri kokan ifadeler yok.`;

export async function taslakYaz(kaynaklar) {
  const metinler = kaynaklar
    .map((k, i) => `### Kaynak ${i + 1} (${k.tarih})\nBaşlık: ${k.baslik}\n"""\n${k.metin.slice(0, 7000)}\n"""`)
    .join('\n\n');
  const prompt = `Sen kifobu'nun muhabirisin. kifobu, Türkiye'nin kitle fonlama ve girişim yatırımı ekosistemini izleyen; yatırımları, fonlamaları ve girişimleri tarafsız, sade ve rakam öncelikli bir dille haberleştiren bir bülten.

${KAPSAM}
Kaynaklar İngilizce olsa dahi haber akıcı, doğal ve tam Türkçe yazılmalıdır. Uygun değilse uygun=false ver, nedeni yaz, diğer alanları boş bırak.

Kategori seçimi (yalnız bunlar):
- kitle fonlama kampanyaları (paya dayalı ya da ödül bazlı) → "kampanyalar"
- kitle fonlama platformlarının haberleri → "platformlar"
- SPK kararları, tebliğler, kitle fonlama ve girişim sermayesi mevzuatı → "mevzuat"
- girişim yatırım turları, girişim sermayesi fonları, melek yatırımlar → "yatirimlar"
- girişim satın almaları, halka arzlar, hızlandırıcı ve destek programları → "girisimler"
- sektör raporları ve rakamsal derlemeler → "analiz"

Künye (sadece yatırım ya da fonlama haberinde): girisim, toplanan (tam sayı), paraBirimi (TRY, USD, EUR, GBP; "TL" ve "lira" → TRY), tur ve yatirimcilar kaynaklardan aynen alınır. Yatırım haberi değilse girisim boş, toplanan 0.

${YAZIM_KURALLARI}

${kaynaklar.length > 1 ? `Aşağıda farklı haber sitelerinde yayımlanmış ${kaynaklar.length} haber var. Önce hepsinin aynı olayı anlatıp anlatmadığına karar ver (ayniOlay). Aynı olaysa, kaynaklarda ortak olan olgulardan kifobu için tek bir haber yaz.` : 'Aşağıda bir haber sitesinde yayımlanmış bir haber var (ayniOlay=true ver). Bu haberin olgularından kifobu için bir haber yaz.'}

${metinler}`;
  return gemini({ prompt, schema: TASLAK_SEMASI });
}

// Tema derlemesi (havuz.mjs): aynı kategoriden, tek başına uzunluk denetimini geçemeyen kısa haberler tek yazıda toplanır.
// kaynak: havuz.mjs → derlemeKaynagi (her haber kendi bölümünde). Derlemede künye yoktur (tek bir yatırımı anlatmaz).
const DERLEME_SEMASI = {
  type: 'object',
  properties: {
    title: TASLAK_SEMASI.properties.title,
    description: TASLAK_SEMASI.properties.description,
    body: { type: 'string', description: 'Markdown, 250-400 kelime; her haber için ### ara başlıklı kısa bir bölüm' },
    why_matters: TASLAK_SEMASI.properties.why_matters,
    key_points: TASLAK_SEMASI.properties.key_points,
  },
  required: ['title', 'description', 'body'],
};

export function derlemeIstemi(grup, kaynak) {
  const kategori = grup[0]?.kategori ?? 'yatirimlar';
  return `Sen kifobu'nun muhabirisin. Aşağıda "${kategori}" kategorisinden ${grup.length} kısa haber var; her biri tek başına tam bir haber taşıyacak kadar kaynak içermiyor.
Bunları tek bir Türkçe derleme haberinde topla (category="${kategori}"):
- title: haberlerin ortak temasını anlatan başlık; okurun arayacağı kelimeyle (konu, platform, kurum) başlar, iki noktalı önek yok, tek bir haberi öne çıkarmaz.
- description: derlemenin ana noktası, 1-2 cümle.
- body: 250-400 kelime. Her haber için "### " ile başlayan kısa bir ara başlık ve 1-2 paragraf; ara başlık o haberin öznesiyle (girişim, platform, kurum) başlar ve önce rakamları verir.
  Her bölüm YALNIZCA o haberin bölümündeki kaynak olgularla yazılır; haberler arasında bilgi taşıma. Kaynağında yeterli bilgi olmayan haberi yazma; uydurma ve dolgu cümlesi ekleme.
- why_matters: bu gelişmelerin birlikte ekosistem için ne anlattığı, 1-2 cümle.

${YAZIM_KURALLARI}

HABERLER:
${kaynak}`;
}

// Döner: derleme taslağı ({ title, description, body, category, why_matters?, key_points? }) ya da null.
export async function derlemeYaz(grup, kaynak) {
  const t = await gemini({ prompt: derlemeIstemi(grup, kaynak), schema: DERLEME_SEMASI });
  if (!t?.title || !t?.body) return null;
  return { ...t, category: grup[0].kategori };
}

// Ön eleme ve haber değeri tek çağrıda: 0 = kifobu'ya uygun değil, 1–5 = haber değeri.
// Türkiye kaynaklı olaylar MIN_DEGER'le, yalnız yabancı kaynaklı olaylar MIN_DEGER_KURESEL'le geçer
// (dünyadan yalnız önemli kitle fonlama ve girişim yatırımı haberleri). 5 iken site bir gün boyunca hiç yazı
// çıkaramadı; 2026-10-16 site sahibinin kararıyla 4.
export const MIN_DEGER = 3;
export const MIN_DEGER_KURESEL = 4;
const ELEME_SEMASI = {
  type: 'object',
  properties: {
    puanlar: {
      type: 'array',
      items: { type: 'object', properties: { nr: { type: 'integer' }, puan: { type: 'integer' } }, required: ['nr', 'puan'] },
    },
  },
  required: ['puanlar'],
};

/**
 * Başlık listesinin her birine puan verir (0 kapsam dışı, 1–5 haber değeri). Döner: indeksle hizalı puan dizisi;
 * modelin atladığı başlık MIN_DEGER alır (kararsızsa dahil). Gemini yoksa ya da cevap gelmezse null.
 */
export async function onEle(basliklar, { kall = gemini } = {}) {
  if (!basliklar.length) return [];
  const r = await kall({
    schema: ELEME_SEMASI,
    dusunme: 'minimal',
    prompt: `Sen kifobu'nun haber editörüsün. kifobu, Türkiye'nin kitle fonlama ve girişim yatırımı ekosistemini izleyen bir bülten. Aşağıdaki her başlığa bir puan ver. Başlığın önündeki [TR] Türkiye kaynaklı, [Dünya] yabancı kaynaklı haber demektir.

${KAPSAM}

Puanlar:
0 = kifobu'nun kapsamı dışında (yukarıdaki "uygun olmayanlar"; Türkiye ve kitle fonlamasıyla ilgisi olmayan her şey).
5 = Türkiye'de kitle fonlama kampanyası, platformu ya da SPK kararı; Türk girişiminin büyük turu, satın alınması ya da halka arzı; dünyada kitle fonlamasını ya da girişim yatırımını doğrudan etkileyen çok önemli gelişme (ör. yaklaşık 500 milyon dolar üstü tur, büyük kitle fonlama platformunun satın alınması, kitle fonlama mevzuatı).
4 = Türk girişiminin her yatırım turu; Türkiye'deki girişim sermayesi fonları, melek ağları ve ekosistem raporları.
3 = Türkiye ekosisteminde kapsamda ama sıradan haber (program başvuruları, yönetici değişiklikleri).
2 = kapsamda ama zayıf: rutin duyuru, içeriği belirsiz ortaklık, tanıtım kokan haber.
1 = kapsamda ama okura neredeyse hiçbir şey söylemiyor.
Yabancı girişimlerin sıradan turları en fazla 2 alır. Kararsızsan düşük puan ver: kifobu az ama konusunda haber yayımlar.

Başlıklar:
${basliklar.map((b, i) => `${i}. ${b}`).join('\n')}`,
  });
  if (!r?.puanlar) return null;
  const puan = basliklar.map(() => MIN_DEGER);
  for (const { nr, puan: p } of r.puanlar) if (Number.isInteger(nr) && nr >= 0 && nr < basliklar.length && Number.isInteger(p)) puan[nr] = Math.min(5, Math.max(0, p));
  return puan;
}

/**
 * Önbellekli puanlama: önceki turlarda puanlanmış olay (kayit[anahtar] = { puan, zaman }) yeniden sorulmaz.
 * Döner: basliklar ile hizalı puan dizisi; yeni puanlar kayda yazılır. Bir parça cevapsız kalırsa null.
 */
export async function onbellekliPuanla(basliklar, anahtarlar, kayit, { kall = gemini, parca = 60, zaman = new Date().toISOString() } = {}) {
  const puan = anahtarlar.map((k) => kayit[k]?.puan);
  const sor = puan.map((p, i) => (p === undefined ? i : -1)).filter((i) => i >= 0);
  for (let i = 0; i < sor.length; i += parca) {
    const dilim = sor.slice(i, i + parca);
    const sonuc = await onEle(dilim.map((n) => basliklar[n]), { kall });
    if (sonuc === null) return null;
    sonuc.forEach((p, j) => {
      puan[dilim[j]] = p;
      kayit[anahtarlar[dilim[j]]] = { puan: p, zaman };
    });
  }
  return puan;
}
