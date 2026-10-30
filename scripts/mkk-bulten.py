"""MKK Aylık Piyasa Bülteni'ni tarar, KFS ve GSYF verilerini çıkarır ve src/data/resmi-mkk.json dosyasına kaydeder.
Kullanım:
    python scripts/mkk-bulten.py         # Yalnızca konsola basar / test eder
    python scripts/mkk-bulten.py --yaz   # src/data/resmi-mkk.json dosyasını günceller
"""
import sys, re, json, urllib.request
from pathlib import Path
import pymupdf
from bs4 import BeautifulSoup

KOK = Path(__file__).resolve().parent.parent  # .../kifobu
HEDEF_JSON = KOK / "src" / "data" / "resmi-mkk.json"
BASE_URL = "https://www.mkk.com.tr"
LISTE_URL = f"{BASE_URL}/veri-hizmetleri/mkk-aylik-piyasa-bulteni"
UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36"


def en_son_bulten_url():
    """MKK bülten sayfasındaki en güncel PDF URL'sini ve ay/yıl etiketini döner."""
    req = urllib.request.Request(LISTE_URL, headers={"User-Agent": UA})
    html = urllib.request.urlopen(req, timeout=30).read().decode("utf-8", errors="ignore")
    soup = BeautifulSoup(html, "html.parser")
    
    for a in soup.find_all("a", href=True):
        href = a["href"]
        if "Aylik-Piyasa-Bulteni" in href and href.endswith(".pdf"):
            tam_url = href if href.startswith("http") else BASE_URL + href
            baslik = a.get_text(strip=True).replace("(yeni sekmede açılır)", "").strip()
            return tam_url, baslik
    return None, None


def bulten_ayristir(pdf_bytes):
    """PyMuPDF kullanarak KFS ve GSYF sayfalarını 0.1 saniyede milimetrik ayrıştırır."""
    doc = pymupdf.open(stream=pdf_bytes, filetype="pdf")
    veri = {"kfs": {}, "gsyf": {}}
    
    for page in doc:
        txt = page.get_text()
        
        # ==========================================
        # 1. KİTLE FONLAMASI SİSTEMİ (KFS)
        # ==========================================
        if "KİTLE FONLAMASI SİSTEMİ" in txt and "Kaydileşen Şirket Sayısı" in txt:
            # Platform ve Şirket
            m_sirket = re.search(r"Kaydileşen Şirket Sayısı:\s*(\d+)", txt)
            m_plat = re.search(r"KFS Platform Sayısı:\s*(\d+)", txt)
            if m_sirket: veri["kfs"]["kaydilesen_sirket"] = int(m_sirket.group(1))
            if m_plat: veri["kfs"]["platform_sayisi"] = int(m_plat.group(1))
            
            blocks = page.get_text("blocks")
            
            # Değişim oranları (Aylık, 3 Aylık, Yıllık)
            chg_blocks = [b for b in blocks if 130 <= b[1] <= 170]
            chg_blocks.sort(key=lambda x: x[0])
            percentages = []
            for b in chg_blocks:
                percentages.extend(re.findall(r"%[+-][\d,]+", b[4]))
            
            if len(percentages) >= 6:
                veri["kfs"]["degisim"] = {
                    "fonlanan": {"aylik": percentages[0], "ucAylik": percentages[1], "yillik": percentages[2]},
                    "yatirimci": {"aylik": percentages[3], "ucAylik": percentages[4], "yillik": percentages[5]}
                }
            
            # 13 Aylık Tarihsel Zaman Serisi
            dates = sorted([b for b in blocks if re.match(r"^\d{2}\.\d{2}\.\d{4}$", b[4].strip())], key=lambda b: b[0])
            fons = sorted([b for b in blocks if b[0] > 140 and 250 <= b[1] <= 340 and re.match(r"^\d,\d{2}$", b[4].strip())], key=lambda b: b[0])
            yats = sorted([b for b in blocks if b[0] > 120 and 180 <= b[1] <= 265 and re.match(r"^\d{2}\.\d{3}$", b[4].strip()) and float(b[4].strip().replace(".", "")) > 44000], key=lambda b: b[0])
            
            ts = []
            for d, f, y in zip(dates, fons, yats):
                ts.append({
                    "tarih": d[4].strip(),
                    "fonlanan_milyar_tl": float(f[4].strip().replace(",", ".")),
                    "yatirimci_sayisi": int(y[4].strip().replace(".", ""))
                })
            veri["kfs"]["zaman_serisi"] = ts

        # ==========================================
        # 2. GİRİŞİM SERMAYESİ YATIRIM FONU (GSYF)
        # ==========================================
        elif "GİRİŞİM SERMAYESİ YATIRIM FONU" in txt and "Portföy Değeri (Milyar TL)" in txt:
            blocks = page.get_text("blocks")
            
            # Değişim oranları
            chg_blocks = [b for b in blocks if 130 <= b[1] <= 170]
            chg_blocks.sort(key=lambda x: x[0])
            percentages = []
            for b in chg_blocks:
                percentages.extend(re.findall(r"%[+-][\d,]+", b[4]))
                
            if len(percentages) >= 6:
                veri["gsyf"]["degisim"] = {
                    "portfoy": {"aylik": percentages[0], "ucAylik": percentages[1], "yillik": percentages[2]},
                    "yatirimci": {"aylik": percentages[3], "ucAylik": percentages[4], "yillik": percentages[5]}
                }
            
            dates = sorted([b for b in blocks if re.match(r"^\d{2}\.\d{2}\.\d{4}$", b[4].strip())], key=lambda b: b[0])
            ports = sorted([b for b in blocks if 120 < b[0] < 710 and 235 <= b[1] <= 340 and re.match(r"^\d{3}$", b[4].strip())], key=lambda b: b[0])
            yats = sorted([b for b in blocks if 110 < b[0] < 715 and 170 <= b[1] <= 275 and re.match(r"^\d{1,2}\.\d{3}$", b[4].strip())], key=lambda b: b[0])
            
            ts = []
            for d, p, y in zip(dates, ports, yats):
                ts.append({
                    "tarih": d[4].strip(),
                    "portfoy_milyar_tl": int(p[4].strip()),
                    "yatirimci_sayisi": int(y[4].strip().replace(".", ""))
                })
            veri["gsyf"]["zaman_serisi"] = ts

    return veri


