/**
 * Günlük kitle fonlama bülteni verisi ("Bugün" tablosu).
 * Otomatik Bot tarafından oluşturulmuştur.
 * Son güncelleme: 2026-11-26T15:02:46.228Z
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
  tarih: '26 Kasım 2026',
  sayi: 1570,
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
        "bugun": 1000,
        "alinan": 1243150,
        "kalan": 3756850,
        "degerleme": 50000000,
        "yuzde": 24.86,
        "durum": "son 49 gün",
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
    },
    {
        "ad": "GOVITO",
        "platform": "trinkfon",
        "bugun": 0,
        "alinan": 0,
        "kalan": 2500000,
        "degerleme": 71389000,
        "yuzde": 0,
        "durum": "Aktif",
        "url": "https://kfs.trinkfon.com/projeler/govito-tek-tikla-guvenilir-vip-transfer/kampanya/"
    },
    {
        "ad": "GOVITO",
        "platform": "trinkfon",
        "bugun": 0,
        "alinan": 3500,
        "kalan": 2496500,
        "degerleme": 71389000,
        "yuzde": 0.14,
        "durum": "son 60 gün",
        "url": "https://kfs.trinkfon.com/projeler/govito-guvenilir-vip-transfer/kampanya/"
    }
] as Girisim[],
  platformlar: {
    bugun: 1000,
    toplam: 13985050,
    liste: [
    {
        "ad": "fonangels",
        "toplam": 13981550,
        "girisim": 3,
        "renk": "#f47b3d",
        "url": "https://fonangels.com"
    },
    {
        "ad": "trinkfon",
        "toplam": 3500,
        "girisim": 2,
        "renk": "#7c3aed",
        "url": "https://kfs.trinkfon.com"
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
        "onTalep": 4056500,
        "onTalepKisi": 125,
        "renk": "#4f46e5"
    }
] as Yakinda[],
  mkk: {
    "platform": 18,
    "sirket": 180,
    "yatirimci": 47236,
    "fon": "₺1,61 Milyar"
},
};
