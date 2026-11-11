// Kitle fonlaması resmî istatistikleri (src/data/kfs/) için saf yardımcılar: aylık ızgara, yatırımcı profili, biçim.
// Kaynak: Merkezi Kayıt Kuruluşu (MKK). Veriyi toplayan betik bu repoda değildir.

/** {"2022-12-01": v, "2024-01-01": v} -> [["2022-12-01", v], ["2023-01-01", null], …] (ilk aydan son aya, eksik ay null) */
export function aylikIzgara(harita) {
  const tarihler = Object.keys(harita ?? {}).sort();
  if (!tarihler.length) return [];
  const o = [];
  let [y, m] = tarihler[0].split('-').map(Number);
  const [sy, sm] = tarihler.at(-1).split('-').map(Number);
  while (y < sy || (y === sy && m <= sm)) {
    const t = `${y}-${String(m).padStart(2, '0')}-01`;
    o.push([t, harita[t] ?? null]);
    if (++m > 12) { m = 1; y++; }
  }
  return o;
}

/** Bir haritanın en son tarihli değeri */
export const sonDeger = (harita) => {
  const t = Object.keys(harita ?? {}).sort().at(-1);
  return t ? harita[t] : undefined;
};

/** Yatırımcı profili: her kırılımın son haftalık değeri (nitelik kaynakta bozuk olduğu için alınmaz) */
export const PROFIL_KIRILIMLARI = ['kisilik', 'uyruk', 'yas', 'cinsiyet'];
export function profil(kirilimlar) {
  return Object.fromEntries(PROFIL_KIRILIMLARI.map((k) => [k, sonDeger(kirilimlar[k]?.haftalik) ?? {}]));
}

export const PROFIL_ETIKET = {
  kisilik: { gercek_kisi: 'Gerçek kişi', tuzel_kisi: 'Tüzel kişi', fon: 'Fon', yatirim_ortakligi: 'Yatırım ortaklığı', diger: 'Diğer' },
  uyruk: { yerli: 'Yerli', yabanci: 'Yabancı' },
  yas: { '0-20': '20 ve altı', '21-30': '21–30', '31-40': '31–40', '41-50': '41–50', '51-60': '51–60', '61-70': '61–70', '71+': '71 ve üstü' },
  cinsiyet: { kadin: 'Kadın', erkek: 'Erkek' },
};
export const PROFIL_BASLIK = { kisilik: 'Yatırımcı türü', uyruk: 'Uyruk', yas: 'Yaş (gerçek kişiler)', cinsiyet: 'Cinsiyet (gerçek kişiler)' };

// Biçim (BRAND.md §9): aşağı kesilerek; tablo ve panelde ₺ önde, boşluksuz.
export const kes = (n, b) => Math.trunc(n * 10 ** b + 1e-9 * Math.sign(n)) / 10 ** b;
export const sayi = (n) => Math.round(n).toLocaleString('tr-TR');
export const ondalik = (n, b = 2) => kes(n, b).toLocaleString('tr-TR', { minimumFractionDigits: b, maximumFractionDigits: b });
export function tutar(n, s = '₺') {
  const a = Math.abs(n);
  if (a >= 1e9) return `${s}${ondalik(n / 1e9)} milyar`;
  if (a >= 1e6) return `${s}${ondalik(n / 1e6)} milyon`;
  if (a >= 1e3) return `${s}${sayi(Math.trunc(n / 1e3))} bin`;
  return `${s}${sayi(n)}`;
}
export const yuzde = (a, b) => (b ? `%${ondalik((a / b) * 100)}` : '—');
export const uzunTarih = (t) => new Date(`${t}T12:00:00`).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
