// Şeffaflık sayfasının verisi: haber botu kaç aday taradı, kaç haber yayımlandı, hangi kaynak türlerinden.
// Taranan adaylar scripts/bot/gorulen.json'un `taranan` kaydından gelir (bot akışta gördüğü her güncel adayı yayın
// tarihiyle bir kez yazar). Kaynak adı hiçbir yerde geçmez: kayıtta yalnız kısa kod (k1a2b3c) ve yerli işareti var.
// Yayımlananlar botun haberleridir; günlük bültenler (derleme) sayılmaz.

const GUN_MS = 86400000;

export type TarananKayit = { zaman: string; kod?: string; yerli?: boolean };
export type SeffafHaber = { date: Date; category: string; uretim: string; draft?: boolean };

/** İstanbul takvim günü (YYYY-AA-GG). */
export const istanbulGunu = (t: Date | string | number) =>
  new Date(t).toLocaleDateString('sv-SE', { timeZone: 'Europe/Istanbul' });

/** Botun tek tek yazdığı haber (bülten ve editör yazısı değil). */
export const botHaberi = (h: SeffafHaber) => h.uretim === 'yapay-zeka' && h.category !== 'gunluk-bulten' && !h.draft;

export function seffaflikVerisi(
  haberler: SeffafHaber[],
  taranan: Record<string, TarananKayit>,
  { simdi = new Date(), gun = 30 }: { simdi?: Date; gun?: number } = {},
) {
  const kayitlar = Object.values(taranan ?? {}).map((k) => ({ gun: istanbulGunu(k.zaman), kod: k.kod, yerli: !!k.yerli }));
  const ilk = kayitlar.map((k) => k.gun).sort()[0];
  const bugun = istanbulGunu(simdi);
  const gunler: string[] = [];
  for (let i = gun - 1; i >= 0; i--) {
    const g = istanbulGunu(simdi.valueOf() - i * GUN_MS);
    if (!ilk || g >= ilk) gunler.push(g);
  }
  // Kayıt yoksa (bot henüz bu sürümle çalışmadı) pencere yalnız bugündür.
  const bas = ilk ? gunler[0] : bugun;
  const pencere = (g: string) => g >= bas && g <= bugun;
  const yayinlanan = haberler.filter((h) => botHaberi(h) && pencere(istanbulGunu(h.date)));
  const pencerede = kayitlar.filter((k) => pencere(k.gun));
  const tur = (yerli: boolean) => {
    const k = pencerede.filter((x) => x.yerli === yerli);
    return { taranan: k.length, kaynak: new Set(k.map((x) => x.kod).filter(Boolean)).size };
  };
  const yerli = tur(true);
  const kuresel = tur(false);
  return {
    ilkGun: bas,
    sonGun: bugun,
    gunSayisi: ilk ? gunler.length : 1,
    taranan: pencerede.length,
    yayinlanan: yayinlanan.length,
    // Yayına dönüşme: taranan aday başına yayımlanan haber. Bir haber aynı olayın birden çok adayından yazılır.
    donusumOrani: pencerede.length ? yayinlanan.length / pencerede.length : 0,
    kaynakSayisi: yerli.kaynak + kuresel.kaynak,
    yerli,
    kuresel,
    gunluk: (ilk ? gunler : [bugun]).map((g) => ({
      gun: g,
      taranan: pencerede.filter((k) => k.gun === g).length,
      yayinlanan: yayinlanan.filter((h) => istanbulGunu(h.date) === g).length,
    })),
  };
}
