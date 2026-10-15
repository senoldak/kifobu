import type { ArsivKaydi, Donem } from './tipler.ts';

// Saf hesaplar: saat okunmaz, Node'a özgü API kullanılmaz.

const GUN_MS = 24 * 60 * 60 * 1000;
const AY_KISA = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];
const AY_UZUN = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];

const ms = (tarih: string) => Date.parse(`${tarih}T00:00:00Z`);
const tarihe = (t: number) => new Date(t).toISOString().slice(0, 10);
const sirali = (kayitlar: ArsivKaydi[]) => [...kayitlar].sort((a, b) => (a.tarih < b.tarih ? -1 : a.tarih > b.tarih ? 1 : 0));

/** ISO hafta başlangıcı (Pazartesi). */
function haftaBasi(tarih: string): string {
  const t = ms(tarih);
  const gun = (new Date(t).getUTCDay() + 6) % 7; // Pzt=0 … Paz=6
  return tarihe(t - gun * GUN_MS);
}

function etiketle(donem: Donem, anahtar: string): string {
  if (donem === 'gun') return `${anahtar.slice(8, 10)}.${anahtar.slice(5, 7)}`;
  if (donem === 'ay') return `${AY_UZUN[Number(anahtar.slice(5, 7)) - 1]} ${anahtar.slice(0, 4)}`;
  const cuma = tarihe(ms(anahtar) + 4 * GUN_MS);
  const gun = (t: string) => Number(t.slice(8, 10));
  const ay = (t: string) => AY_KISA[Number(t.slice(5, 7)) - 1];
  return ay(anahtar) === ay(cuma)
    ? `${gun(anahtar)}–${gun(cuma)} ${ay(cuma)}`
    : `${gun(anahtar)} ${ay(anahtar)}–${gun(cuma)} ${ay(cuma)}`;
}

const anahtarla = (donem: Donem, tarih: string) =>
  donem === 'gun' ? tarih : donem === 'hafta' ? haftaBasi(tarih) : tarih.slice(0, 7);

interface Grup { anahtar: string; kayitlar: ArsivKaydi[] }

function grupla(kayitlar: ArsivKaydi[], donem: Donem): Grup[] {
  const harita = new Map<string, ArsivKaydi[]>();
  for (const k of sirali(kayitlar)) {
    const a = anahtarla(donem, k.tarih);
    const liste = harita.get(a);
    if (liste) liste.push(k);
    else harita.set(a, [k]);
  }
  return [...harita].map(([anahtar, liste]) => ({ anahtar, kayitlar: liste }));
}

/** Başlangıç olmayan ve en az bir bilinen girişi olan gün. */
const sayilabilir = (k: ArsivKaydi) => !k.baslangic && k.girisimler.some((g) => g.bugun !== null);

function gunToplami(k: ArsivKaydi): number | null {
  if (!sayilabilir(k)) return null;
  return k.girisimler.reduce((t, g) => t + (g.bugun ?? 0), 0);
}

export interface Dilim {
  anahtar: string; etiket: string; ilk: string; son: string;
  toplam: number | null; platformlar: Record<string, number>; eksik: boolean; birikmis: boolean;
}

function dilimden(g: Grup, donem: Donem): Dilim {
  const gunler = g.kayitlar.filter(sayilabilir);
  const platformlar: Record<string, number> = {};
  for (const k of gunler) {
    for (const gi of k.girisimler) {
      if (gi.bugun !== null) platformlar[gi.platform] = (platformlar[gi.platform] ?? 0) + gi.bugun;
    }
  }
  return {
    anahtar: g.anahtar,
    etiket: etiketle(donem, g.anahtar),
    ilk: g.kayitlar[0].tarih,
    son: g.kayitlar[g.kayitlar.length - 1].tarih,
    toplam: gunler.length ? gunler.reduce((t, k) => t + (gunToplami(k) ?? 0), 0) : null,
    platformlar,
    eksik: g.kayitlar.some((k) => k.girisimler.some((gi) => gi.veriAlinamadi)),
    birikmis: g.kayitlar.some((k) => k.girisimler.some((gi) => gi.birikmis)),
  };
}

export function dilimle(kayitlar: ArsivKaydi[], donem: Donem): Dilim[] {
  return grupla(kayitlar, donem).map((g) => dilimden(g, donem));
}

