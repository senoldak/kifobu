// Standartlar: yayımlanmadan hemen önce kırmızı/sarı süzgeç kapısı ve motor kaydı (bkz. standart.mjs, motor.mjs).
// kırmızı: yayımlanmaz, motor kaydına `elendi` + gerekçe gider. sarı: yayımlanır, `yazildi` kaydına gerekçe yazılır.
import { standartDenetle, standartOzeti } from './standart.mjs';
import { motorKaydet, kirmiziKayit, sariKayit } from './motor.mjs';

export async function standartKapisi({ baslik, ozet, metin, ekler = [], kaynakMetni, kimlik, motor = {}, log = console.log, kaydet = motorKaydet }) {
  const std = standartDenetle({ dil: 'tr', baslik, ozet, metin, ekler: ekler.filter((e) => typeof e === 'string' && e), kaynakMetni });
  if (std.karar !== 'temiz') log(`  ${standartOzeti(std)}`);
  if (std.karar === 'kirmizi') {
    await kaydet({ ...motor, site: 'kifobu', kayit: kirmiziKayit(kimlik, std) });
    return { yayimla: false, std, yazildi: async () => {} };
  }
  return {
    yayimla: true,
    std,
    // Yazı dosyası yazıldıktan sonra çağrılır; yalnız sarıda motor kaydı gerekir.
    yazildi: async (slug) => {
      if (std.karar === 'sari') await kaydet({ ...motor, site: 'kifobu', kayit: sariKayit(kimlik, slug, std) });
    },
  };
}