def main():
    sys.stdout.reconfigure(encoding="utf-8")
    yaz_modu = "--yaz" in sys.argv
    
    print("MKK bülten sayfası taranıyor...")
    url, baslik = en_son_bulten_url()
    if not url:
        print("Hata: MKK bülten linki bulunamadı.")
        sys.exit(1)
        
    print(f"En son bülten bulundu: {baslik}")
    print(f"URL: {url}")
    
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=60) as resp:
        pdf_bytes = resp.read()
    
    print(f"PDF indirildi ({len(pdf_bytes):,} bayt). Ayrıştırılıyor...")
    sonuc = bulten_ayristir(pdf_bytes)
    sonuc["kaynak"] = {
        "bulten": baslik,
        "url": url
    }
    
    kfs_son = sonuc["kfs"]["zaman_serisi"][-1] if sonuc.get("kfs", {}).get("zaman_serisi") else {}
    gsyf_son = sonuc["gsyf"]["zaman_serisi"][-1] if sonuc.get("gsyf", {}).get("zaman_serisi") else {}
    
    print("\n--- ÖZET SONUÇLAR ---")
    print(f"KFS Kaydileşen Şirket : {sonuc['kfs'].get('kaydilesen_sirket')}")
    print(f"KFS Platform Sayısı   : {sonuc['kfs'].get('platform_sayisi')}")
    print(f"KFS Fonlama (Son Ay)  : ₺{kfs_son.get('fonlanan_milyar_tl')} Milyar")
    print(f"KFS Yatırımcı (Son Ay): {kfs_son.get('yatirimci_sayisi'):,}")
    print(f"GSYF Portföy (Son Ay) : ₺{gsyf_son.get('portfoy_milyar_tl')} Milyar")
    print(f"GSYF Yatırımcı        : {gsyf_son.get('yatirimci_sayisi'):,}")
    
    if yaz_modu:
        eski = ""
        if HEDEF_JSON.exists():
            eski = HEDEF_JSON.read_text(encoding="utf-8")
            
        yeni = json.dumps(sonuc, ensure_ascii=False, indent=2) + "\n"
        if eski == yeni:
            print(f"\nDeğişiklik yok: {HEDEF_JSON.name} güncel.")
        else:
            HEDEF_JSON.parent.mkdir(parents=True, exist_ok=True)
            HEDEF_JSON.write_text(yeni, encoding="utf-8")
            print(f"\nBaşarıyla kaydedildi: {HEDEF_JSON}")
    else:
        print("\n(Bilgi: Dosyaya kaydetmek için '--yaz' parametresi ile çalıştırın)")


if __name__ == "__main__":
    main()

