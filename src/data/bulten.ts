/**
 * Günlük kitle fonlama bülteni verisi ("Bugün" tablosu).
 * Otomatik Bot tarafından oluşturulmuştur.
 * Son güncelleme: 2026-11-04T11:01:12.118Z
 */
export interface Girisim {
  ad: string;
  platform: string;
  bugun: number;
  alinan: number;
  /** Kalan tutar; fonlandıysa null */
  kalan: number | null;
  degerleme: number;
  yuzde: number;
  /** "SONA ERDİ", "son 26 gün", "SON GÜN", "ÖN TALEP" ... */
  durum: string;
  url?: string;
}

export interface Platform {
  ad: string;
  toplam: number;
  girisim: number;
  renk: string;
  url?: string;
}

export interface Yakinda {
  ad: string;
  platform: string;
  url?: string;
}

export const BULTEN = {
  tarih: '4 Kasım 2026',
  sayi: 1548,
  girisimler: [
    {
        "ad": "ATHLETICLABS",
        "platform": "fonangels",
        "bugun": 0,
        "alinan": 7602500,
        "kalan": null,
        "degerleme": 75000000,
        "yuzde": 101.36,
        "durum": "SONA ERDİ",
        "url": "https://fonangels.com/kampanyalar/projehakkinda/athleticlabs?pid=1689"
    },
    {
        "ad": "OYLİO",
        "platform": "fonangels",
        "bugun": 132310,
        "alinan": 4648150,
        "kalan": 351850,
        "degerleme": 50000000,
        "yuzde": 92.96,
        "durum": "son 1 gün",
        "url": "https://fonangels.com/kampanyalar/projehakkinda/oylio?pid=1778"
    },
    {
        "ad": "PUPAQ",
        "platform": "trinkfon",
        "bugun": 0,
        "alinan": 121782,
        "kalan": 878250,
        "degerleme": 25000800,
        "yuzde": 12.17,
        "durum": "Aktif",
        "url": "https://kfs.trinkfon.com/projeler/pupaq/kampanya/"
    },
    {
        "ad": "LOOPYON",
        "platform": "ecofolio",
        "bugun": 0,
        "alinan": 788200,
        "kalan": 34211800,
        "degerleme": 385038504,
        "yuzde": 2.25,
        "durum": "son 11 gün",
        "url": "https://ecofolio.com.tr/kampanyalar/loopyon"
    }
] as Girisim[],
  platformlar: {
    bugun: 132310,
    toplam: 13160632,
    liste: [
    {
        "ad": "fonangels",
        "toplam": 12250650,
        "girisim": 2,
        "renk": "#f47b3d",
        "url": "https://fonangels.com"
    },
    {
        "ad": "ecofolio",
        "toplam": 788200,
        "girisim": 1,
        "renk": "#009bae",
        "url": "https://ecofolio.com.tr"
    },
    {
        "ad": "trinkfon",
        "toplam": 121782,
        "girisim": 1,
        "renk": "#7c3aed",
        "url": "https://kfs.trinkfon.com"
    }
] as Platform[],
  },
  yakinda: [
    {
        "ad": "NARPOS",
        "platform": "ardventure",
        "url": "https://ardventure.com"
    },
    {
        "ad": "NEURATURK",
        "platform": "ardventure",
        "url": "https://ardventure.com"
    }
] as Yakinda[],
  mkk: {
    "platform": 18,
    "sirket": 179,
    "yatirimci": 47165,
    "fon": "₺1,60 Milyar"
},
};
