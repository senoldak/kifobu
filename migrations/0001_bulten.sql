-- kifobu haftalık e-posta bülteni. IP ya da tarayıcı bilgisi tutulmaz. Ayrılan abonenin satırı silinir.
-- onay: bekliyor satırda son onay e-postasının zamanı (10 dakika kuralı), onayli satırda onay zamanı.
CREATE TABLE abone (
  id INTEGER PRIMARY KEY,
  eposta TEXT UNIQUE NOT NULL,
  dil TEXT NOT NULL DEFAULT 'tr',
  durum TEXT NOT NULL CHECK(durum IN ('bekliyor','onayli')),
  belirtec TEXT UNIQUE NOT NULL,
  olusturma TEXT NOT NULL,
  onay TEXT
);

-- Aynı haftanın bülteni iki kez gönderilmesin diye: hafta ISO anahtarı (2026-W43), dil başına bir satır.
CREATE TABLE gonderim (
  hafta TEXT,
  dil TEXT,
  zaman TEXT,
  adet INTEGER,
  PRIMARY KEY(hafta, dil)
);