/** Dilimin son günü: hafta için Pazar, ay için ayın son günü, gün için kendisi (kapanış haftanın her günü). */
function donemSonGunu(donem: Donem, anahtar: string): string {
  if (donem === 'gun') return anahtar;
  if (donem === 'hafta') return tarihe(ms(anahtar) + 6 * GUN_MS);
  const yil = Number(anahtar.slice(0, 4));
  const ay = Number(anahtar.slice(5, 7));
  return tarihe(Date.UTC(yil, ay, 0));
}

export interface PlatformPayi { anahtar: string; ad: string; renk: string; pay: number }
export interface Ozet {
  donemToplami: number | null; degisimYuzde: number | null; gunlukOrtalama: number | null;
  aktifKampanya: number; sonaEren: number; platformPaylari: PlatformPayi[];
  /** Son dilim henüz kapanmadı (son kayıt dönemin son gününden önce): değişim yarım dönemi tam dönemle kıyaslar. */
  donemSuruyor: boolean;
}

export function ozetHesapla(kayitlar: ArsivKaydi[], donem: Donem): Ozet {
  const gruplar = grupla(kayitlar, donem);
  if (gruplar.length === 0) {
    return { donemToplami: null, degisimYuzde: null, gunlukOrtalama: null, aktifKampanya: 0, sonaEren: 0, platformPaylari: [], donemSuruyor: false };
  }
  const sonGrup = gruplar[gruplar.length - 1];
  const son = dilimden(sonGrup, donem);
  const onceki = gruplar.length > 1 ? dilimden(gruplar[gruplar.length - 2], donem) : null;
  const gunSayisi = sonGrup.kayitlar.filter(sayilabilir).length;
  const sonKayit = sonGrup.kayitlar[sonGrup.kayitlar.length - 1];

  const degisimYuzde =
    son.toplam !== null && onceki && onceki.toplam !== null && onceki.toplam !== 0
      ? ((son.toplam - onceki.toplam) / onceki.toplam) * 100
      : null;

  const aktif = sonKayit.girisimler.filter((g) => g.durum !== 'SONA ERDİ').length;

  const platformPaylari: PlatformPayi[] = [];
  if (son.toplam !== null && son.toplam > 0) {
    for (const [anahtar, tutar] of Object.entries(son.platformlar)) {
      if (tutar === 0) continue;
      const p = sonKayit.platformlar.find((x) => x.anahtar === anahtar);
      platformPaylari.push({ anahtar, ad: p?.ad ?? anahtar, renk: p?.renk ?? '#888888', pay: tutar / son.toplam });
    }
    platformPaylari.sort((a, b) => b.pay - a.pay);
  }

  return {
    donemToplami: son.toplam,
    degisimYuzde,
    gunlukOrtalama: son.toplam !== null && gunSayisi > 0 ? son.toplam / gunSayisi : null,
    aktifKampanya: aktif,
    sonaEren: sonKayit.girisimler.length - aktif,
    platformPaylari,
    donemSuruyor: sonKayit.tarih < donemSonGunu(donem, sonGrup.anahtar),
  };
}

export interface KampanyaSatiri {
  ad: string; platform: string; url?: string; donemGirisi: number | null; toplam: number;
  yuzde: number; durum: string; veriAlinamadi: boolean; birikmis: boolean;
  /** Dönem içinde bu kampanya için veri alınamayan en az bir gün var. */
  donemdeEksik: boolean;
}

export function kampanyaTablosu(kayitlar: ArsivKaydi[], donem: Donem): KampanyaSatiri[] {
  const gruplar = grupla(kayitlar, donem);
  if (gruplar.length === 0) return [];
  const sonGrup = gruplar[gruplar.length - 1];
  const sonKayit = sonGrup.kayitlar[sonGrup.kayitlar.length - 1];
  const gunler = sonGrup.kayitlar.filter((k) => !k.baslangic);

  const satirlar = sonKayit.girisimler.map((g): KampanyaSatiri => {
    let giris: number | null = null;
    const donemdeEksik = sonGrup.kayitlar.some((k) => k.girisimler.some((x) => x.ad === g.ad && x.veriAlinamadi));
    for (const k of gunler) {
      const b = k.girisimler.find((x) => x.ad === g.ad)?.bugun;
      if (b !== undefined && b !== null) giris = (giris ?? 0) + b;
    }
    return {
      ad: g.ad,
      platform: g.platform,
      ...(g.url !== undefined && { url: g.url }),
      donemGirisi: giris,
      toplam: g.alinan,
      yuzde: g.yuzde,
      durum: g.durum,
      veriAlinamadi: g.veriAlinamadi,
      birikmis: g.birikmis,
      donemdeEksik,
    };
  });

  return satirlar.sort((a, b) => {
    if (a.donemGirisi === null && b.donemGirisi !== null) return 1;
    if (a.donemGirisi !== null && b.donemGirisi === null) return -1;
    if (a.donemGirisi !== null && b.donemGirisi !== null && a.donemGirisi !== b.donemGirisi) {
      return b.donemGirisi - a.donemGirisi;
    }
    return b.toplam - a.toplam;
  });
}

