/**
 * Günlük kitle fonlama bülteni verisi ("Bugün" tablosu).
 * Otomatik Bot tarafından oluşturulmuştur.
 * Son güncelleme: 2026-11-20T07:01:58.020Z
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
  /** Ön talepte rakamı bilinen kampanyalar için (görselde şerit olarak çizilir). */
  hedef?: number;
  degerleme?: number;
  onTalep?: number;
  onTalepKisi?: number;
  /** Platform rengi. */
  renk?: string;
}

export const BULTEN = {
  tarih: '20 Kasım 2026',
  sayi: 1564,
  girisimler: [
    {
        "ad": "LOOPYON",
        "platform": "ecofolio",
        "bugun": 0,
        "alinan": 0,
        "kalan": 35000000,
        "degerleme": 385000000,
        "yuzde": 0,
        "durum": "SONA ERDİ",
        "url": "https://ecofolio.com.tr/kampanyalar/loopyon"
    },
    {
        "ad": "VISITEXTRA",
        "platform": "fonangels",
        "bugun": 8100,
        "alinan": 1077500,
        "kalan": 3922500,
        "degerleme": 50000000,
        "yuzde": 21.55,
        "durum": "son 55 gün",
        "url": "https://fonangels.com/kampanyalar/projehakkinda/visitextra?pid=1803"
    },
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
        "bugun": 0,
        "alinan": 5135900,
        "kalan": null,
        "degerleme": 50000000,
        "yuzde": 102.71,
        "durum": "SONA ERDİ",
        "url": "https://fonangels.com/kampanyalar/projehakkinda/oylio?pid=1778"
    }
] as Girisim[],
  platformlar: {
    bugun: 8100,
    toplam: 13815900,
    liste: [
    {
        "ad": "fonangels",
        "toplam": 13815900,
        "girisim": 3,
        "renk": "#f47b3d",
        "url": "https://fonangels.com"
    },
    {
        "ad": "ecofolio",
        "toplam": 0,
        "girisim": 1,
        "renk": "#009bae",
        "url": "https://ecofolio.com.tr"
    }
] as Platform[],
  },
  yakinda: [
    {
        "ad": "NARPOS",
        "platform": "ardventure",
        "url": "https://ardventure.com",
        "renk": "#e07a5f"
    },
    {
        "ad": "NEURATURK",
        "platform": "ardventure",
        "url": "https://ardventure.com",
        "renk": "#e07a5f"
    },
    {
        "ad": "NEUROX",
        "platform": "fonangels",
        "url": "https://fonangels.com/kampanyalar#yakinda-neurox",
        "renk": "#f47b3d"
    },
    {
        "ad": "TWINUP",
        "platform": "fonbulucu",
        "url": "https://invest.fonbulucu.com/#yakinda-dijital-ikiz-platformu",
        "renk": "#e5243e"
    },
    {
        "ad": "DEXCOOK",
        "platform": "fonbulucu",
        "url": "https://invest.fonbulucu.com/#yakinda-akilli-yuzeyler",
        "renk": "#e5243e"
    },
    {
        "ad": "MEDICALTEX",
        "platform": "fonbulucu",
        "url": "https://invest.fonbulucu.com/#yakinda-giyilebilir-saglik",
        "renk": "#e5243e"
    },
    {
        "ad": "QUAD ROBOTICS",
        "platform": "fonventure",
        "url": "https://fonventure.com/kampanya/9eade97b-9d7a-4962-bf2a-c49f9a312ee5",
        "hedef": 25000000,
        "degerleme": 192307692,
        "onTalep": 3816500,
        "onTalepKisi": 118,
        "renk": "#4f46e5"
    }
] as Yakinda[],
  mkk: {
    "platform": 18,
    "sirket": 180,
    "yatirimci": 47235,
    "fon": "₺1,61 Milyar"
},
};
