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
// Kapsam (2026-10-15 daraltıldı, 2026-10-17 site sahibinin kararıyla dünya girişim ekosistemine açıldı): kifobu genel
// teknoloji sitesi değil, Türkiye ağırlıklı girişim, girişim yatırımı ve kitle fonlama bültenidir. Dünyadan dikkat çeken
// girişim haberleri (YC, büyük fonlar, büyük turlar) de yazılır. Büyük teknoloji şirketlerinin ürün, model, işten
// çıkarma ve donanım haberleri yazılmaz.
export const KAPSAM = `kifobu girişim, girişim yatırımı ve kitle fonlama haberleri yayımlar; Türkiye önceliklidir. Uygun haberler:
1. Türkiye'de paya dayalı ya da ödül bazlı kitle fonlama kampanyaları: açılan, süren, hedefe ulaşan ya da ulaşamayan kampanyalar; toplanan tutar, hedef, yatırımcı sayısı, platform.
2. Türkiye'deki kitle fonlama platformları: yeni lisanslar, platform verileri, platform duyuruları, birleşme ve kapanışlar.
3. SPK'nın ve diğer kamu kurumlarının kitle fonlamasını, girişim sermayesini ve melek yatırımı ilgilendiren kararları, tebliğleri, bültenleri; vergi teşvikleri.
4. Türk girişimlerinin (Türkiye'de kurulmuş ya da Türk kurucuların) yatırım turları, satın alınmaları, halka arzları; Türkiye'deki girişim sermayesi fonları, melek ağları, hızlandırıcılar ve bunların yatırımları; Türkiye girişim ekosistemi raporları.
5. Dünya kitle fonlaması: büyük kitle fonlama platformlarının (ör. Republic, Wefunder, Crowdcube, Seedrs, Kickstarter) önemli gelişmeleri, kitle fonlama mevzuatı (ör. AB ECSP).
6. Dünya girişim ekosistemi: Y Combinator, Techstars gibi hızlandırıcıların dönemleri, demo günleri ve öne çıkan girişimleri; a16z, Sequoia gibi büyük girişim sermayesi fonlarının yeni fonları ve stratejileri; dikkat çeken yatırım turları (yaklaşık 50 milyon dolar ve üstü ya da çok konuşulan bir girişimin turu), yeni unicorn'lar, girişim satın almaları ve halka arzları; girişim yatırımı eğilimleri ve raporları.
Uygun olmayanlar: büyük teknoloji şirketlerinin (Apple, Google, Microsoft, Amazon, Meta, OpenAI, Anthropic, Nvidia, SpaceX, Netflix vb.) ürün, model, özellik, güncelleme, fiyat, üretim, işten çıkarma, yönetici ve güvenlik haberleri; donanım, telefon, otomobil ve geri çağırma haberleri; yatırım içermeyen genel yapay zekâ ve teknoloji haberleri; girişimlerin ürün tanıtımları; özel sermaye (private equity) satın almaları, borç finansmanı ve yerleşik şirketlerin birleşmeleri; borsa, kripto para ve banka haberleri; ürün incelemesi, indirim, "nasıl yapılır" rehberi, etkinlik tanıtımı, haftalık toplu özet, oyun/film/magazin, sponsorlu tanıtım, köşe yazısı ve dedikodu.`;

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
  const prompt = `Sen kifobu'nun muhabirisin. kifobu, Türkiye ağırlıklı olarak girişim, girişim yatırımı ve kitle fonlama ekosistemini izleyen; yatırımları, fonlamaları ve girişimleri tarafsız, sade ve rakam öncelikli bir dille haberleştiren bir bülten.

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

// Dilim derlemesi (havuz.mjs): havuza girdiği dilim bitmiş, tek başına uzunluk denetimini geçemeyen kısa haberler
// kategori aranmadan tek yazıda toplanır; yazıda her kategori bir ara başlık, her haber 50-80 kelimelik bir paragraftır.
// grup: havuz olayları (kaynaklar kendi bölümünde). Derlemede künye yoktur (tek bir yatırımı anlatmaz).
export const KATEGORI_ADLARI = { kampanyalar: 'Kampanyalar', platformlar: 'Platformlar', yatirimlar: 'Yatırımlar', girisimler: 'Girişimler', mevzuat: 'Mevzuat', analiz: 'Analiz' };
const kategoriAdi = (k) => KATEGORI_ADLARI[k] ?? k ?? '';

// En çok haberi olan kategori; eşitlikte gruptaki ilk haberinki.
export function enSikKategori(grup) {
  const sayi = new Map();
  for (const o of grup) sayi.set(o.kategori, (sayi.get(o.kategori) ?? 0) + 1);
  return grup.reduce((en, o) => (sayi.get(o.kategori) > sayi.get(en) ? o.kategori : en), grup[0].kategori);
}

// Derleme gövde hedefi: haber başına 50-80 kelimelik paragraf. Tek cümlelik özetler derlemeyi alt sınırın altında bırakıyordu.
export const derlemeHedefi = (n) => ({ alt: Math.max(250, n * 50), ust: Math.max(400, n * 80) });

const DERLEME_SEMASI = {
  type: 'object',
  properties: {
    title: TASLAK_SEMASI.properties.title,
    description: TASLAK_SEMASI.properties.description,
    body: { type: 'string', description: 'Markdown; kategori başına "## " ara başlık, altında her haber için 50-80 kelimelik bir paragraf' },
    why_matters: TASLAK_SEMASI.properties.why_matters,
    key_points: TASLAK_SEMASI.properties.key_points,
  },
  required: ['title', 'description', 'body'],
};

// Haberler kategori ara başlıkları altında; kategoriler gruptaki ilk görünüş sırasıyla, her haberin kendi kaynağı yanında.
function haberBlogu(grup) {
  const kategoriler = [...new Set(grup.map((o) => o.kategori ?? ''))];
  return kategoriler
    .map(
      (k) =>
        `## ${kategoriAdi(k)}\n` +
        grup
          .filter((o) => (o.kategori ?? '') === k)
          .map((o) => `### ${o.baslik}\nKAYNAK:\n${o.kaynaklar.map((x) => `${x.baslik}\n${x.metin}`).join('\n\n')}`)
          .join('\n\n'),
    )
    .join('\n\n');
}

