/**
 * Günlük kitle fonlama bülteni verisi ("Bugün" tablosu).
 * Otomatik Bot tarafından oluşturulmuştur.
 * Son güncelleme: 2026-10-27T13:01:24.371Z
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
  tarih: '27 Ekim 2026',
  sayi: 1540,
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
        "bugun": 1000,
        "alinan": 3878790,
        "kalan": 1121210,
        "degerleme": 50000000,
        "yuzde": 77.57,
        "durum": "son 9 gün",
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
        "alinan": 586600,
        "kalan": 34413400,
        "degerleme": 385038504,
        "yuzde": 1.67,
        "durum": "son 19 gün",
        "url": "https://ecofolio.com.tr/kampanyalar/loopyon"
    }
] as Girisim[],
  platformlar: {
    bugun: 1000,
    toplam: 12189672,
    liste: [
    {
        "ad": "fonangels",
        "toplam": 11481290,
        "girisim": 2,
        "renk": "#f47b3d",
        "url": "https://fonangels.com"
    },
    {
        "ad": "ecofolio",
        "toplam": 586600,
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
    "yatirimci": 47167,
    "fon": "₺1,60 Milyar"
},
};
