// Kifobu Grafik Kataloğu: 62 Kitle Fonlama ve Girişim Sermayesi Bileşeni
// BRAND.md uyumlu: Schibsted Grotesk, Ayçiçeği sarısı (#e8b40c) tek marka rengi,
// Fonlandı yeşili (#10b981), Aşım yeşili (#a7e9cf), Mürekkep (#141a17). Mavi ve kırmızı yok.

export type GrafikTuru =
  | 'alan'
  | 'sutun'
  | 'yigilmis-sutun'
  | 'ayrisan-cubuk'
  | 'aralik-bant'
  | 'halka-pay'
  | 'radyal-hedef'
  | 'coklu-karma'
  | 'nokta-dagilim'
  | 'siralama-cubuk'
  | 'akis-selale';

export interface Nokta { etiket: string; deger: number; }
export interface Dilim { ad: string; oran: number; renk: 'yesil' | 'asimyasil' | 'murekkep' | 'gri' | 'komur'; }
export interface AralikNoktasi { etiket: string; min: number; max: number; mevcut: number; }
export interface YigilmisGrup { etiket: string; varlik: number; yukumluluk: number; }
export interface CokluNokta { etiket: string; cubuk: number; cizgi: number; }
export interface SiralamaOgesi { etiket: string; deger: number; }
export interface AkisAdimi { ad: string; deger: number; tur: 'artis' | 'azalis' | 'net'; }
export interface ScatterNokta { x: number; y: number; }

export interface KifobuGrafikTanimi {
  id: string;
  tur: GrafikTuru;
  kategori: 'PAYA DAYALI FONLAMA' | 'BORCA DAYALI FONLAMA' | 'GİRİŞİM EKOSİSTEMİ' | 'YATIRIMCI DAĞILIMI' | 'GSYO & SERMAYE' | 'PLATFORM VERİLERİ';
  baslik: string;
  aciklama: string;
  metrik: string;
  degisim: number;
  degisimEtiket: string;
  tarih: string;
  kaynak: string;
  mebiusTitle: string;
  exportName: string;
  mebiusFile: string;
  previewImage: string;
  tohumMiktar?: number;
  tohumBirim?: string;
  seri?: Nokta[];
  dilimler?: Dilim[];
  araliklar?: AralikNoktasi[];
  gruplar?: YigilmisGrup[];
  seriler?: CokluNokta[];
  ogeler?: SiralamaOgesi[];
  adimlari?: AkisAdimi[];
  noktalar?: ScatterNokta[];
  oran?: number;
  hedef?: number;
}

