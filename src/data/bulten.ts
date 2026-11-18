/**
 * Günlük kitle fonlama bülteni verisi ("Bugün" tablosu).
 * Otomatik Bot tarafından oluşturulmuştur.
 * Son güncelleme: 2026-11-18T09:01:16.047Z
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
  tarih: '18 Kasım 2026',
  sayi: 1562,
  girisimler: [
    {
        "ad": "LOOPYON",
        "platform": "ecofolio",
        "bugun": 0,
        "alinan": 1279600,
        "kalan": 33720400,
        "degerleme": 385000000,
        "yuzde": 3.65,
        "durum": "SONA ERDİ",
        "url": "https://ecofolio.com.tr/kampanyalar/loopyon"
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
    },
    {
        "ad": "VISITEXTRA",
        "platform": "fonangels",
        "bugun": 0,
        "alinan": 1021100,
        "kalan": 3978900,
        "degerleme": 50000000,
        "yuzde": 20.42,
        "durum": "son 57 gün",
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
    }
] as Girisim[],
  platformlar: {
    bugun: 0,
    toplam: 15039100,
    liste: [
    {
        "ad": "fonangels",
        "toplam": 13759500,
        "girisim": 3,
        "renk": "#f47b3d",
        "url": "https://fonangels.com"
    },
    {
        "ad": "ecofolio",
        "toplam": 1279600,
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
        "onTalep": 3466500,
        "onTalepKisi": 112,
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
