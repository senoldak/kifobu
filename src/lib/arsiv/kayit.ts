import type { ArsivGirisim, ArsivKaydi, ArsivPlatform } from './tipler.ts';

export interface TaramaSonucu {
  ad: string;
  platform: string;
  url?: string;
  toplanan: number;
  durum: string;
  hata: boolean;
  hedef: number;
  degerleme: number;
  tamamlandi?: boolean;
}

const GUN_MS = 24 * 60 * 60 * 1000;

const yuzdeYuvarla = (x: number) => Math.round(x * 100) / 100;

/** İki tarih (YYYY-MM-DD) arasındaki, uçlar hariç gün sayısı (kapanış haftanın her günü). */
export function atlananGun(oncekiTarih: string, tarih: string): number {
  const bas = Date.parse(`${oncekiTarih}T00:00:00Z`);
  const son = Date.parse(`${tarih}T00:00:00Z`);
  return Math.max(0, Math.round((son - bas) / GUN_MS) - 1);
}

export function arsivKaydiOlustur(g: {
  tarih: string;
  sayi: number;
  taramalar: TaramaSonucu[];
  referans: Record<string, number>;
  oncekiKayit: ArsivKaydi | null;
  platformAyarlari: Record<string, { ad: string; renk: string }>;
}): ArsivKaydi {
  const { tarih, sayi, taramalar, referans, oncekiKayit, platformAyarlari } = g;
  const baslangic = oncekiKayit === null;
  const atlanan = oncekiKayit ? atlananGun(oncekiKayit.tarih, tarih) : 0;

  const girisimler: ArsivGirisim[] = taramalar.map((t) => {
    // Taban: önceki arşiv kaydındaki son bilinen doğru toplam. Botun referansı sessiz sıfır,
    // düşüş veya aynı gün yeniden çalıştırmada bozulabilir; yalnızca kayıtta yoksa ona düşülür.
    const oncekiGirisim = oncekiKayit?.girisimler.find((o) => o.ad === t.ad);
    const ref = oncekiGirisim ? oncekiGirisim.alinan : referans[t.ad];
    const veriAlinamadi =
      t.hata || (ref > 0 && t.toplanan === 0) || (ref !== undefined && t.toplanan < ref);
    const alinan = veriAlinamadi ? (ref ?? t.toplanan) : t.toplanan;
    const bugun = veriAlinamadi || baslangic || ref === undefined ? null : t.toplanan - ref;
    const oncekiHatali = oncekiGirisim?.veriAlinamadi ?? false;
    const birikmis = !veriAlinamadi && bugun !== null && (oncekiHatali || atlanan > 0);
    const kalan = t.tamamlandi || t.hedef <= 0 || alinan >= t.hedef ? null : t.hedef - alinan;

    return {
      ad: t.ad,
      platform: t.platform,
      ...(t.url !== undefined && { url: t.url }),
      bugun,
      alinan,
      kalan,
      hedef: t.hedef,
      degerleme: t.degerleme,
      yuzde: t.hedef > 0 ? yuzdeYuvarla((alinan / t.hedef) * 100) : 0,
      durum: t.durum,
      veriAlinamadi,
      birikmis,
    };
  });

  const gruplar = new Map<string, ArsivPlatform>();
  for (const gi of girisimler) {
    let p = gruplar.get(gi.platform);
    if (!p) {
      const ayar = platformAyarlari[gi.platform] ?? { ad: gi.platform, renk: '#888888' };
      p = { anahtar: gi.platform, ad: ayar.ad, renk: ayar.renk, bugun: 0, toplam: 0 };
      gruplar.set(gi.platform, p);
    }
    if (gi.bugun !== null) p.bugun += gi.bugun;
    p.toplam += gi.alinan;
  }

  return { tarih, sayi, baslangic, girisimler, platformlar: [...gruplar.values()] };
}