export const KİFOBU_GRAFİKLER: KifobuGrafikTanimi[] = [
  {
    "id": "charts-total-value",
    "tur": "alan",
    "kategori": "PAYA DAYALI FONLAMA",
    "baslik": "Toplam Fonlanan Girişim Sermayesi",
    "aciklama": "Platformlar genelinde başarıyla tamamlanan kitle fonlama kampanyalarının kümülatif tutarı.",
    "metrik": "₺548.200.000",
    "degisim": 4.8,
    "degisimEtiket": "geçen aya göre",
    "tarih": "30 Ekim 2026",
    "boncukMiktar": 7,
    "boncukBirim": "₺200.000",
    "kaynak": "MKK Kitle Fonlaması Veri Tabanı",
    "seri": [
      {
        "etiket": "Kas",
        "deger": 1120
      },
      {
        "etiket": "Ara",
        "deger": 1160
      },
      {
        "etiket": "Oca",
        "deger": 1195
      },
      {
        "etiket": "Şub",
        "deger": 1210
      },
      {
        "etiket": "Mar",
        "deger": 1260
      },
      {
        "etiket": "Nis",
        "deger": 1290
      },
      {
        "etiket": "May",
        "deger": 1315
      },
      {
        "etiket": "Haz",
        "deger": 1340
      },
      {
        "etiket": "Tem",
        "deger": 1360
      },
      {
        "etiket": "Ağu",
        "deger": 1390
      },
      {
        "etiket": "Eyl",
        "deger": 1410
      },
      {
        "etiket": "Eki",
        "deger": 1428
      }
    ],
    "mebiusTitle": "Total Value Chart",
    "exportName": "TotalValueChart",
    "mebiusFile": "total-value-chart.tsx",
    "previewImage": "/kits/charts/previews/charts-total-value.webp",
    "tohumMiktar": 1,
    "tohumBirim": "150 bin TL tohum yatırımı"
  },
  {
    "id": "charts-total-expenses",
    "tur": "halka-pay",
    "kategori": "BORCA DAYALI FONLAMA",
    "baslik": "Girişimlerin Fon Kullanım Dağılımı",
    "aciklama": "Fonlanan girişimlerin sermayeyi AR-GE, pazarlama, istihdam ve üretim yatırımlarına dağılımı.",
    "metrik": "₺34.800.000",
    "degisim": -2.1,
    "degisimEtiket": "geçen aya göre",
    "tarih": "Ekim 2026",
    "boncukMiktar": 5,
    "boncukBirim": "₺10.000",
    "kaynak": "Girişimci Faaliyet Raporları",
    "dilimler": [
      {
        "ad": "Konut & Kira",
        "oran": 35,
        "renk": "yesil"
      },
      {
        "ad": "Gıda & İçecek",
        "oran": 25,
        "renk": "asimyasil"
      },
      {
        "ad": "Ulaştırma",
        "oran": 18,
        "renk": "murekkep"
      },
      {
        "ad": "Faturalar",
        "oran": 12,
        "renk": "gri"
      },
      {
        "ad": "Diğer",
        "oran": 10,
        "renk": "komur"
      }
    ],
    "mebiusTitle": "Total Expenses Chart",
    "exportName": "TotalExpensesChart",
    "mebiusFile": "total-expenses-chart.tsx",
    "previewImage": "/kits/charts/previews/charts-total-expenses.webp",
    "tohumMiktar": 2,
    "tohumBirim": "300 bin TL tohum yatırımı"
  },
  {
    "id": "charts-cash-flow-area",
    "tur": "alan",
    "kategori": "GİRİŞİM EKOSİSTEMİ",
    "baslik": "Aylık Net Yatırımcı Sermaye Akışı",
    "aciklama": "Kitle fonlama sistemine aylık bazda giren bireysel ve nitelikli yatırımcı tutarları.",
    "metrik": "₺52.400.000",
    "degisim": 8.4,
    "degisimEtiket": "geçen çeyreğe göre",
    "tarih": "3. Çeyrek 2026",
    "boncukMiktar": 6,
    "boncukBirim": "₺40.000",
    "kaynak": "MKK Saklama Verileri",
    "seri": [
      {
        "etiket": "1. Hafta",
        "deger": 180
      },
      {
        "etiket": "2. Hafta",
        "deger": 195
      },
      {
        "etiket": "3. Hafta",
        "deger": 210
      },
      {
        "etiket": "4. Hafta",
        "deger": 240
      }
    ],
    "mebiusTitle": "Cash Flow Area Chart",
    "exportName": "CashFlowAreaChart",
    "mebiusFile": "cash-flow-area-chart.tsx",
    "previewImage": "/kits/charts/previews/charts-cash-flow-area.webp",
    "tohumMiktar": 3,
    "tohumBirim": "450 bin TL tohum yatırımı"
  },
  {
    "id": "charts-overview",
    "tur": "coklu-karma",
    "kategori": "YATIRIMCI DAĞILIMI",
    "baslik": "Kampanya Sayısı ve Yatırımcı Hacmi",
    "aciklama": "Aylık açılan fonlama kampanyaları ve katılan tekil yatırımcı sayısı.",
    "metrik": "4.850 Yatırımcı",
    "degisim": 1.2,
    "degisimEtiket": "günlük kapanış",
    "tarih": "30 Ekim 2026",
    "boncukMiktar": 8,
    "boncukBirim": "1.500 puan",
    "kaynak": "Platform Konsorsiyum Raporu",
    "seriler": [
      {
        "etiket": "Pzt",
        "cubuk": 85,
        "cizgi": 10650
      },
      {
        "etiket": "Sal",
        "cubuk": 92,
        "cizgi": 10720
      },
      {
        "etiket": "Çar",
        "cubuk": 78,
        "cizgi": 10690
      },
      {
        "etiket": "Per",
        "cubuk": 105,
        "cizgi": 10810
      },
      {
        "etiket": "Cum",
        "cubuk": 118,
        "cizgi": 10840
      }
    ],
    "mebiusTitle": "Overview Chart",
    "exportName": "OverviewChart",
    "mebiusFile": "overview-chart.tsx",
    "previewImage": "/kits/charts/previews/charts-overview.webp",
    "tohumMiktar": 4,
    "tohumBirim": "600 bin TL tohum yatırımı"
  },
  {
    "id": "charts-price-range",
    "tur": "aralik-bant",
    "kategori": "GSYO & SERMAYE",
    "baslik": "Girişim Değerleme Aralıkları",
    "aciklama": "Sektörlere göre tohum aşaması kitle fonlama değerleme alt ve üst bantları.",
    "metrik": "₺38.000.000",
    "degisim": 3.5,
    "degisimEtiket": "günlük ortalama",
    "tarih": "30 Ekim 2026",
    "boncukMiktar": 6,
    "boncukBirim": "₺10 aralık",
    "kaynak": "SPK Onaylı Bilgi Formları",
    "araliklar": [
      {
        "etiket": "THYAO",
        "min": 280,
        "max": 298,
        "mevcut": 294
      },
      {
        "etiket": "TUPRS",
        "min": 165,
        "max": 178,
        "mevcut": 174
      },
      {
        "etiket": "AKBNK",
        "min": 58,
        "max": 64,
        "mevcut": 62.5
      },
      {
        "etiket": "KCHOL",
        "min": 210,
        "max": 226,
        "mevcut": 222
      },
      {
        "etiket": "BIMAS",
        "min": 490,
        "max": 515,
        "mevcut": 508
      }
    ],
    "mebiusTitle": "Price Range Chart",
    "exportName": "PriceRangeChart",
    "mebiusFile": "price-range-chart.tsx",
    "previewImage": "/kits/charts/previews/charts-price-range.webp",
    "tohumMiktar": 5,
    "tohumBirim": "750 bin TL tohum yatırımı"
  },
  {
    "id": "charts-balance",
    "tur": "alan",
    "kategori": "PLATFORM VERİLERİ",
    "baslik": "GSYO Kitle Fonlama Portföyü",
    "aciklama": "Girişim sermayesi yatırım ortaklıklarının kitle fonlama kampanyalarına aktardığı sermaye.",
    "metrik": "₺1.420.000.000",
    "degisim": 5.2,
    "degisimEtiket": "aylık artış",
    "tarih": "Ekim 2026",
    "boncukMiktar": 7,
    "boncukBirim": "₺1.500 Mr",
    "kaynak": "MKK Veri Analiz Platformu",
    "seri": [
      {
        "etiket": "Haz",
        "deger": 8500
      },
      {
        "etiket": "Tem",
        "deger": 8750
      },
      {
        "etiket": "Ağu",
        "deger": 9000
      },
      {
        "etiket": "Eyl",
        "deger": 9250
      },
      {
        "etiket": "Eki",
        "deger": 9420
      }
    ],
    "mebiusTitle": "Balance Chart",
    "exportName": "BalanceChart",
    "mebiusFile": "balance-chart.tsx",
    "previewImage": "/kits/charts/previews/charts-balance.webp",
    "tohumMiktar": 6,
    "tohumBirim": "900 bin TL tohum yatırımı"
  },
  {
    "id": "charts-total-sales",
    "tur": "sutun",
    "kategori": "PAYA DAYALI FONLAMA",
    "baslik": "Çeyreklik Fonlama Başarısı",
    "aciklama": "Çeyrekler itibarıyla başarıyla hedefine ulaşan girişim fonlama toplamları.",
    "metrik": "₺168.000.000",
    "degisim": 14.2,
    "degisimEtiket": "yıllık değişim",
    "tarih": "3. Çeyrek 2026",
    "boncukMiktar": 6,
    "boncukBirim": "₺300 Mr",
    "kaynak": "Kifobu Ekosistem Raporları",
    "seri": [
      {
        "etiket": "2025/3Ç",
        "deger": 1420
      },
      {
        "etiket": "2025/4Ç",
        "deger": 1580
      },
      {
        "etiket": "2026/1Ç",
        "deger": 1640
      },
      {
        "etiket": "2026/2Ç",
        "deger": 1720
      },
      {
        "etiket": "2026/3Ç",
        "deger": 1850
      }
    ],
    "mebiusTitle": "Total Sales Chart",
    "exportName": "TotalSalesChart",
    "mebiusFile": "total-sales-chart.tsx",
    "previewImage": "/kits/charts/previews/charts-total-sales.webp",
    "tohumMiktar": 7,
    "tohumBirim": "1.050 bin TL tohum yatırımı"
  },
  {
    "id": "charts-customer-rate",
    "tur": "nokta-dagilim",
    "kategori": "BORCA DAYALI FONLAMA",
    "baslik": "Nitelikli Yatırımcı Katılım Dağılımı",
    "aciklama": "Kampanyalardaki nitelikli yatırımcı payı ile kampanya tamamlama hızı ilişkisi.",
    "metrik": "%44,2 Nitelikli Payı",
    "degisim": 3.1,
    "degisimEtiket": "yıllık artış",
    "tarih": "Ekim 2026",
    "boncukMiktar": 3,
    "boncukBirim": "%10 pay",
    "kaynak": "MKK Sicil Kayıtları",
    "noktalar": [
      {
        "x": 10,
        "y": 25
      },
      {
        "x": 20,
        "y": 45
      },
      {
        "x": 30,
        "y": 60
      },
      {
        "x": 40,
        "y": 55
      },
      {
        "x": 50,
        "y": 80
      },
      {
        "x": 60,
        "y": 72
      },
      {
        "x": 70,
        "y": 90
      },
      {
        "x": 80,
        "y": 85
      },
      {
        "x": 90,
        "y": 95
      }
    ],
    "mebiusTitle": "Customer Rate Chart",
    "exportName": "CustomerRateChart",
    "mebiusFile": "customer-rate-chart.tsx",
    "previewImage": "/kits/charts/previews/charts-customer-rate.webp",
    "tohumMiktar": 8,
    "tohumBirim": "1.200 bin TL tohum yatırımı"
  },
  {
    "id": "charts-cumulative-assets-and-liabilities",
    "tur": "yigilmis-sutun",
    "kategori": "GİRİŞİM EKOSİSTEMİ",
    "baslik": "Borca Dayalı Fonlama: Anapara ve Faiz İtfaları",
    "aciklama": "Kullandırılan borç finansmanı ve düzenli geri ödeme performansı.",
    "metrik": "₺84.500.000",
    "degisim": -0.8,
    "degisimEtiket": "net fark",
    "tarih": "Ekim 2026",
    "boncukMiktar": 8,
    "boncukBirim": "₺4.000 Mr",
    "kaynak": "SPK Borç Fonlaması İstatistikleri",
    "gruplar": [
      {
        "etiket": "2023",
        "varlik": 22000,
        "yukumluluk": 21000
      },
      {
        "etiket": "2024",
        "varlik": 26000,
        "yukumluluk": 24800
      },
      {
        "etiket": "2025",
        "varlik": 29500,
        "yukumluluk": 28200
      },
      {
        "etiket": "2026",
        "varlik": 31250,
        "yukumluluk": 29800
      }
    ],
    "mebiusTitle": "Cumulative Assets and Liabilities Chart",
    "exportName": "CumulativeAssetsAndLiabilitiesChart",
    "mebiusFile": "cumulative-assets-and-liabilities-chart.tsx",
    "previewImage": "/kits/charts/previews/charts-cumulative-assets-and-liabilities.webp",
    "tohumMiktar": 9,
    "tohumBirim": "1.350 bin TL tohum yatırımı"
  },
  {
    "id": "charts-cash-flow-monthly-bar",
    "tur": "sutun",
    "kategori": "YATIRIMCI DAĞILIMI",
    "baslik": "Aylık Taze Sermaye Girişi",
    "aciklama": "Kitle fonlama havuzuna yatırımcılar tarafından aktarılan aylık nakit tutarı.",
    "metrik": "₺41.600.000",
    "degisim": 12,
    "degisimEtiket": "geçen aya göre",
    "tarih": "Ekim 2026",
    "boncukMiktar": 7,
    "boncukBirim": "₺10.000",
    "kaynak": "Takasbank Kitle Fonlama Havuzu",
    "seri": [
      {
        "etiket": "Haz",
        "deger": 48000
      },
      {
        "etiket": "Tem",
        "deger": 52000
      },
      {
        "etiket": "Ağu",
        "deger": 51500
      },
      {
        "etiket": "Eyl",
        "deger": 58400
      },
      {
        "etiket": "Eki",
        "deger": 65400
      }
    ],
    "mebiusTitle": "Cash Flow Monthly Bar Chart",
    "exportName": "CashFlowMonthlyBarChart",
    "mebiusFile": "cash-flow-monthly-bar-chart.tsx",
    "previewImage": "/kits/charts/previews/charts-cash-flow-monthly-bar.webp",
    "tohumMiktar": 10,
    "tohumBirim": "1.500 bin TL tohum yatırımı"
  },
  {
    "id": "charts-cash-balance",
    "tur": "alan",
    "kategori": "GSYO & SERMAYE",
    "baslik": "Platform Emanet Hesap Bakiyesi",
    "aciklama": "Kampanya sürecinde Takasbank emanet hesaplarında toplanan nakit meblağ.",
    "metrik": "₺92.400.000",
    "degisim": 2.8,
    "degisimEtiket": "haftalık",
    "tarih": "30 Ekim 2026",
    "boncukMiktar": 6,
    "boncukBirim": "₺30 Mr",
    "kaynak": "Takasbank Saklama",
    "seri": [
      {
        "etiket": "Pzt",
        "deger": 162
      },
      {
        "etiket": "Sal",
        "deger": 170
      },
      {
        "etiket": "Çar",
        "deger": 175
      },
      {
        "etiket": "Per",
        "deger": 180
      },
      {
        "etiket": "Cum",
        "deger": 185
      }
    ],
    "mebiusTitle": "Cash Balance Chart",
    "exportName": "CashBalanceChart",
    "mebiusFile": "cash-balance-chart.tsx",
    "previewImage": "/kits/charts/previews/charts-cash-balance.webp",
    "tohumMiktar": 1,
    "tohumBirim": "150 bin TL tohum yatırımı"
  },
  {
    "id": "charts-net-worth",
    "tur": "alan",
    "kategori": "PLATFORM VERİLERİ",
    "baslik": "Ekosistem Kümülatif Piyasa Değeri",
    "aciklama": "Fonlanan 180+ girişimin son değerlemelerine göre toplam piyasa değeri.",
    "metrik": "₺4.850.000.000",
    "degisim": 18.5,
    "degisimEtiket": "yıllık net artış",
    "tarih": "2026",
    "boncukMiktar": 9,
    "boncukBirim": "₺100.000",
    "kaynak": "Kifobu Girişim Takip Defteri",
    "seri": [
      {
        "etiket": "2022",
        "deger": 320
      },
      {
        "etiket": "2023",
        "deger": 480
      },
      {
        "etiket": "2024",
        "deger": 620
      },
      {
        "etiket": "2025",
        "deger": 750
      },
      {
        "etiket": "2026",
        "deger": 890
      }
    ],
    "mebiusTitle": "Net Worth Chart",
    "exportName": "NetWorthChart",
    "mebiusFile": "net-worth-chart.tsx",
    "previewImage": "/kits/charts/previews/charts-net-worth.webp",
    "tohumMiktar": 2,
    "tohumBirim": "300 bin TL tohum yatırımı"
  },
  {
    "id": "charts-financial-breakdown",
    "tur": "aralik-bant",
    "kategori": "PAYA DAYALI FONLAMA",
    "baslik": "Kampanya Hedef/Aşım Aralıkları",
    "aciklama": "Kampanyaların asgari hedef, ek fonlama tavanı ve gerçekleşen tutar bantları.",
    "metrik": "%118 Ortalama Aşım",
    "degisim": -1.4,
    "degisimEtiket": "yıllık sapma",
    "tarih": "2026",
    "boncukMiktar": 5,
    "boncukBirim": "%15 dilim",
    "kaynak": "Platform Bilgi Formları",
    "araliklar": [
      {
        "etiket": "%20 Alt",
        "min": 45,
        "max": 65,
        "mevcut": 58
      },
      {
        "etiket": "%20 II",
        "min": 38,
        "max": 52,
        "mevcut": 46
      },
      {
        "etiket": "%20 III",
        "min": 30,
        "max": 44,
        "mevcut": 37
      },
      {
        "etiket": "%20 IV",
        "min": 22,
        "max": 35,
        "mevcut": 28
      },
      {
        "etiket": "%20 Üst",
        "min": 14,
        "max": 24,
        "mevcut": 18
      }
    ],
    "mebiusTitle": "Financial Breakdown Chart",
    "exportName": "FinancialBreakdownChart",
    "mebiusFile": "financial-breakdown-chart.tsx",
    "previewImage": "/kits/charts/previews/charts-financial-breakdown.webp",
    "tohumMiktar": 3,
    "tohumBirim": "450 bin TL tohum yatırımı"
  },
  {
    "id": "charts-finance-overview-area",
    "tur": "alan",
    "kategori": "BORCA DAYALI FONLAMA",
    "baslik": "Biyoteknoloji ve Sağlık Fonlama Trendi",
    "aciklama": "Biyoteknoloji girişimlerine aktarılan sermayenin 12 aylık seyri.",
    "metrik": "₺78.200.000",
    "degisim": 0.4,
    "degisimEtiket": "iyileşme yönünde",
    "tarih": "3. Çeyrek 2026",
    "boncukMiktar": 3,
    "boncukBirim": "%1 GSYH",
    "kaynak": "TÜBİTAK BİGG & MKK",
    "seri": [
      {
        "etiket": "2024/4Ç",
        "deger": 4.8
      },
      {
        "etiket": "2025/2Ç",
        "deger": 4.2
      },
      {
        "etiket": "2025/4Ç",
        "deger": 3.8
      },
      {
        "etiket": "2026/2Ç",
        "deger": 3.4
      },
      {
        "etiket": "2026/3Ç",
        "deger": 3.1
      }
    ],
    "mebiusTitle": "Finance Overview Area Chart",
    "exportName": "FinanceOverviewAreaChart",
    "mebiusFile": "finance-overview-area-chart.tsx",
    "previewImage": "/kits/charts/previews/charts-finance-overview-area.webp",
    "tohumMiktar": 4,
    "tohumBirim": "600 bin TL tohum yatırımı"
  },
  {
    "id": "charts-total-balance",
    "tur": "sutun",
    "kategori": "GİRİŞİM EKOSİSTEMİ",
    "baslik": "Yıllık Yatırımcı Büyümesi",
    "aciklama": "Kitle fonlama sistemine kayıt yaptıran yeni onaylı yatırımcı sayısı.",
    "metrik": "38.400 Yatırımcı",
    "degisim": 9.3,
    "degisimEtiket": "çeyreklik artış",
    "tarih": "Ekim 2026",
    "boncukMiktar": 8,
    "boncukBirim": "₺2.000 Mr",
    "kaynak": "MKK Sicil ve Saklama",
    "seri": [
      {
        "etiket": "Oca",
        "deger": 13200
      },
      {
        "etiket": "Mar",
        "deger": 13900
      },
      {
        "etiket": "May",
        "deger": 14600
      },
      {
        "etiket": "Tem",
        "deger": 15400
      },
      {
        "etiket": "Eki",
        "deger": 16480
      }
    ],
    "mebiusTitle": "Total Balance Chart",
    "exportName": "TotalBalanceChart",
    "mebiusFile": "total-balance-chart.tsx",
    "previewImage": "/kits/charts/previews/charts-total-balance.webp",
    "tohumMiktar": 5,
    "tohumBirim": "750 bin TL tohum yatırımı"
  },
  {
    "id": "charts-budget",
    "tur": "sutun",
    "kategori": "YATIRIMCI DAĞILIMI",
    "baslik": "Sektörel Sermaye Dağılım Bütçesi",
    "aciklama": "Yazılım, derin teknoloji, tarım ve enerji sektörlerine ayrılan kitle fonları.",
    "metrik": "₺210.000.000",
    "degisim": -3.2,
    "degisimEtiket": "sapma",
    "tarih": "Ocak-Ekim 2026",
    "boncukMiktar": 9,
    "boncukBirim": "%10 hedef",
    "kaynak": "Kifobu Sektör İncelemesi",
    "seri": [
      {
        "etiket": "Personel",
        "deger": 94
      },
      {
        "etiket": "Yatırım",
        "deger": 82
      },
      {
        "etiket": "Cari Transfer",
        "deger": 89
      },
      {
        "etiket": "Faiz",
        "deger": 86
      }
    ],
    "mebiusTitle": "Budget Chart",
    "exportName": "BudgetChart",
    "mebiusFile": "budget-chart.tsx",
    "previewImage": "/kits/charts/previews/charts-budget.webp",
    "tohumMiktar": 6,
    "tohumBirim": "900 bin TL tohum yatırımı"
  },
  {
    "id": "charts-investment-performance",
    "tur": "coklu-karma",
    "kategori": "GSYO & SERMAYE",
    "baslik": "Fonlanan Girişimlerin Ciro Performansı",
    "aciklama": "Fonlama sonrası 1. ve 2. yıllarda girişimlerin gerçekleştirdiği yıllık ciro artışı.",
    "metrik": "%68 Yıllık Ciro Artışı",
    "degisim": 5.8,
    "degisimEtiket": "aylık ilave",
    "tarih": "Ekim 2026",
    "boncukMiktar": 8,
    "boncukBirim": "%10 getiri",
    "kaynak": "Girişimci Denetim Raporları",
    "seriler": [
      {
        "etiket": "Hisse Fonu",
        "cubuk": 54.2,
        "cizgi": 48
      },
      {
        "etiket": "Altın Fonu",
        "cubuk": 46.8,
        "cizgi": 42.5
      },
      {
        "etiket": "Eurobond",
        "cubuk": 38,
        "cizgi": 35
      },
      {
        "etiket": "Para Piyasası",
        "cubuk": 48.5,
        "cizgi": 47
      }
    ],
    "mebiusTitle": "Investment Performance Chart",
    "exportName": "InvestmentPerformanceChart",
    "mebiusFile": "investment-performance-chart.tsx",
    "previewImage": "/kits/charts/previews/charts-investment-performance.webp",
    "tohumMiktar": 7,
    "tohumBirim": "1.050 bin TL tohum yatırımı"
  },
  {
    "id": "charts-financial-trends",
    "tur": "alan",
    "kategori": "PLATFORM VERİLERİ",
    "baslik": "Kadın Girişimci Kampanyaları Trendi",
    "aciklama": "Kurucu ortakları arasında kadın girişimci bulunan projelerin fonlama hacmi.",
    "metrik": "₺64.000.000",
    "degisim": 2.4,
    "degisimEtiket": "aylık toparlanma",
    "tarih": "Ekim 2026",
    "boncukMiktar": 7,
    "boncukBirim": "15 puan",
    "kaynak": "SPK Sürdürülebilirlik İstatistikleri",
    "seri": [
      {
        "etiket": "May",
        "deger": 92.4
      },
      {
        "etiket": "Haz",
        "deger": 93.8
      },
      {
        "etiket": "Tem",
        "deger": 95.1
      },
      {
        "etiket": "Ağu",
        "deger": 96
      },
      {
        "etiket": "Eyl",
        "deger": 97.2
      },
      {
        "etiket": "Eki",
        "deger": 98.4
      }
    ],
    "mebiusTitle": "Financial Trends Chart",
    "exportName": "FinancialTrendsChart",
    "mebiusFile": "financial-trends-chart.tsx",
    "previewImage": "/kits/charts/previews/charts-financial-trends.webp",
    "tohumMiktar": 8,
    "tohumBirim": "1.200 bin TL tohum yatırımı"
  },
  {
    "id": "charts-analytics",
    "tur": "coklu-karma",
    "kategori": "PAYA DAYALI FONLAMA",
    "baslik": "Yatırımcı Başına Ortalama Sepet Tutarı",
    "aciklama": "Bireysel yatırımcıların kampanya başına koyduğu ortalama yatırım meblağı.",
    "metrik": "₺14.850 / Yatırımcı",
    "degisim": -4.1,
    "degisimEtiket": "volatilite azalışı",
    "tarih": "Ekim 2026",
    "boncukMiktar": 5,
    "boncukBirim": "3 endeks",
    "kaynak": "MKK Yatırımcı Analizi",
    "seriler": [
      {
        "etiket": "Banka",
        "cubuk": 18.2,
        "cizgi": 16
      },
      {
        "etiket": "Sanayi",
        "cubuk": 12.4,
        "cizgi": 11.5
      },
      {
        "etiket": "Hizmet",
        "cubuk": 14,
        "cizgi": 13.2
      },
      {
        "etiket": "Teknoloji",
        "cubuk": 22.5,
        "cizgi": 20.1
      }
    ],
    "mebiusTitle": "Analytics Chart",
    "exportName": "AnalyticsChart",
    "mebiusFile": "analytics-chart.tsx",
    "previewImage": "/kits/charts/previews/charts-analytics.webp",
    "tohumMiktar": 9,
    "tohumBirim": "1.350 bin TL tohum yatırımı"
  },
  {
    "id": "charts-cash-flow-daily-bar",
    "tur": "sutun",
    "kategori": "BORCA DAYALI FONLAMA",
    "baslik": "Kampanya Günlük Fon Toplama Hızı",
    "aciklama": "İlk 48 saatte ve kampanya son gününde toplanan günlük nakit yoğunluğu.",
    "metrik": "₺3.400.000 / Gün",
    "degisim": 6.1,
    "degisimEtiket": "günlük net giriş",
    "tarih": "30 Ekim 2026",
    "boncukMiktar": 6,
    "boncukBirim": "₺1 Mr",
    "kaynak": "Platform Canlı API Akışı",
    "seri": [
      {
        "etiket": "Pzt",
        "deger": 2.1
      },
      {
        "etiket": "Sal",
        "deger": 1.8
      },
      {
        "etiket": "Çar",
        "deger": 3.4
      },
      {
        "etiket": "Per",
        "deger": 2.9
      },
      {
        "etiket": "Cum",
        "deger": 4.2
      }
    ],
    "mebiusTitle": "Cash Flow Daily Bar Chart",
    "exportName": "CashFlowDailyBarChart",
    "mebiusFile": "cash-flow-daily-bar-chart.tsx",
    "previewImage": "/kits/charts/previews/charts-cash-flow-daily-bar.webp",
    "tohumMiktar": 10,
    "tohumBirim": "1.500 bin TL tohum yatırımı"
  },
  {
    "id": "charts-spending-overview-range",
    "tur": "aralik-bant",
    "kategori": "GİRİŞİM EKOSİSTEMİ",
    "baslik": "Platform Komisyon ve Maliyet Aralıkları",
    "aciklama": "Platformların başarı primi, emanet ücreti ve SPK harç bantları.",
    "metrik": "%6,5 Medyan Komisyon",
    "degisim": -1.8,
    "degisimEtiket": "haftalık",
    "tarih": "Ekim 2026",
    "boncukMiktar": 6,
    "boncukBirim": "₺3 Mr",
    "kaynak": "Platform Standart Sözleşmeleri",
    "araliklar": [
      {
        "etiket": "1. Hf",
        "min": 14.5,
        "max": 18.2,
        "mevcut": 16.4
      },
      {
        "etiket": "2. Hf",
        "min": 15,
        "max": 19.5,
        "mevcut": 17.8
      },
      {
        "etiket": "3. Hf",
        "min": 16.2,
        "max": 20.8,
        "mevcut": 18.5
      },
      {
        "etiket": "4. Hf",
        "min": 17,
        "max": 22,
        "mevcut": 20.1
      }
    ],
    "mebiusTitle": "Spending Overview Range Chart",
    "exportName": "SpendingOverviewRangeChart",
    "mebiusFile": "spending-overview-range-chart.tsx",
    "previewImage": "/kits/charts/previews/charts-spending-overview-range.webp",
    "tohumMiktar": 1,
    "tohumBirim": "150 bin TL tohum yatırımı"
  },
  {
    "id": "charts-budget-overview",
    "tur": "sutun",
    "kategori": "YATIRIMCI DAĞILIMI",
    "baslik": "Derin Teknoloji Girişimleri Fon Hacmi",
    "aciklama": "Yapay zekâ ve robotik girişimlerinin topladığı sermaye.",
    "metrik": "₺112.000.000",
    "degisim": 4.5,
    "degisimEtiket": "gerçekleşme",
    "tarih": "2026",
    "boncukMiktar": 7,
    "boncukBirim": "₺700 Mr",
    "kaynak": "Sanayi ve Teknoloji Bakanlığı",
    "seri": [
      {
        "etiket": "Eğitim",
        "deger": 1280
      },
      {
        "etiket": "Sağlık",
        "deger": 1050
      },
      {
        "etiket": "Sosyal Güvenlik",
        "deger": 1420
      },
      {
        "etiket": "Ulaştırma",
        "deger": 650
      },
      {
        "etiket": "Tarım Destek",
        "deger": 450
      }
    ],
    "mebiusTitle": "Budget Overview Chart",
    "exportName": "BudgetOverviewChart",
    "mebiusFile": "budget-overview-chart.tsx",
    "previewImage": "/kits/charts/previews/charts-budget-overview.webp",
    "tohumMiktar": 2,
    "tohumBirim": "300 bin TL tohum yatırımı"
  },
  {
    "id": "charts-sales-target",
    "tur": "radyal-hedef",
    "kategori": "GSYO & SERMAYE",
    "baslik": "Yıllık Ekosistem Fonlama Hedefi",
    "aciklama": "2026 yılı Türkiye kitle fonlama sektörü 1 milyar TL fonlama hedefi tamamlanma oranı.",
    "metrik": "%84,5 Tamamlandı",
    "degisim": 7.2,
    "degisimEtiket": "yıllık artış",
    "tarih": "Ekim 2026",
    "boncukMiktar": 9,
    "boncukBirim": "%10 gerçekleşme",
    "kaynak": "Kifobu Yıllık Hedef Modeli",
    "oran": 92.8,
    "hedef": 100,
    "mebiusTitle": "Sales Target Chart",
    "exportName": "SalesTargetChart",
    "mebiusFile": "sales-target-chart.tsx",
    "previewImage": "/kits/charts/previews/charts-sales-target.webp",
    "tohumMiktar": 3,
    "tohumBirim": "450 bin TL tohum yatırımı"
  },
  {
    "id": "charts-your-asset",
    "tur": "halka-pay",
    "kategori": "PLATFORM VERİLERİ",
    "baslik": "Yatırım Aracı Pay Dağılımı",
    "aciklama": "Kitle fonlamasında Paya Dayalı, Borca Dayalı ve Dönüştürülebilir Borç payları.",
    "metrik": "Paya Dayalı: %72",
    "degisim": 11.4,
    "degisimEtiket": "yıllık getiri",
    "tarih": "Ekim 2026",
    "boncukMiktar": 5,
    "boncukBirim": "₺100.000",
    "kaynak": "SPK Bültenleri",
    "dilimler": [
      {
        "ad": "BIST Hisse Senedi",
        "oran": 35,
        "renk": "yesil"
      },
      {
        "ad": "Altın & Kıymetli Maden",
        "oran": 25,
        "renk": "asimyasil"
      },
      {
        "ad": "Kısa Vadeli Bono/Mevduat",
        "oran": 25,
        "renk": "murekkep"
      },
      {
        "ad": "Eurobond / Döviz",
        "oran": 15,
        "renk": "gri"
      }
    ],
    "mebiusTitle": "Your Asset Chart",
    "exportName": "YourAssetChart",
    "mebiusFile": "your-asset-chart.tsx",
    "previewImage": "/kits/charts/previews/charts-your-asset.webp",
    "tohumMiktar": 4,
    "tohumBirim": "600 bin TL tohum yatırımı"
  },
  {
    "id": "charts-budget-plan",
    "tur": "akis-selale",
    "kategori": "PAYA DAYALI FONLAMA",
    "baslik": "Girişim Sermayesi Yatırım Akışı",
    "aciklama": "Hedeflenen fon, taahhüt edilen yatırım, iptal/iade ve net aktarılan sermaye.",
    "metrik": "₺42.000.000 Net",
    "degisim": 15,
    "degisimEtiket": "tasarruf oranı",
    "tarih": "Ekim 2026",
    "boncukMiktar": 4,
    "boncukBirim": "₺5.000",
    "kaynak": "Takasbank Mutabakatı",
    "adimlari": [
      {
        "ad": "Toplam Gelir",
        "deger": 60000,
        "tur": "artis"
      },
      {
        "ad": "Kira & Konut",
        "deger": -22000,
        "tur": "azalis"
      },
      {
        "ad": "Temel Giderler",
        "deger": -14000,
        "tur": "azalis"
      },
      {
        "ad": "Bireysel Emeklilik",
        "deger": -5500,
        "tur": "azalis"
      },
      {
        "ad": "Kalan Tasarruf",
        "deger": 18500,
        "tur": "net"
      }
    ],
    "mebiusTitle": "Budget Plan Chart",
    "exportName": "BudgetPlanChart",
    "mebiusFile": "budget-plan-chart.tsx",
    "previewImage": "/kits/charts/previews/charts-budget-plan.webp",
    "tohumMiktar": 5,
    "tohumBirim": "750 bin TL tohum yatırımı"
  },
  {
    "id": "charts-spending-overview-cylinder",
    "tur": "sutun",
    "kategori": "BORCA DAYALI FONLAMA",
    "baslik": "Çeyreklik Başarılı Kampanya Adedi",
    "aciklama": "Hedefine ulaşarak SPK tescilini alan çeyreklik proje adedi.",
    "metrik": "48 Kampanya",
    "degisim": -3.4,
    "degisimEtiket": "geçen aya göre",
    "tarih": "Ekim 2026",
    "boncukMiktar": 7,
    "boncukBirim": "20 işlem",
    "kaynak": "Kifobu Çeyrek Karnesi",
    "seri": [
      {
        "etiket": "Market",
        "deger": 58
      },
      {
        "etiket": "Yemek",
        "deger": 34
      },
      {
        "etiket": "Yakıt",
        "deger": 22
      },
      {
        "etiket": "Giyim",
        "deger": 16
      },
      {
        "etiket": "Kültür",
        "deger": 12
      }
    ],
    "mebiusTitle": "Spending Overview Cylinder Chart",
    "exportName": "SpendingOverviewCylinderChart",
    "mebiusFile": "spending-overview-cylinder-chart.tsx",
    "previewImage": "/kits/charts/previews/charts-spending-overview-cylinder.webp",
    "tohumMiktar": 6,
    "tohumBirim": "900 bin TL tohum yatırımı"
  },
  {
    "id": "charts-budget-health",
    "tur": "radyal-hedef",
    "kategori": "GİRİŞİM EKOSİSTEMİ",
    "baslik": "Girişim Yaşama Oranı (3 Yıllık)",
    "aciklama": "Kitle fonlamasından sermaye alan girişimlerin 3. yıl sonundaki aktif kalma oranı.",
    "metrik": "%78,4 Aktif",
    "degisim": 4,
    "degisimEtiket": "puan artışı",
    "tarih": "Ekim 2026",
    "boncukMiktar": 8,
    "boncukBirim": "10 puan",
    "kaynak": "Startups.watch & Kifobu",
    "oran": 84,
    "hedef": 100,
    "mebiusTitle": "Budget Health Chart",
    "exportName": "BudgetHealthChart",
    "mebiusFile": "budget-health-chart.tsx",
    "previewImage": "/kits/charts/previews/charts-budget-health.webp",
    "tohumMiktar": 7,
    "tohumBirim": "1.050 bin TL tohum yatırımı"
  },
  {
    "id": "charts-category-breakdown",
    "tur": "halka-pay",
    "kategori": "YATIRIMCI DAĞILIMI",
    "baslik": "Dikey Sektör Fon Dağılımı",
    "aciklama": "SaaS, Oyun, Sağlık Teknolojileri, Tarım ve Temiz Enerji payları.",
    "metrik": "Yazılım: %38",
    "degisim": 8.9,
    "degisimEtiket": "yıllık kredi büyümesi",
    "tarih": "Ekim 2026",
    "boncukMiktar": 7,
    "boncukBirim": "₺1.500 Mr",
    "kaynak": "Platform İcmalleri",
    "dilimler": [
      {
        "ad": "İmalat Sanayi",
        "oran": 32,
        "renk": "yesil"
      },
      {
        "ad": "Toptan & Perakende",
        "oran": 24,
        "renk": "asimyasil"
      },
      {
        "ad": "İnşaat",
        "oran": 18,
        "renk": "murekkep"
      },
      {
        "ad": "Enerji",
        "oran": 14,
        "renk": "gri"
      },
      {
        "ad": "Turizm & Diğer",
        "oran": 12,
        "renk": "komur"
      }
    ],
    "mebiusTitle": "Category Breakdown Chart",
    "exportName": "CategoryBreakdownChart",
    "mebiusFile": "category-breakdown-chart.tsx",
    "previewImage": "/kits/charts/previews/charts-category-breakdown.webp",
    "tohumMiktar": 8,
    "tohumBirim": "1.200 bin TL tohum yatırımı"
  },
  {
    "id": "charts-finance-overview-flow",
    "tur": "akis-selale",
    "kategori": "GSYO & SERMAYE",
    "baslik": "Kampanya Fonlama ve Masraf Şelalesi",
    "aciklama": "Brüt fonlama, platform payı, SPK tescil masrafı ve net girişimci hesabı.",
    "metrik": "₺28.400.000 Net Girişimci",
    "degisim": 14.5,
    "degisimEtiket": "haftalık net değişim",
    "tarih": "30 Ekim 2026",
    "boncukMiktar": 6,
    "boncukBirim": "$1 Mr",
    "kaynak": "SPK Saklama Raporu",
    "adimlari": [
      {
        "ad": "Önceki Rezerv",
        "deger": 152,
        "tur": "artis"
      },
      {
        "ad": "Reeskont Kredisi",
        "deger": 3.8,
        "tur": "artis"
      },
      {
        "ad": "Piyasa Alımı",
        "deger": 2.5,
        "tur": "artis"
      },
      {
        "ad": "Dış Borç Ödemesi",
        "deger": -1.5,
        "tur": "azalis"
      },
      {
        "ad": "Güncel Rezerv",
        "deger": 156.8,
        "tur": "net"
      }
    ],
    "mebiusTitle": "Finance Overview Flow Chart",
    "exportName": "FinanceOverviewFlowChart",
    "mebiusFile": "finance-overview-flow-chart.tsx",
    "previewImage": "/kits/charts/previews/charts-finance-overview-flow.webp",
    "tohumMiktar": 9,
    "tohumBirim": "1.350 bin TL tohum yatırımı"
  },
  {
    "id": "charts-value-locked",
    "tur": "alan",
    "kategori": "PLATFORM VERİLERİ",
    "baslik": "Kitle Fonlama Kilitli Toplam Değer (TVL)",
    "aciklama": "Girişimlerde sermaye payı olarak kilitlenen toplam pay değeri.",
    "metrik": "₺890.000.000",
    "degisim": -12.4,
    "degisimEtiket": "aylık çıkış",
    "tarih": "Ekim 2026",
    "boncukMiktar": 8,
    "boncukBirim": "₺100 Mr",
    "kaynak": "MKK Merkezi Saklama",
    "seri": [
      {
        "etiket": "Haz",
        "deger": 1650
      },
      {
        "etiket": "Tem",
        "deger": 1420
      },
      {
        "etiket": "Ağu",
        "deger": 1180
      },
      {
        "etiket": "Eyl",
        "deger": 980
      },
      {
        "etiket": "Eki",
        "deger": 840
      }
    ],
    "mebiusTitle": "Value Locked Chart",
    "exportName": "ValueLockedChart",
    "mebiusFile": "value-locked-chart.tsx",
    "previewImage": "/kits/charts/previews/charts-value-locked.webp",
    "tohumMiktar": 10,
    "tohumBirim": "1.500 bin TL tohum yatırımı"
  },
  {
    "id": "charts-saving-progress",
    "tur": "radyal-hedef",
    "kategori": "PAYA DAYALI FONLAMA",
    "baslik": "Girişimci Ek Fonlama Kotası",
    "aciklama": "Yönetmelik gereği azami %20 olan ek fonlama tavanının gerçekleşme seviyesi.",
    "metrik": "%92 Gerçekleşti",
    "degisim": 6.2,
    "degisimEtiket": "aylık ilerleme",
    "tarih": "Ekim 2026",
    "boncukMiktar": 8,
    "boncukBirim": "%10 birikim",
    "kaynak": "SPK İzahname İcmali",
    "oran": 78.5,
    "hedef": 100,
    "mebiusTitle": "Saving Progress Chart",
    "exportName": "SavingProgressChart",
    "mebiusFile": "saving-progress-chart.tsx",
    "previewImage": "/kits/charts/previews/charts-saving-progress.webp",
    "tohumMiktar": 1,
    "tohumBirim": "150 bin TL tohum yatırımı"
  },
  {
    "id": "charts-finance-overview-diverging-bar",
    "tur": "ayrisan-cubuk",
    "kategori": "BORCA DAYALI FONLAMA",
    "baslik": "Platform Bazında Net Fonlama Sapması",
    "aciklama": "Platformların hedeflenen fonlama süresi ve gerçekleşen gün farkı.",
    "metrik": "+4,2 Gün Medyan",
    "degisim": 18.2,
    "degisimEtiket": "açıkta daralma",
    "tarih": "Eylül 2026",
    "boncukMiktar": 4,
    "boncukBirim": "$1 Mr denge",
    "kaynak": "Kifobu Zaman Analitiği",
    "mebiusTitle": "Finance Overview Diverging Bar Chart",
    "exportName": "FinanceOverviewDivergingBarChart",
    "mebiusFile": "charts-finance-overview-diverging-bar.tsx",
    "previewImage": "charts-finance-overview-diverging-bar.webp",
    "seri": [
      {
        "etiket": "Tarım",
        "deger": 1.2
      },
      {
        "etiket": "Tekstil",
        "deger": 2.4
      },
      {
        "etiket": "Otomotiv",
        "deger": 1.8
      },
      {
        "etiket": "Kimya",
        "deger": -3.8
      },
      {
        "etiket": "Enerji",
        "deger": -5
      }
    ],
    "tohumMiktar": 2,
    "tohumBirim": "300 bin TL tohum yatırımı"
  },
  {
    "id": "charts-budget-allocation",
    "tur": "halka-pay",
    "kategori": "GİRİŞİM EKOSİSTEMİ",
    "baslik": "Kurumsal Yatırımcı Portföy Payı",
    "aciklama": "Kampanyalara katılan GSYF, melek ağları ve kurumsal fonların dağılımı.",
    "metrik": "GSYF Payı: %35",
    "degisim": 5.1,
    "degisimEtiket": "yıllık artış",
    "tarih": "2026",
    "boncukMiktar": 6,
    "boncukBirim": "₺200 Mr",
    "kaynak": "MKK Veri Analizi",
    "mebiusTitle": "Budget Allocation Chart",
    "exportName": "BudgetAllocationChart",
    "mebiusFile": "charts-budget-allocation.tsx",
    "previewImage": "charts-budget-allocation.webp",
    "dilimler": [
      {
        "ad": "Demiryolu & Lojistik",
        "oran": 30,
        "renk": "yesil"
      },
      {
        "ad": "Sulama & Tarım",
        "oran": 24,
        "renk": "asimyasil"
      },
      {
        "ad": "Eğitim Altyapısı",
        "oran": 20,
        "renk": "murekkep"
      },
      {
        "ad": "Sağlık Tesisleri",
        "oran": 16,
        "renk": "gri"
      },
      {
        "ad": "Teknoloji & AR-GE",
        "oran": 10,
        "renk": "komur"
      }
    ],
    "tohumMiktar": 3,
    "tohumBirim": "450 bin TL tohum yatırımı"
  },
  {
    "id": "charts-asset-overview-radial",
    "tur": "radyal-hedef",
    "kategori": "YATIRIMCI DAĞILIMI",
    "baslik": "Tohum Yatırımı Hedef Uyumu",
    "aciklama": "Tohum aşaması girişimlerin ilk yıl bütçe hedeflerine uyum oranı.",
    "metrik": "%88 Uyum",
    "degisim": 3.4,
    "degisimEtiket": "çeyreklik artış",
    "tarih": "Ekim 2026",
    "boncukMiktar": 8,
    "boncukBirim": "%10 verim",
    "kaynak": "Girişim Denetim Raporu",
    "mebiusTitle": "Asset Overview Radial Chart",
    "exportName": "AssetOverviewRadialChart",
    "mebiusFile": "charts-asset-overview-radial.tsx",
    "previewImage": "charts-asset-overview-radial.webp",
    "oran": 82,
    "hedef": 100,
    "tohumMiktar": 4,
    "tohumBirim": "600 bin TL tohum yatırımı"
  },
  {
    "id": "charts-options-portfolio",
    "tur": "ayrisan-cubuk",
    "kategori": "GSYO & SERMAYE",
    "baslik": "Sektörlerin Fonlama Getiri/Değer Artış Farkı",
    "aciklama": "İlk tur ile sonraki tur değerleme artışının sektör bazında ayrışması.",
    "metrik": "+%46 Net Artış",
    "degisim": 9.1,
    "degisimEtiket": "simülasyon getirisi",
    "tarih": "Vade: Aralık 2026",
    "boncukMiktar": 7,
    "boncukBirim": "₺6.000",
    "kaynak": "İkincil Değerleme Raporları",
    "mebiusTitle": "Options Portfolio Chart",
    "exportName": "OptionsPortfolioChart",
    "mebiusFile": "charts-options-portfolio.tsx",
    "previewImage": "charts-options-portfolio.webp",
    "seri": [
      {
        "etiket": "9.500",
        "deger": -18
      },
      {
        "etiket": "10.000",
        "deger": -4
      },
      {
        "etiket": "10.500",
        "deger": 8.5
      },
      {
        "etiket": "11.000",
        "deger": 22
      },
      {
        "etiket": "11.500",
        "deger": 42.5
      }
    ],
    "tohumMiktar": 5,
    "tohumBirim": "750 bin TL tohum yatırımı"
  },
  {
    "id": "charts-revenue-growth",
    "tur": "alan",
    "kategori": "PLATFORM VERİLERİ",
    "baslik": "Oyun ve Animasyon Sektörü Fonlama Hacmi",
    "aciklama": "Türkiye oyun stüdyolarının kitle fonlama yoluyla topladığı sermaye.",
    "metrik": "₺94.500.000",
    "degisim": 4.2,
    "degisimEtiket": "çeyreklik hızlanma",
    "tarih": "3. Çeyrek 2026",
    "boncukMiktar": 5,
    "boncukBirim": "%5 reel",
    "kaynak": "Kifobu Oyun Raporu",
    "mebiusTitle": "Revenue Growth Chart",
    "exportName": "RevenueGrowthChart",
    "mebiusFile": "charts-revenue-growth.tsx",
    "previewImage": "charts-revenue-growth.webp",
    "seri": [
      {
        "etiket": "2025/3Ç",
        "deger": 12
      },
      {
        "etiket": "2025/4Ç",
        "deger": 14.5
      },
      {
        "etiket": "2026/1Ç",
        "deger": 17.2
      },
      {
        "etiket": "2026/2Ç",
        "deger": 19.8
      },
      {
        "etiket": "2026/3Ç",
        "deger": 22.4
      }
    ],
    "tohumMiktar": 6,
    "tohumBirim": "900 bin TL tohum yatırımı"
  },
  {
    "id": "charts-investment-app-adoption-by-country",
    "tur": "siralama-cubuk",
    "kategori": "PAYA DAYALI FONLAMA",
    "baslik": "Şehirlere Göre Yatırımcı Dağılımı",
    "aciklama": "İstanbul, Ankara, İzmir, Bursa ve diğer illerin fonlama katılım payı.",
    "metrik": "İstanbul: %52",
    "degisim": 8.5,
    "degisimEtiket": "yıllık artış",
    "tarih": "2026",
    "boncukMiktar": 7,
    "boncukBirim": "%10 oran",
    "kaynak": "MKK İl Dağılım İstatistikleri",
    "mebiusTitle": "Investment App Adoption by Country Chart",
    "exportName": "InvestmentAppAdoptionByCountryChart",
    "mebiusFile": "charts-investment-app-adoption-by-country.tsx",
    "previewImage": "charts-investment-app-adoption-by-country.webp",
    "ogeler": [
      {
        "etiket": "Türkiye",
        "deger": 68.2
      },
      {
        "etiket": "Polonya",
        "deger": 62.4
      },
      {
        "etiket": "Brezilya",
        "deger": 58
      },
      {
        "etiket": "Meksika",
        "deger": 49.5
      },
      {
        "etiket": "Güney Afrika",
        "deger": 44
      }
    ],
    "tohumMiktar": 7,
    "tohumBirim": "1.050 bin TL tohum yatırımı"
  },
  {
    "id": "charts-global-finance-market-forecast",
    "tur": "aralik-bant",
    "kategori": "BORCA DAYALI FONLAMA",
    "baslik": "2027 Kitle Fonlama Büyüme Tahmin Bandı",
    "aciklama": "Gelecek yıl Türkiye ekosisteminin beklenen hacim aralığı.",
    "metrik": "₺1,8 Milyar - ₺2,4 Milyar",
    "degisim": -2,
    "degisimEtiket": "önceki ankete göre",
    "tarih": "Ekim 2026",
    "boncukMiktar": 5,
    "boncukBirim": "%5 beklenti",
    "kaynak": "Kifobu Ekonometrik Model",
    "mebiusTitle": "Global Finance Market Forecast Chart",
    "exportName": "GlobalFinanceMarketForecastChart",
    "mebiusFile": "charts-global-finance-market-forecast.tsx",
    "previewImage": "charts-global-finance-market-forecast.webp",
    "araliklar": [
      {
        "etiket": "3 Ay",
        "min": 28,
        "max": 35,
        "mevcut": 31.5
      },
      {
        "etiket": "6 Ay",
        "min": 24,
        "max": 30,
        "mevcut": 27
      },
      {
        "etiket": "12 Ay",
        "min": 20,
        "max": 28,
        "mevcut": 24.8
      },
      {
        "etiket": "24 Ay",
        "min": 14,
        "max": 20,
        "mevcut": 16.5
      }
    ],
    "tohumMiktar": 8,
    "tohumBirim": "1.200 bin TL tohum yatırımı"
  },
  {
    "id": "charts-average-sales",
    "tur": "sutun",
    "kategori": "GİRİŞİM EKOSİSTEMİ",
    "baslik": "Kampanya Başına Ortalama Fon Tutarı",
    "aciklama": "Başarıyla sonuçlanan bir kitle fonlama projesinin ortalama topladığı sermaye.",
    "metrik": "₺11.400.000",
    "degisim": 3.6,
    "degisimEtiket": "çeyreklik artış",
    "tarih": "3. Çeyrek 2026",
    "boncukMiktar": 8,
    "boncukBirim": "15 puan",
    "kaynak": "SPK İstatistik Bülteni",
    "mebiusTitle": "Average Sales Chart",
    "exportName": "AverageSalesChart",
    "mebiusFile": "charts-average-sales.tsx",
    "previewImage": "charts-average-sales.webp",
    "seri": [
      {
        "etiket": "2025/3Ç",
        "deger": 108
      },
      {
        "etiket": "2025/4Ç",
        "deger": 114
      },
      {
        "etiket": "2026/1Ç",
        "deger": 118
      },
      {
        "etiket": "2026/2Ç",
        "deger": 121
      },
      {
        "etiket": "2026/3Ç",
        "deger": 124.5
      }
    ],
    "tohumMiktar": 9,
    "tohumBirim": "1.350 bin TL tohum yatırımı"
  },
  {
    "id": "charts-performance",
    "tur": "coklu-karma",
    "kategori": "YATIRIMCI DAĞILIMI",
    "baslik": "Yatırımcı Sayısı ve Fonlama Korelasyonu",
    "aciklama": "Geniş tabanlı kitle katılımı ile fonlama hızı arasındaki ilişki.",
    "metrik": "R = 0,84 Korelasyon",
    "degisim": 12.4,
    "degisimEtiket": "yılbaşından bu yana",
    "tarih": "Ekim 2026",
    "boncukMiktar": 8,
    "boncukBirim": "%5 rölatif",
    "kaynak": "Kifobu Veri Laboratuvarı",
    "mebiusTitle": "Performance Chart",
    "exportName": "PerformanceChart",
    "mebiusFile": "charts-performance.tsx",
    "previewImage": "charts-performance.webp",
    "seriler": [
      {
        "etiket": "1. Çeyrek",
        "cubuk": 12,
        "cizgi": 15
      },
      {
        "etiket": "2. Çeyrek",
        "cubuk": 22,
        "cizgi": 25
      },
      {
        "etiket": "3. Çeyrek",
        "cubuk": 31,
        "cizgi": 33
      },
      {
        "etiket": "Güncel",
        "cubuk": 38.5,
        "cizgi": 42
      }
    ],
    "tohumMiktar": 10,
    "tohumBirim": "1.500 bin TL tohum yatırımı"
  },
  {
    "id": "charts-investment-growth",
    "tur": "alan",
    "kategori": "GSYO & SERMAYE",
    "baslik": "Tarım ve Gıda Teknolojileri Fonlama Trendi",
    "aciklama": "Sürdürülebilir tarım girişimlerinin 12 aylık fonlama büyümesi.",
    "metrik": "₺42.800.000",
    "degisim": 24,
    "degisimEtiket": "bileşik yıllık getiri",
    "tarih": "2026",
    "boncukMiktar": 6,
    "boncukBirim": "₺90.000",
    "kaynak": "Tarım ve Orman Bakanlığı & SPK",
    "mebiusTitle": "Investment Growth Chart",
    "exportName": "InvestmentGrowthChart",
    "mebiusFile": "charts-investment-growth.tsx",
    "previewImage": "charts-investment-growth.webp",
    "seri": [
      {
        "etiket": "1. Yıl",
        "deger": 120
      },
      {
        "etiket": "2. Yıl",
        "deger": 180
      },
      {
        "etiket": "3. Yıl",
        "deger": 270
      },
      {
        "etiket": "4. Yıl",
        "deger": 390
      },
      {
        "etiket": "5. Yıl",
        "deger": 540
      }
    ],
    "tohumMiktar": 1,
    "tohumBirim": "150 bin TL tohum yatırımı"
  },
  {
    "id": "charts-global-defi",
    "tur": "siralama-cubuk",
    "kategori": "PLATFORM VERİLERİ",
    "baslik": "Platform Başarı Oranı Sıralaması",
    "aciklama": "SPK lisanslı platformların hedefe ulaşma yüzdelerine göre sıralaması.",
    "metrik": "%89 En Yüksek",
    "degisim": 15.6,
    "degisimEtiket": "çeyreklik artış",
    "tarih": "Ekim 2026",
    "boncukMiktar": 6,
    "boncukBirim": "$30 Mr",
    "kaynak": "Kifobu Platform Karşılaştırma",
    "ogeler": [
      {
        "etiket": "USDT (Tether)",
        "deger": 124
      },
      {
        "etiket": "USDC (Circle)",
        "deger": 38.5
      },
      {
        "etiket": "DAI / USDS",
        "deger": 11.2
      },
      {
        "etiket": "FDUSD",
        "deger": 4.8
      },
      {
        "etiket": "Diğer",
        "deger": 3.5
      }
    ],
    "mebiusTitle": "Global DeFi Chart",
    "exportName": "GlobalDefiChart",
    "mebiusFile": "global-defi-chart.tsx",
    "previewImage": "/kits/charts/previews/charts-global-defi.webp",
    "tohumMiktar": 2,
    "tohumBirim": "300 bin TL tohum yatırımı"
  },
  {
    "id": "charts-investment-app-user-age",
    "tur": "sutun",
    "kategori": "PAYA DAYALI FONLAMA",
    "baslik": "Kitle Fonlama Yatırımcı Yaş Grupları",
    "aciklama": "25-34, 35-44, 45-54 ve 55+ yaş gruplarının yatırımcı tabanındaki ağırlığı.",
    "metrik": "25-34 Yaş: %41",
    "degisim": 5,
    "degisimEtiket": "yıllık artış",
    "tarih": "Ekim 2026",
    "boncukMiktar": 7,
    "boncukBirim": "1 milyon",
    "kaynak": "MKK Demografi Bülteni",
    "seri": [
      {
        "etiket": "18-24",
        "deger": 12.5
      },
      {
        "etiket": "25-34",
        "deger": 38.2
      },
      {
        "etiket": "35-44",
        "deger": 26.4
      },
      {
        "etiket": "45-54",
        "deger": 14.8
      },
      {
        "etiket": "55+",
        "deger": 8.1
      }
    ],
    "mebiusTitle": "Investment App User Age Chart",
    "exportName": "InvestmentAppUserAgeChart",
    "mebiusFile": "investment-app-user-age-chart.tsx",
    "previewImage": "/kits/charts/previews/charts-investment-app-user-age.webp",
    "tohumMiktar": 3,
    "tohumBirim": "450 bin TL tohum yatırımı"
  },
  {
    "id": "charts-finance-overview-stacked-bar",
    "tur": "yigilmis-sutun",
    "kategori": "BORCA DAYALI FONLAMA",
    "baslik": "Yerli ve Yabancı Yatırımcı Sermaye Katkısı",
    "aciklama": "Kampanyalara katılan yerleşik Türk yatırımcılar ve yurtdışı gurbetçi fonları.",
    "metrik": "₺120 Milyon / ₺28 Milyon",
    "degisim": -1.5,
    "degisimEtiket": "açık dengesi",
    "tarih": "3. Çeyrek 2026",
    "boncukMiktar": 6,
    "boncukBirim": "₺300 Mr",
    "kaynak": "MKK Yurt Dışı Saklama",
    "gruplar": [
      {
        "etiket": "2025/4Ç",
        "varlik": 1450,
        "yukumluluk": 1580
      },
      {
        "etiket": "2026/1Ç",
        "varlik": 1580,
        "yukumluluk": 1690
      },
      {
        "etiket": "2026/2Ç",
        "varlik": 1710,
        "yukumluluk": 1820
      },
      {
        "etiket": "2026/3Ç",
        "varlik": 1840,
        "yukumluluk": 1940
      }
    ],
    "mebiusTitle": "Finance Overview Stacked Bar Chart",
    "exportName": "FinanceOverviewStackedBarChart",
    "mebiusFile": "finance-overview-stacked-bar-chart.tsx",
    "previewImage": "/kits/charts/previews/charts-finance-overview-stacked-bar.webp",
    "tohumMiktar": 4,
    "tohumBirim": "600 bin TL tohum yatırımı"
  },
  {
    "id": "charts-finance-overview-timeline",
    "tur": "alan",
    "kategori": "GİRİŞİM EKOSİSTEMİ",
    "baslik": "Temiz Enerji ve İklim Girişimleri Fon Trendi",
    "aciklama": "Güneş enerjisi ve karbon yakalama girişimlerinin fonlama serüveni.",
    "metrik": "₺68.400.000",
    "degisim": 0,
    "degisimEtiket": "sabit tutuldu",
    "tarih": "Ekim 2026 Kararı",
    "boncukMiktar": 9,
    "boncukBirim": "%5 faiz",
    "kaynak": "Kifobu Yeşil Fonlama Raporu",
    "seri": [
      {
        "etiket": "Nis",
        "deger": 50
      },
      {
        "etiket": "Haz",
        "deger": 50
      },
      {
        "etiket": "Ağu",
        "deger": 47.5
      },
      {
        "etiket": "Eyl",
        "deger": 45
      },
      {
        "etiket": "Eki",
        "deger": 45
      }
    ],
    "mebiusTitle": "Finance Overview Timeline Chart",
    "exportName": "FinanceOverviewTimelineChart",
    "mebiusFile": "finance-overview-timeline-chart.tsx",
    "previewImage": "/kits/charts/previews/charts-finance-overview-timeline.webp",
    "tohumMiktar": 5,
    "tohumBirim": "750 bin TL tohum yatırımı"
  },
  {
    "id": "charts-revenue-by-product-line",
    "tur": "siralama-cubuk",
    "kategori": "YATIRIMCI DAĞILIMI",
    "baslik": "Fonlama Türlerine Göre Başarı Oranı",
    "aciklama": "Paya dayalı adi hisse, imtiyazlı pay ve borçlanma senetleri başarı yüzdesi.",
    "metrik": "İmtiyazlı Pay: %91",
    "degisim": 11.3,
    "degisimEtiket": "yıllık büyüme",
    "tarih": "3. Çeyrek 2026",
    "boncukMiktar": 6,
    "boncukBirim": "₺150 Mr",
    "kaynak": "SPK Hukuk Bülteni",
    "ogeler": [
      {
        "etiket": "Rafineri & Enerji",
        "deger": 340
      },
      {
        "etiket": "Otomotiv & Yan Sanayi",
        "deger": 260
      },
      {
        "etiket": "Dayanıklı Tüketim",
        "deger": 145
      },
      {
        "etiket": "Havacılık & Lojistik",
        "deger": 75
      }
    ],
    "mebiusTitle": "Revenue by Product Line Chart",
    "exportName": "RevenueByProductLineChart",
    "mebiusFile": "revenue-by-product-line-chart.tsx",
    "previewImage": "/kits/charts/previews/charts-revenue-by-product-line.webp",
    "tohumMiktar": 6,
    "tohumBirim": "900 bin TL tohum yatırımı"
  },
  {
    "id": "charts-growth-trends",
    "tur": "alan",
    "kategori": "GSYO & SERMAYE",
    "baslik": "Mobil Uygulama ve Fintech Fonlama Trendi",
    "aciklama": "Ödeme sistemleri ve finansal teknoloji girişimlerinin fonlama seyri.",
    "metrik": "₺88.000.000",
    "degisim": 1.8,
    "degisimEtiket": "eşik üzeri büyüme",
    "tarih": "Ekim 2026",
    "boncukMiktar": 5,
    "boncukBirim": "10 PMI (50 eşik)",
    "kaynak": "TCMB & SPK Fintek Raporu",
    "seri": [
      {
        "etiket": "May",
        "deger": 48.4
      },
      {
        "etiket": "Haz",
        "deger": 49.1
      },
      {
        "etiket": "Tem",
        "deger": 49.8
      },
      {
        "etiket": "Ağu",
        "deger": 50.5
      },
      {
        "etiket": "Eyl",
        "deger": 51.2
      },
      {
        "etiket": "Eki",
        "deger": 51.8
      }
    ],
    "mebiusTitle": "Growth Trends Chart",
    "exportName": "GrowthTrendsChart",
    "mebiusFile": "growth-trends-chart.tsx",
    "previewImage": "/kits/charts/previews/charts-growth-trends.webp",
    "tohumMiktar": 7,
    "tohumBirim": "1.050 bin TL tohum yatırımı"
  },
  {
    "id": "charts-asset-allocation",
    "tur": "halka-pay",
    "kategori": "PLATFORM VERİLERİ",
    "baslik": "Girişimci Ortaklık Pay Dağılımı",
    "aciklama": "Fonlamada halka arz edilen pay oranı, kurucu ortak payı ve GSYF hissesi.",
    "metrik": "Halka Açık Pay: %12",
    "degisim": 7.4,
    "degisimEtiket": "çeyreklik artış",
    "tarih": "Ekim 2026",
    "boncukMiktar": 8,
    "boncukBirim": "₺150 Mr",
    "kaynak": "Ticaret Sicil Gazetesi",
    "dilimler": [
      {
        "ad": "Devlet İç Borçlanma (DİBS)",
        "oran": 38,
        "renk": "yesil"
      },
      {
        "ad": "Hisse Senetleri",
        "oran": 28,
        "renk": "asimyasil"
      },
      {
        "ad": "Kıymetli Madenler",
        "oran": 18,
        "renk": "murekkep"
      },
      {
        "ad": "Döviz / Eurobond",
        "oran": 16,
        "renk": "gri"
      }
    ],
    "mebiusTitle": "Asset Allocation Chart",
    "exportName": "AssetAllocationChart",
    "mebiusFile": "asset-allocation-chart.tsx",
    "previewImage": "/kits/charts/previews/charts-asset-allocation.webp",
    "tohumMiktar": 8,
    "tohumBirim": "1.200 bin TL tohum yatırımı"
  },
  {
    "id": "charts-profit-margin-analysis",
    "tur": "ayrisan-cubuk",
    "kategori": "PAYA DAYALI FONLAMA",
    "baslik": "Girişimlerin Brüt Kârlılık Değişimi",
    "aciklama": "Fonlama öncesi ve sonrası brüt kâr marjlarındaki yıllık gelişim.",
    "metrik": "+%14,2 Marj Artışı",
    "degisim": 2.3,
    "degisimEtiket": "marj genişlemesi",
    "tarih": "3. Çeyrek 2026",
    "boncukMiktar": 5,
    "boncukBirim": "%0,5 marj",
    "kaynak": "Girişimci Mali Tabloları",
    "seri": [
      {
        "etiket": "Savunma",
        "deger": 4.5
      },
      {
        "etiket": "Havacılık",
        "deger": 3.2
      },
      {
        "etiket": "Perakende",
        "deger": 1.4
      },
      {
        "etiket": "Demir-Çelik",
        "deger": -2.8
      },
      {
        "etiket": "Petrokimya",
        "deger": -3.5
      }
    ],
    "mebiusTitle": "Profit Margin Analysis Chart",
    "exportName": "ProfitMarginAnalysisChart",
    "mebiusFile": "profit-margin-analysis-chart.tsx",
    "previewImage": "/kits/charts/previews/charts-profit-margin-analysis.webp",
    "tohumMiktar": 9,
    "tohumBirim": "1.350 bin TL tohum yatırımı"
  },
  {
    "id": "charts-monthly-income",
    "tur": "sutun",
    "kategori": "BORCA DAYALI FONLAMA",
    "baslik": "Borç Fonlama Aylık Kupon Ödemeleri",
    "aciklama": "Borca dayalı kitle fonlama yatırımcılarına ödenen aylık kümülatif faiz/kupon.",
    "metrik": "₺4.200.000",
    "degisim": 6,
    "degisimEtiket": "aylık artış",
    "tarih": "Ekim 2026",
    "boncukMiktar": 6,
    "boncukBirim": "₺9.000",
    "kaynak": "Takasbank Ödeme Kayıtları",
    "seri": [
      {
        "etiket": "Maaş",
        "deger": 38000
      },
      {
        "etiket": "Mevduat Faizi",
        "deger": 7500
      },
      {
        "etiket": "Kira Getirisi",
        "deger": 4500
      },
      {
        "etiket": "Temettü/Ek",
        "deger": 2000
      }
    ],
    "mebiusTitle": "Monthly Income Chart",
    "exportName": "MonthlyIncomeChart",
    "mebiusFile": "monthly-income-chart.tsx",
    "previewImage": "/kits/charts/previews/charts-monthly-income.webp",
    "tohumMiktar": 10,
    "tohumBirim": "1.500 bin TL tohum yatırımı"
  },
  {
    "id": "charts-asset-overview-bar",
    "tur": "sutun",
    "kategori": "GİRİŞİM EKOSİSTEMİ",
    "baslik": "Bölgesel Girişimci Dağılımı",
    "aciklama": "Marmara, İç Anadolu, Ege ve Akdeniz bölgelerinden çıkan girişim sayıları.",
    "metrik": "Marmara: 92 Proje",
    "degisim": 8.2,
    "degisimEtiket": "çeyreklik artış",
    "tarih": "Ekim 2026",
    "boncukMiktar": 7,
    "boncukBirim": "₺2.000 Mr",
    "kaynak": "Kifobu Coğrafi İnceleme",
    "seri": [
      {
        "etiket": "TL Mevduat",
        "deger": 58
      },
      {
        "etiket": "Döviz Tevdiat",
        "deger": 22
      },
      {
        "etiket": "Fiziki & Fon Altın",
        "deger": 12
      },
      {
        "etiket": "Hisse Senedi",
        "deger": 8
      }
    ],
    "mebiusTitle": "Asset Overview Bar Chart",
    "exportName": "AssetOverviewBarChart",
    "mebiusFile": "asset-overview-bar-chart.tsx",
    "previewImage": "/kits/charts/previews/charts-asset-overview-bar.webp",
    "tohumMiktar": 1,
    "tohumBirim": "150 bin TL tohum yatırımı"
  },
  {
    "id": "charts-sales-performance",
    "tur": "sutun",
    "kategori": "YATIRIMCI DAĞILIMI",
    "baslik": "Kampanyaların İlk Hafta Fonlanma Oranı",
    "aciklama": "Kampanyaların ilk 7 gün içinde ulaştığı ortalama hedef yüzdesi.",
    "metrik": "%64 İlk Hafta",
    "degisim": 4.5,
    "degisimEtiket": "geçen yılın aynı ayına göre",
    "tarih": "Eylül 2026",
    "boncukMiktar": 7,
    "boncukBirim": "$3 Mr",
    "kaynak": "Platform Anlık İzleme",
    "seri": [
      {
        "etiket": "May",
        "deger": 19.8
      },
      {
        "etiket": "Haz",
        "deger": 20.2
      },
      {
        "etiket": "Tem",
        "deger": 20.9
      },
      {
        "etiket": "Ağu",
        "deger": 21
      },
      {
        "etiket": "Eyl",
        "deger": 21.4
      }
    ],
    "mebiusTitle": "Sales Performance Chart",
    "exportName": "SalesPerformanceChart",
    "mebiusFile": "sales-performance-chart.tsx",
    "previewImage": "/kits/charts/previews/charts-sales-performance.webp",
    "tohumMiktar": 2,
    "tohumBirim": "300 bin TL tohum yatırımı"
  },
  {
    "id": "charts-expenses",
    "tur": "sutun",
    "kategori": "GSYO & SERMAYE",
    "baslik": "Tohum Girişimleri Personel Harcamaları",
    "aciklama": "Fonlanan ekiplerin mühendislik ve istihdam maliyet trendi.",
    "metrik": "₺18.500.000",
    "degisim": -3.1,
    "degisimEtiket": "tasarruf eğilimi",
    "tarih": "Ekim 2026",
    "boncukMiktar": 5,
    "boncukBirim": "₺8.000",
    "kaynak": "SGK & Girişimci İcmali",
    "seri": [
      {
        "etiket": "Kira/Kredi",
        "deger": 18000
      },
      {
        "etiket": "Market/Beslenme",
        "deger": 11500
      },
      {
        "etiket": "Faturalar",
        "deger": 4200
      },
      {
        "etiket": "Eğlence/Sosyal",
        "deger": 4700
      }
    ],
    "mebiusTitle": "Expenses Chart",
    "exportName": "ExpensesChart",
    "mebiusFile": "expenses-chart.tsx",
    "previewImage": "/kits/charts/previews/charts-expenses.webp",
    "tohumMiktar": 3,
    "tohumBirim": "450 bin TL tohum yatırımı"
  },
  {
    "id": "charts-total-revenue",
    "tur": "alan",
    "kategori": "PLATFORM VERİLERİ",
    "baslik": "Donanım ve İleri İmalat Fonlama Hacmi",
    "aciklama": "Fiziksel ürün üreten sanayi ve IoT girişimlerinin topladığı sermaye.",
    "metrik": "₺72.000.000",
    "degisim": 16.8,
    "degisimEtiket": "yıllık nominal artış",
    "tarih": "Ekim 2026",
    "boncukMiktar": 8,
    "boncukBirim": "₺800 Mr",
    "kaynak": "Sanayi Envanteri & MKK",
    "seri": [
      {
        "etiket": "1. Çeyrek",
        "deger": 1420
      },
      {
        "etiket": "2. Çeyrek",
        "deger": 3100
      },
      {
        "etiket": "3. Çeyrek",
        "deger": 4850
      },
      {
        "etiket": "Ekim",
        "deger": 6450
      }
    ],
    "mebiusTitle": "Total Revenue Chart",
    "exportName": "TotalRevenueChart",
    "mebiusFile": "total-revenue-chart.tsx",
    "previewImage": "/kits/charts/previews/charts-total-revenue.webp",
    "tohumMiktar": 4,
    "tohumBirim": "600 bin TL tohum yatırımı"
  },
  {
    "id": "charts-project-budget-allocation",
    "tur": "halka-pay",
    "kategori": "PAYA DAYALI FONLAMA",
    "baslik": "Yatırımcı Portföy Çeşitlendirmesi",
    "aciklama": "Bir yatırımcının portföyündeki ortalama girişim sayısı ve sektör dağılımı.",
    "metrik": "Ortalama 6 Girişim",
    "degisim": 6.4,
    "degisimEtiket": "tahsis artışı",
    "tarih": "2026",
    "boncukMiktar": 5,
    "boncukBirim": "₺100 Mr",
    "kaynak": "Kifobu Yatırımcı Davranış Anketi",
    "dilimler": [
      {
        "ad": "Deprem Bölgesi Konut",
        "oran": 45,
        "renk": "yesil"
      },
      {
        "ad": "Yüksek Hızlı Tren",
        "oran": 25,
        "renk": "asimyasil"
      },
      {
        "ad": "Yenilenebilir Enerji",
        "oran": 18,
        "renk": "murekkep"
      },
      {
        "ad": "Liman & Lojistik",
        "oran": 12,
        "renk": "gri"
      }
    ],
    "mebiusTitle": "Project Budget Allocation Chart",
    "exportName": "ProjectBudgetAllocationChart",
    "mebiusFile": "project-budget-allocation-chart.tsx",
    "previewImage": "/kits/charts/previews/charts-project-budget-allocation.webp",
    "tohumMiktar": 5,
    "tohumBirim": "750 bin TL tohum yatırımı"
  },
  {
    "id": "charts-income-overview",
    "tur": "sutun",
    "kategori": "BORCA DAYALI FONLAMA",
    "baslik": "TÜBİTAK BİGG Eşleşmeli Kitle Fonlama Tutarı",
    "aciklama": "Devlet hibe desteği almış girişimlerin kitle fonlamasında topladığı sermaye.",
    "metrik": "₺54.000.000",
    "degisim": 12.1,
    "degisimEtiket": "yıllık artış",
    "tarih": "Ekim 2026",
    "boncukMiktar": 7,
    "boncukBirim": "₺800 Mr",
    "kaynak": "TÜBİTAK & SPK Eşleşme Verisi",
    "seri": [
      {
        "etiket": "ÖTV",
        "deger": 1120
      },
      {
        "etiket": "Dahilde KDV",
        "deger": 840
      },
      {
        "etiket": "İthalde KDV",
        "deger": 1260
      },
      {
        "etiket": "Gelir Vergisi",
        "deger": 1420
      },
      {
        "etiket": "Kurumlar Vergisi",
        "deger": 1200
      }
    ],
    "mebiusTitle": "Income Overview Chart",
    "exportName": "IncomeOverviewChart",
    "mebiusFile": "income-overview-chart.tsx",
    "previewImage": "/kits/charts/previews/charts-income-overview.webp",
    "tohumMiktar": 6,
    "tohumBirim": "900 bin TL tohum yatırımı"
  },
  {
    "id": "charts-spending-overview-scatter",
    "tur": "nokta-dagilim",
    "kategori": "GİRİŞİM EKOSİSTEMİ",
    "baslik": "Kampanya Süresi ve Aşım Oranı Dağılımı",
    "aciklama": "Fonlama süresi (gün) ile ulaşılan ek fonlama aşımı arasındaki korelasyon.",
    "metrik": "28 Gün / %122 Aşım",
    "degisim": 0.04,
    "degisimEtiket": "esneklik katsayısı",
    "tarih": "2026",
    "boncukMiktar": 8,
    "boncukBirim": "0,1 korelasyon",
    "kaynak": "Kifobu Analitik Veri Tabanı",
    "noktalar": [
      {
        "x": 15,
        "y": 20
      },
      {
        "x": 25,
        "y": 28
      },
      {
        "x": 35,
        "y": 42
      },
      {
        "x": 45,
        "y": 48
      },
      {
        "x": 55,
        "y": 62
      },
      {
        "x": 65,
        "y": 68
      },
      {
        "x": 75,
        "y": 79
      },
      {
        "x": 85,
        "y": 88
      },
      {
        "x": 95,
        "y": 94
      }
    ],
    "mebiusTitle": "Spending Overview Scatter Chart",
    "exportName": "SpendingOverviewScatterChart",
    "mebiusFile": "spending-overview-scatter-chart.tsx",
    "previewImage": "/kits/charts/previews/charts-spending-overview-scatter.webp",
    "tohumMiktar": 7,
    "tohumBirim": "1.050 bin TL tohum yatırımı"
  },
  {
    "id": "charts-global-finance-market-combo",
    "tur": "coklu-karma",
    "kategori": "YATIRIMCI DAĞILIMI",
    "baslik": "Girişim Değerlemesi ve Çarpan Gelişimi",
    "aciklama": "Yıllık ciro çarpanı ile kampanya değerlemelerinin birlikte analizi.",
    "metrik": "8,4x Ciro Çarpanı",
    "degisim": 10.2,
    "degisimEtiket": "ihale talebi",
    "tarih": "Ekim 2026",
    "boncukMiktar": 6,
    "boncukBirim": "₺10 Mr",
    "kaynak": "Startups.watch & Kifobu",
    "seriler": [
      {
        "etiket": "2 Yıl Sabit",
        "cubuk": 22,
        "cizgi": 39.5
      },
      {
        "etiket": "5 Yıl Sabit",
        "cubuk": 18.5,
        "cizgi": 34.2
      },
      {
        "etiket": "10 Yıl Sabit",
        "cubuk": 14,
        "cizgi": 31
      },
      {
        "etiket": "TÜFE Endeksli",
        "cubuk": 10.5,
        "cizgi": 18.5
      }
    ],
    "mebiusTitle": "Global Finance Market Combo Chart",
    "exportName": "GlobalFinanceMarketComboChart",
    "mebiusFile": "global-finance-market-combo-chart.tsx",
    "previewImage": "/kits/charts/previews/charts-global-finance-market-combo.webp",
    "tohumMiktar": 8,
    "tohumBirim": "1.200 bin TL tohum yatırımı"
  },
  {
    "id": "charts-finance-analytics",
    "tur": "alan",
    "kategori": "GSYO & SERMAYE",
    "baslik": "Melek Yatırım Ağları Ortak Fonlama Trendi",
    "aciklama": "Melek ağlarının kitle fonlama kampanyalarında lider yatırımcı olma hacmi.",
    "metrik": "₺82.000.000",
    "degisim": 0.6,
    "degisimEtiket": "yasal sınırın üstünde",
    "tarih": "3. Çeyrek 2026",
    "boncukMiktar": 7,
    "boncukBirim": "%2,5 rasyo",
    "kaynak": "Hazine ve Maliye Bakanlığı Melek İstatistikleri",
    "seri": [
      {
        "etiket": "2025/3Ç",
        "deger": 16.8
      },
      {
        "etiket": "2025/4Ç",
        "deger": 17
      },
      {
        "etiket": "2026/1Ç",
        "deger": 16.9
      },
      {
        "etiket": "2026/2Ç",
        "deger": 17.2
      },
      {
        "etiket": "2026/3Ç",
        "deger": 17.4
      }
    ],
    "mebiusTitle": "Finance Analytics Chart",
    "exportName": "FinanceAnalyticsChart",
    "mebiusFile": "finance-analytics-chart.tsx",
    "previewImage": "/kits/charts/previews/charts-finance-analytics.webp",
    "tohumMiktar": 9,
    "tohumBirim": "1.350 bin TL tohum yatırımı"
  },
  {
    "id": "charts-ethereum",
    "tur": "alan",
    "kategori": "PLATFORM VERİLERİ",
    "baslik": "Blokzincir ve Web3 Girişimleri Fonlama Hacmi",
    "aciklama": "Kripto ve merkeziyetsiz teknoloji projelerinin yerli kitle fonlama büyümesi.",
    "metrik": "₺36.500.000",
    "degisim": 2.8,
    "degisimEtiket": "haftalık kazanç",
    "tarih": "30 Ekim 2026",
    "boncukMiktar": 8,
    "boncukBirim": "₺400",
    "kaynak": "Kifobu Web3 Endeksi",
    "seri": [
      {
        "etiket": "Pzt",
        "deger": 3050
      },
      {
        "etiket": "Sal",
        "deger": 3080
      },
      {
        "etiket": "Çar",
        "deger": 3095
      },
      {
        "etiket": "Per",
        "deger": 3120
      },
      {
        "etiket": "Cum",
        "deger": 3140
      }
    ],
    "mebiusTitle": "Ethereum Chart",
    "exportName": "EthereumChart",
    "mebiusFile": "ethereum-chart.tsx",
    "previewImage": "/kits/charts/previews/charts-ethereum.webp",
    "tohumMiktar": 10,
    "tohumBirim": "1.500 bin TL tohum yatırımı"
  },
  {
    "id": "charts-revenue-overview",
    "tur": "sutun",
    "kategori": "PAYA DAYALI FONLAMA",
    "baslik": "Çeyreklik Toplam Yatırımcı Sayısı",
    "aciklama": "Her çeyrekte sisteme dahil olan onaylı yatırımcı sayısı artışı.",
    "metrik": "12.400 Yeni Yatırımcı",
    "degisim": 21,
    "degisimEtiket": "yıllık nominal büyüme",
    "tarih": "3. Çeyrek 2026",
    "boncukMiktar": 7,
    "boncukBirim": "₺500 Mr",
    "kaynak": "MKK Sicil Raporu",
    "seri": [
      {
        "etiket": "2025/3Ç",
        "deger": 2850
      },
      {
        "etiket": "2025/4Ç",
        "deger": 3020
      },
      {
        "etiket": "2026/1Ç",
        "deger": 3180
      },
      {
        "etiket": "2026/2Ç",
        "deger": 3320
      },
      {
        "etiket": "2026/3Ç",
        "deger": 3450
      }
    ],
    "mebiusTitle": "Revenue Overview Chart",
    "exportName": "RevenueOverviewChart",
    "mebiusFile": "revenue-overview-chart.tsx",
    "previewImage": "/kits/charts/previews/charts-revenue-overview.webp",
    "tohumMiktar": 1,
    "tohumBirim": "150 bin TL tohum yatırımı"
  },
  {
    "id": "charts-portfolio-allocation",
    "tur": "halka-pay",
    "kategori": "BORCA DAYALI FONLAMA",
    "baslik": "Bireysel Yatırımcı Bütçe Ayrımı",
    "aciklama": "Bireysel yatırımcıların portföylerinde kitle fonlamasına ayırdığı pay.",
    "metrik": "Kitle Fonlama Payı: %18",
    "degisim": 9.5,
    "degisimEtiket": "çeyreklik büyüme",
    "tarih": "Ekim 2026",
    "boncukMiktar": 6,
    "boncukBirim": "₺25.000",
    "kaynak": "Kifobu Finansal Okuryazarlık Anketi",
    "dilimler": [
      {
        "ad": "BIST 30 Endeks Fonu",
        "oran": 40,
        "renk": "yesil"
      },
      {
        "ad": "Altın Katılım Fonu",
        "oran": 30,
        "renk": "asimyasil"
      },
      {
        "ad": "Kamu Dış Borçlanma",
        "oran": 20,
        "renk": "murekkep"
      },
      {
        "ad": "Para Piyasası Fonu",
        "oran": 10,
        "renk": "gri"
      }
    ],
    "mebiusTitle": "Portfolio Allocation Chart",
    "exportName": "PortfolioAllocationChart",
    "mebiusFile": "portfolio-allocation-chart.tsx",
    "previewImage": "/kits/charts/previews/charts-portfolio-allocation.webp",
    "tohumMiktar": 2,
    "tohumBirim": "300 bin TL tohum yatırımı"
  }
];