export function derlemeIstemi(grup) {
  const { alt, ust } = derlemeHedefi(grup.length);
  return `Sen kifobu'nun muhabirisin. Aşağıda aynı zaman diliminden ${grup.length} kısa haber var; her biri tek başına tam bir haber taşıyacak kadar kaynak içermiyor.
Bunları tek bir Türkçe derleme haberinde topla:
- title: dilimin öne çıkan konularını anlatan başlık; okurun arayacağı kelimeyle (konu, platform, kurum) başlar, iki noktalı önek yok, tek bir haberi öne çıkarmaz, tarih ve saat yazma.
- description: derlemenin ana noktası, 1-2 cümle.
- body: Markdown, ${alt}-${ust} kelime. Her kategori için bir ara başlık ("## Kategori adı", HABERLER'deki sırayla), altında o kategorideki her haber için bir paragraf. Her paragraf 50-80 kelime (3-4 cümle): haberin öznesiyle (girişim, platform, kurum) başlar; önce rakamları, ne olduğunu ve kimin açıkladığını anlatır. Tek cümlelik özet yazma.
  Her paragraf YALNIZCA o haberin KAYNAK bölümündeki olgularla yazılır; bir haberin kaynağında yetmeyen bilgi için başka haberin kaynağını kullanma, uydurma, dolgu cümlesi ekleme.
- why_matters: bu gelişmelerin birlikte ekosistem için ne anlattığı, 1-2 cümle.

${YAZIM_KURALLARI}

HABERLER:
${haberBlogu(grup)}`;
}

// Döner: derleme taslağı ({ title, description, body, category, why_matters?, key_points? }) ya da null.
export async function derlemeYaz(grup) {
  const t = await gemini({ prompt: derlemeIstemi(grup), schema: DERLEME_SEMASI });
  if (!t?.title || !t?.body) return null;
  return { ...t, category: enSikKategori(grup) };
}

// Kısa kalan derlemeyi genişletir: ara başlıklar ve sıra korunur, her paragraf yalnız kendi haberinin kaynağıyla uzar.
// Başarısızsa taslak aynen döner.
export async function derlemeUzat(taslak, grup, kelime) {
  const { alt, ust } = derlemeHedefi(grup.length);
  const r = await gemini({
    schema: DERLEME_SEMASI,
    prompt: `Bu derleme haberinin gövdesi ${kelime} kelime; ${alt}-${ust} kelime olmalı. Her haber paragrafını 50-80 kelimeye (3-4 cümle) genişlet: ne olduğu, ana rakam, kimin açıkladığı, kaynaktaki bağlam.
Her paragrafı yalnızca HABERLER'de o haberin kendi KAYNAK bölümündeki bilgilerle genişlet; başka haberin kaynağını kullanma. Kaynakta olmayan bilgi, rakam, tahmin ya da yorum ekleme; aynı bilgiyi tekrar etme, dolgu cümlesi yazma. Ara başlıkları ("## ..."), paragraf sırasını, başlığı ve spotu değiştirme.

${YAZIM_KURALLARI}

HABERLER:
${haberBlogu(grup)}

TASLAK:
Başlık: ${taslak.title}
Spot: ${taslak.description}

${taslak.body}`,
  });
  return r?.title && r?.body ? { ...taslak, ...r, category: taslak.category } : taslak;
}

