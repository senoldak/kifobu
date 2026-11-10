// Paylaşım kartlarının verisi: son güncellemeden kendiliğinden çıkar. /sekundery/kartlar/ ve Telegram betiği aynı listeyi kullanır.
// Kurallar: tek ilan (fiyat + adet) yok, kampanya adı yok, yorum yok; yalnız pay grubu kodu ve yüzde/sayı.
import { sonGun, tumAnahtarlar, satir, seri, kapanisKarsilastirma } from './sekundery-veri.mjs';
import { yuzdeYaz, kapanisDegeri, degisim } from './sekundery.mjs';
import virmanVeri from '../data/sekundery/virman.json';

const gunSaniye = (t) => Date.parse(`${t}T12:00:00`);
export const uzunTarih = (t) => new Date(`${t}T12:00:00`).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
const kisaTarih = (t) => new Date(`${t}T12:00:00`).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' });
const aralik = (d) => `${kisaTarih(d.acilis)} – ${kisaTarih(d.kapanis)}`;
const mn = (n) => `₺${(n / 1e6).toLocaleString('tr-TR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} mn`;
const yz1 = (n) => `%${(n * 100).toLocaleString('tr-TR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}`;
const yz2 = (n) => `%${n.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const sayi = (n) => n.toLocaleString('tr-TR');
const kod = (s) => `${s.kod} ${s.grup}`;
const say = (l, f) => String(l.filter((x) => x.y != null && f(x.y)).length);
const BES = 'Bütün pay grupları kifobu.com/sekundery sayfasında.';

// karo satırları: her pay grubu kodu, değeri ve yazısı (kart büyükten küçüğe dizer)
const seriYap = (l, yaz = yuzdeYaz) => l.map((x) => ({ kod: kod(x.s), deger: x.y, yazi: yaz(x.y) }));
// sayım cümlesi: "19 üstünde, 39 altında" (sayılar iri ve renkli)
const artiEksi = (l, ust = 'üstünde', alt = 'altında') => [
  { t: say(l, (v) => v > 0), sayi: true, renk: 'a' }, { t: ` ${ust}, ` },
  { t: say(l, (v) => v < 0), sayi: true, renk: 'e' },
  { t: ((z) => (z > 0 ? ` ${alt}, ${z} değişmeyen` : ` ${alt} · ${l.length} pay grubu`))(l.filter((x) => x.y === 0).length) },
];

/**
 * Geri bakış dönemleri (ana sayfadaki sekmelerle aynı kural): hedef güne (bugünden N gün önce) kapanışı en yakın, verisi olan
 * ilan dönemi; hedeften 45 günden uzaksa yok, aynı dönem iki kez kullanılmaz.
 */
function geriDonemler(bugun) {
  const verili = virmanVeri.donemler.filter((d) => d.kapanis < bugun && tumAnahtarlar().some((k) => kapanisDegeri(seri(k), d)));
  const kullanildi = new Set();
  const sonuc = {};
  for (const [k, gun] of [['ay1', 30], ['ay3', 91], ['ay6', 182], ['yil', 365]]) {
    if (!verili.length) break;
    const hedef = gunSaniye(bugun) - gun * 864e5;
    const d = [...verili].sort((a, b) => Math.abs(gunSaniye(a.kapanis) - hedef) - Math.abs(gunSaniye(b.kapanis) - hedef))[0];
    if (Math.abs(gunSaniye(d.kapanis) - hedef) > 45 * 864e5 || kullanildi.has(d.acilis)) continue;
    kullanildi.add(d.acilis);
    sonuc[k] = d;
  }
  return sonuc;
}

export function kartVerileri() {
  const bugun = sonGun?.tarih ?? '';
  if (!bugun) return { tarih: '', gun: '', kartlar: [] };
  const S = tumAnahtarlar().map((k) => satir(k));
  const ilanli = S.filter((s) => s.satis || s.alis);
  const surekli = S.filter((s) => s.surekli).length;

  // Günün özeti ve dönem durumu
  const acik = virmanVeri.donemler.find((d) => d.acilis <= bugun && bugun <= d.kapanis) ?? null;
  const sonraki = virmanVeri.donemler.find((d) => d.acilis > bugun) ?? null;
  const son = [...virmanVeri.donemler].reverse().find((d) => d.kapanis < bugun) ?? null;
  const kalan = acik ? Math.round((gunSaniye(acik.kapanis) - gunSaniye(bugun)) / 864e5) : null;
  const satisT = S.reduce((t, s) => t + (s.satis?.tutar ?? 0), 0), alisT = S.reduce((t, s) => t + (s.alis?.tutar ?? 0), 0);
  const satisN = S.reduce((t, s) => t + (s.satis?.ilanSayisi ?? 0), 0), alisN = S.reduce((t, s) => t + (s.alis?.ilanSayisi ?? 0), 0);
  const yeni = ilanli.some((s) => s.satis?.yeni != null || s.alis?.yeni != null) ? ilanli.reduce((t, s) => t + (s.satis?.yeni ?? 0) + (s.alis?.yeni ?? 0), 0) : null;

  const dag = S.filter((s) => s.satis && s.dagitim).map((s) => ({ s, y: s.satis.dagitimaGore }));
  const ito = S.filter((s) => s.satis?.enfaGore != null).map((s) => ({ s, y: s.satis.enfaGore }));
  // dövizde dağıtım fiyatı kampanya günü kuruyla, ilan bugünkü kurla çevrilir
  const dvz = (p) => S.filter((s) => s.satis && s[p]?.satisDagitimaGore != null).map((s) => ({ s, y: s[p].satisDagitimaGore }));
  const usd = dvz('usd'), eur = dvz('eur'), xau = dvz('xau');
  const ustSay = (l) => String(l.filter((x) => x.y > 0).length);
  const kk = kapanisKarsilastirma();
  const kap = [...kk.yukselen, ...kk.dusen].map((r) => ({ s: r.s, y: r.degisim }));
  const taraf = S.filter((s) => s.satis && s.alis).map((s) => ({ s, y: Math.round(((s.satis.enIyi - s.alis.enIyi) / s.satis.enIyi) * 10000) / 100 }));
  const geri = geriDonemler(bugun);
  const geriListe = (d) => (d ? S.filter((s) => s.satis).map((s) => ({ s, o: kapanisDegeri(seri(s.anahtar), d) })).filter((x) => x.o).map(({ s, o }) => ({ s, y: degisim(s.satis.enIyi, o.deger) })) : []);
  const geriKart = (k, ad) => {
    const d = geri[k];
    // geçen kapanış kartıyla aynı dönemse tekrar olur, gösterilmez
    if (!d || (kk.donem && d.acilis === kk.donem.acilis)) return null;
    const l = geriListe(d);
    return l.length && { id: `kart-${k}`, baslik: ad, alt: `${uzunTarih(d.acilis)} – ${uzunTarih(d.kapanis)} dönemi kapanışı ile bugün`,
      sayim: artiEksi(l, 'yüksek', 'düşük'), seri: seriYap(l), dipnot: BES };
  };
  const pay = satisT + alisT ? satisT / (satisT + alisT) : 0;
  const ortaTaraf = taraf.length ? [...taraf].map((x) => x.y).sort((a, b) => a - b)[Math.floor(taraf.length / 2)] : null;
  const tutarlar = S.map((s) => ({ s, y: (s.satis?.tutar ?? 0) + (s.alis?.tutar ?? 0) })).filter((x) => x.y > 0);

  const ozet = {
    id: 'kart-ozet', baslik: 'Yayındaki pay ilanları', alt: 'İlan dönemi ve günün toplamları',
    sayim: [{ t: sayi(ilanli.length), sayi: true }, { t: ' pay grubunda ' }, { t: sayi(satisN), sayi: true, renk: 'a' }, { t: ' satış, ' }, { t: sayi(alisN), sayi: true, renk: 'e' }, { t: ' alış ilanı' }],
    bilgiler: [
      acik ? { ad: 'İlan dönemi', deger: `${aralik(acik)} · açık` } : { ad: 'İlan dönemi', deger: 'şu an kapalı' },
      acik
        ? { ad: 'Kapanışa', deger: kalan > 0 ? `${kalan} gün` : 'bugün kapanıyor' }
        : sonraki ? { ad: 'Sonraki dönem', deger: aralik(sonraki) } : son ? { ad: 'Son dönem', deger: aralik(son) } : null,
      // ilan dönemi her pay grubuna uymaz: ilanları her gün açık olan gruplar ayrıca yazılır
      surekli ? { ad: 'Her gün açık ilan', deger: `${sayi(surekli)} pay grubu` } : null,
      { ad: 'Satış ilanlarının toplam tutarı', deger: mn(satisT) },
      { ad: 'Alış ilanlarının toplam tutarı', deger: mn(alisT) },
      yeni != null ? { ad: 'Bugün yayına giren ilan', deger: sayi(yeni) } : null,
      dag.length ? { ad: 'Dağıtım fiyatının üstünde', deger: `${say(dag, (v) => v > 0)} / ${dag.length} pay grubu` } : null,
      kap.length && kk.donem ? { ad: 'Geçen kapanıştan yüksek', deger: `${kk.yukselen.length} / ${kap.length + kk.ayni} pay grubu` } : null,
    ].filter(Boolean),
  };

  const kartlar = [
    ilanli.length && ozet,
    dag.length && { id: 'kart-dagitim', baslik: 'Dağıtım fiyatına göre', alt: 'En düşük satış ilanının dağıtım fiyatına göre farkı',
      sayim: artiEksi(dag), seri: seriYap(dag), dipnot: BES },
    ito.length && { id: 'kart-ito', baslik: 'İTO enflasyonuna göre', alt: 'En düşük satış ilanının, İTO enflasyonu eklenmiş dağıtım fiyatına göre farkı',
      sayim: artiEksi(ito), seri: seriYap(ito), dipnot: BES },
    usd.length && { id: 'kart-doviz', baslik: 'Dövize ve altına göre', alt: 'Dağıtımın üstündeki pay grubu sayısı; karolar dolar cinsinden',
      sayim: [{ t: 'Dolarda ' }, { t: ustSay(usd), sayi: true, renk: 'a' }, { t: ', avroda ' }, { t: ustSay(eur), sayi: true, renk: 'a' }, { t: ', altında ' }, { t: ustSay(xau), sayi: true, renk: 'a' }, { t: ` / ${usd.length}` }],
      seri: seriYap(usd), dipnot: 'Avro ve altın cinsinden sıralama kifobu.com/sekundery sayfasında.' },
    kap.length && kk.donem && { id: 'kart-kapanis', baslik: 'Geçen kapanışa göre', alt: `${uzunTarih(kk.donem.acilis)} – ${uzunTarih(kk.donem.kapanis)} dönemi kapanışı ile bugün`,
      sayim: [{ t: String(kk.yukselen.length), sayi: true, renk: 'a' }, { t: ' yüksek, ' }, { t: String(kk.dusen.length), sayi: true, renk: 'e' }, { t: ` düşük, ${kk.ayni} değişmeyen` }],
      seri: seriYap(kap), dipnot: BES },
    geriKart('ay1', 'Bir ay önceye göre'),
    geriKart('ay3', 'Üç ay önceye göre'),
    geriKart('yil', 'Bir yıl önceye göre'),
    taraf.length && { id: 'kart-taraf', baslik: 'Satış ve alış ilanı farkı', alt: 'En düşük satış ile en yüksek alış ilanı arasındaki fark',
      sayim: [{ t: String(taraf.length), sayi: true }, { t: ' pay grubunda medyan fark ' }, { t: yz2(ortaTaraf), sayi: true }],
      seri: seriYap(taraf, yz2), tekYon: true, dipnot: 'Sıra farkı en genişten en dara. ' + BES },
    tutarlar.length && { id: 'kart-tutar', baslik: 'Bütün ilanlarda satış ve alış', alt: 'Yayındaki ilanların toplam tutarı, pay grubuna göre',
      sayim: [{ t: sayi(satisN), sayi: true, renk: 'a' }, { t: ' satış, ' }, { t: sayi(alisN), sayi: true, renk: 'e' }, { t: ' alış ilanı' }],
      cubuk: { sol: `Satış ${yz1(pay)} · ${mn(satisT)}`, sag: `Alış ${yz1(1 - pay)} · ${mn(alisT)}`, oran: pay },
      seri: seriYap(tutarlar, mn), tekYon: true, dipnot: BES },
  ].filter(Boolean);

  return { tarih: uzunTarih(bugun), gun: bugun, kartlar };
}