export interface KampanyaSerisi {
  ad: string; platform: string; renk: string; hedef: number;
  noktalar: { tarih: string; alinan: number; veriAlinamadi: boolean }[];
}

export function kampanyaSerileri(kayitlar: ArsivKaydi[]): KampanyaSerisi[] {
  const seriler = new Map<string, KampanyaSerisi>();
  for (const k of sirali(kayitlar)) {
    for (const g of k.girisimler) {
      const renk = k.platformlar.find((p) => p.anahtar === g.platform)?.renk ?? '#888888';
      let s = seriler.get(g.ad);
      if (!s) {
        s = { ad: g.ad, platform: g.platform, renk, hedef: g.hedef, noktalar: [] };
        seriler.set(g.ad, s);
      }
      s.platform = g.platform;
      s.renk = renk;
      s.hedef = g.hedef;
      s.noktalar.push({ tarih: k.tarih, alinan: g.alinan, veriAlinamadi: g.veriAlinamadi });
    }
  }
  return [...seriler.values()];
}

export type TakvimTuru = 'veri' | 'baslangic' | 'eksik' | 'kapanis-yok' | 'gelecek' | 'seri-oncesi';
export interface TakvimGunu { tarih: string; tur: TakvimTuru; toplam: number | null }

/** `ay`: 1–12. `bugun` (YYYY-MM-DD) dışarıdan verilir; saat okunmaz. */
export function takvimAyi(kayitlar: ArsivKaydi[], yil: number, ay: number, bugun: string): TakvimGunu[] {
  const harita = new Map(kayitlar.map((k) => [k.tarih, k]));
  const gunSayisi = new Date(Date.UTC(yil, ay, 0)).getUTCDate();
  const ilkTarih = kayitlar.length ? sirali(kayitlar)[0].tarih : null;
  const sonuc: TakvimGunu[] = [];
  for (let d = 1; d <= gunSayisi; d++) {
    const tarih = `${yil}-${String(ay).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const k = harita.get(tarih);
    if (k) {
      const tur: TakvimTuru = k.baslangic
        ? 'baslangic'
        : k.girisimler.some((g) => g.veriAlinamadi) ? 'eksik' : 'veri';
      sonuc.push({ tarih, tur, toplam: gunToplami(k) });
    } else if (ilkTarih !== null && tarih < ilkTarih) {
      sonuc.push({ tarih, tur: 'seri-oncesi', toplam: null });
    } else {
      sonuc.push({ tarih, tur: tarih > bugun ? 'gelecek' : 'kapanis-yok', toplam: null });
    }
  }
  return sonuc;
}

const CSV_BASLIK = 'tarih,sayi,girisim,platform,gunluk_giris,toplam,hedef,yuzde,durum,veri_alinamadi,birikmis,baslangic';

function alan(v: string | number | boolean | null): string {
  if (v === null) return '';
  const s = String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function csvUret(kayitlar: ArsivKaydi[]): string {
  const satirlar = [CSV_BASLIK];
  for (const k of sirali(kayitlar)) {
    const girisimler = [...k.girisimler].sort((a, b) => (a.ad < b.ad ? -1 : a.ad > b.ad ? 1 : 0));
    for (const g of girisimler) {
      satirlar.push([
        k.tarih, k.sayi, g.ad, g.platform, g.bugun, g.alinan, g.hedef, g.yuzde, g.durum,
        g.veriAlinamadi, g.birikmis, k.baslangic,
      ].map(alan).join(','));
    }
  }
  return `﻿${satirlar.join('\n')}\n`;
}