// Ön eleme ve haber değeri tek çağrıda: 0 = kifobu'ya uygun değil, 1–100 = haber değeri.
// Yerli de yabancı da MIN_DEGER'le geçer. 2026-10-17 site sahibinin kararıyla ölçek 0–5'ten 0–100'e geçti ve eşik
// 3/5'ten 3,5/5'e, yani 70/100'e çıktı (tam sayılı 0–5'te 3,5 pratikte 4 olurdu). 2026-10-19 sahibinin kararıyla 60'a indi:
// kapsam dünya girişim ekosistemine açıldıktan sonra dünyadaki sıradan turlar 50–69 alıp eleniyor, günlük yazı 0–2'ye düşmüştü.
export const MIN_DEGER = 60;
export const OLCEK = 100;
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
 * Başlık listesinin her birine puan verir (0 kapsam dışı, 1–100 haber değeri). Döner: indeksle hizalı puan dizisi;
 * modelin atladığı başlık puansız (undefined) kalır: bu turda yazılmaz, bir sonraki turda yeniden sorulur (standartlar: emin değilse yayımlama).
 * Gemini yoksa ya da cevap gelmezse null.
 */
export async function onEle(basliklar, { kall = gemini } = {}) {
  if (!basliklar.length) return [];
  const r = await kall({
    schema: ELEME_SEMASI,
    dusunme: 'minimal',
    prompt: `Sen kifobu'nun haber editörüsün. kifobu, Türkiye ağırlıklı olarak girişim, girişim yatırımı ve kitle fonlama ekosistemini izleyen bir bülten. Aşağıdaki her başlığa 0–100 arası bir puan ver. Başlığın önündeki [TR] Türkiye kaynaklı, [Dünya] yabancı kaynaklı haber demektir.

${KAPSAM}

Puanlar:
0 = kifobu'nun kapsamı dışında (yukarıdaki "uygun olmayanlar"; girişimler, girişim yatırımı ve kitle fonlamasıyla ilgisi olmayan her şey).
90–100 = Türkiye'de kitle fonlama kampanyası, platformu ya da SPK kararı; Türk girişiminin büyük turu, satın alınması ya da halka arzı; dünyada kitle fonlamasını ya da girişim yatırımını doğrudan etkileyen çok önemli gelişme (ör. yaklaşık 500 milyon dolar üstü tur, büyük kitle fonlama platformunun satın alınması, kitle fonlama mevzuatı, Y Combinator'ın büyük bir değişikliği).
70–89 = Türk girişiminin her yatırım turu; Türkiye'deki girişim sermayesi fonları, melek ağları ve ekosistem raporları; dünyada dikkat çeken girişim haberi (yaklaşık 50 milyon dolar ve üstü tur, yeni unicorn, tanınmış girişimin satın alınması ya da halka arzı, Y Combinator demo günü ya da dönemi, büyük girişim sermayesi fonunun yeni fonu).
50–69 = kapsamda ama sıradan haber (Türkiye'de program başvuruları, yönetici değişiklikleri; dünyada 50 milyon doların altındaki sıradan turlar).
30–49 = kapsamda ama zayıf: rutin duyuru, içeriği belirsiz ortaklık, tanıtım kokan haber.
1–29 = kapsamda ama okura neredeyse hiçbir şey söylemiyor.
Aralığın içinde ince ayar yap; 60 ve üstü yayımlanır, emin değilsen 60 verme. Kararsızsan düşük puan ver: kifobu az ama konusunda haber yayımlar. Aynı önemdeki haberlerde Türkiye ile ilgili olana daha yüksek puan ver.

Başlıklar:
${basliklar.map((b, i) => `${i}. ${b}`).join('\n')}`,
  });
  if (!r?.puanlar) return null;
  const puan = basliklar.map(() => undefined);
  for (const { nr, puan: p } of r.puanlar) if (Number.isInteger(nr) && nr >= 0 && nr < basliklar.length && Number.isInteger(p)) puan[nr] = Math.min(100, Math.max(0, p));
  return puan;
}

/**
 * Önbellekli puanlama: önceki turlarda puanlanmış olay (kayit[anahtar] = { puan, olcek: 100, zaman }) yeniden sorulmaz.
 * Eski 0–5 ölçekli kayıtlar (olcek yok) yok sayılır, yeniden puanlanır.
 * Döner: basliklar ile hizalı puan dizisi; yeni puanlar kayda yazılır. Bir parça cevapsız kalırsa null.
 */
export async function onbellekliPuanla(basliklar, anahtarlar, kayit, { kall = gemini, parca = 60, zaman = new Date().toISOString() } = {}) {
  const puan = anahtarlar.map((k) => (kayit[k]?.olcek === OLCEK ? kayit[k].puan : undefined));
  const sor = puan.map((p, i) => (p === undefined ? i : -1)).filter((i) => i >= 0);
  for (let i = 0; i < sor.length; i += parca) {
    const dilim = sor.slice(i, i + parca);
    const sonuc = await onEle(dilim.map((n) => basliklar[n]), { kall });
    if (sonuc === null) return null;
    sonuc.forEach((p, j) => {
      puan[dilim[j]] = p;
      if (p !== undefined) kayit[anahtarlar[dilim[j]]] = { puan: p, olcek: OLCEK, zaman };
    });
  }
  return puan;
}
