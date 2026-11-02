-- "Bu haber işine yaradı mı?": haber başına anonim günlük sayı. IP ya da okur bilgisi yok.
-- Worker (worker/index.js) ilk istekte aynı tabloyu kendisi kurar; bu dosya elle kurulum ve belge içindir.
CREATE TABLE IF NOT EXISTS kifobu_fayda (
  gun TEXT NOT NULL,
  slug TEXT NOT NULL,
  yanit TEXT NOT NULL CHECK (yanit IN ('evet', 'hayir')),
  sayi INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (gun, slug, yanit)
);
