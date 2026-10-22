# TL simgesi (₺, U+20BA): Schibsted Grotesk'teki kıvrık gövdeli çizim TCMB'nin teknik çizimine uymuyor
# (https://www.tcmb.gov.tr → Banka Hakkında → TL Simgesi). Bu betik glifi TCMB geometrisiyle yeniden çizer:
# dikey gövde, tabandan sağa 90° çember yayı (dış yarıçap = yüksekliğin yarısı, kalınlık = gövde),
# gövdeyi kesen iki paralel çizgi 20° yukarı eğimli, sol ve sağ uzunluk oranı altın orana yakın.
# Kalınlık yazı tipinin H gövdesinden alınır. 900 kesimde yayın içi kapanmasın diye gövde ve yay biraz incelir,
# çizgiler yaya değmesin diye incelir ve yükselir.
# İki ana çizim (400, 900) aynı noktalarla çizilir, ara kalınlıklar gvar ile ara değerlenir.
#
# Değiştirdiği dosyalar: src/kapak/fontlar/SchibstedGrotesk[wght].ttf (kapaklar ve 18:00 görseli) ve
# public/fonts/schibsted-grotesk-latin{,-ext}-v2.woff2 (site; ad değişince önbellek tazelenir, sürümü artır). OFL'de ayrılmış ad yok; değiştirilmiş sürüm aynı adla dağıtılabilir.
# Kullanım (fontTools ve brotli gerekir: pip install fonttools brotli): python scripts/marka/tl-simgesi.py
import math
from fontTools.ttLib import TTFont
from fontTools.ttLib.tables.TupleVariation import TupleVariation
from fontTools.pens.ttGlyphPen import TTGlyphPen
from fontTools import subset

TTF = 'src/kapak/fontlar/SchibstedGrotesk[wght].ttf'
GLIF = 'uni20BA'
H = 1440  # büyük harf yüksekliği
EGIM = math.tan(math.radians(20))

# Ana çizimler: s = gövde, halka = yay kalınlığı (H gövdesi: 400 → 178, 900 → 408). cubuk ve aralik dikey ölçü.
# Konumlar gövde merkezine göre (x) ve tabana göre (y).
ANA = {
    400: dict(s=178, halka=178, cubuk=142, aralik=75, sagUst=1224, sag=511),  # TCMB oranları: sağ uç üstten 1,5X aşağıda
    900: dict(s=370, halka=290, cubuk=205, aralik=85, sagUst=1300, sag=470),
}
SOL = -346  # sol uç: -2,4X (X = H/10)


def ciz(w, ilerleme):
    p = ANA[w]
    s, k, R, cy = p['s'], p['halka'], H / 2, H / 2
    x0 = (ilerleme - (R - SOL)) / 2 - SOL  # glif ilerlemenin ortasında
    pen = TTGlyphPen(None)

    # Gövde
    pen.moveTo((x0 - s / 2, 0)); pen.lineTo((x0 - s / 2, H)); pen.lineTo((x0 + s / 2, H)); pen.lineTo((x0 + s / 2, 0)); pen.closePath()

    # Yay: tabandan sağa 90°, dört parçalı ikinci derece eğri (her biri 22,5°)
    def yay(r, a, b):
        adim = (b - a) / 4
        for i in range(4):
            a1 = a + adim * i
            a2 = a1 + adim
            am = math.radians((a1 + a2) / 2)
            rk = r / math.cos(math.radians(abs(adim) / 2))
            pen.qCurveTo((x0 + rk * math.cos(am), cy + rk * math.sin(am)),
                         (x0 + r * math.cos(math.radians(a2)), cy + r * math.sin(math.radians(a2))))
    pen.moveTo((x0, 0)); pen.lineTo((x0, k))
    yay(R - k, -90, 0)
    pen.lineTo((x0 + R, cy))
    yay(R, 0, -90)
    pen.closePath()

    # İki paralel çizgi: dikey kalınlık `cubuk`, uçlar dikey kesik
    xl, xr = x0 + SOL, x0 + p['sag']
    ust = p['sagUst']
    for _ in range(2):
        alt = ust - p['cubuk']
        fark = (xr - xl) * EGIM
        pen.moveTo((xl, alt - fark)); pen.lineTo((xl, ust - fark)); pen.lineTo((xr, ust)); pen.lineTo((xr, alt)); pen.closePath()
        ust = alt - p['aralik']

    g = pen.glyph()
    g.flags[0] |= 0x40  # OVERLAP_SIMPLE: konturlar üst üste biniyor
    return g


f = TTFont(TTF)
glyf, gvar = f['glyf'], f['gvar']
eski = gvar.variations[GLIF][0]
assert eski.axes == {'wght': (0.0, 1.0, 1.0)}, eski.axes
ilerleme400 = f['hmtx'][GLIF][0]
ilerleme900 = ilerleme400 + eski.coordinates[-3][0]  # sağ hayalet noktanın deltası
g400, g900 = ciz(400, ilerleme400), ciz(900, ilerleme900)
assert len(g400.coordinates) == len(g900.coordinates)

g400.recalcBounds(glyf)
glyf[GLIF] = g400
f['hmtx'][GLIF] = (ilerleme400, g400.xMin)
deltalar = [(round(b[0] - a[0]), round(b[1] - a[1])) for a, b in zip(g400.coordinates, g900.coordinates)]
gvar.variations[GLIF] = [TupleVariation({'wght': (0.0, 1.0, 1.0)}, deltalar + list(eski.coordinates[-4:]))]
f.save(TTF)

# Site alt kümeleri: src/styles/fonts.css'teki unicode-range'lerle aynı (Google Fonts latin / latin-ext).
ARALIK = {
    'latin': 'U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD',
    'latin-ext': 'U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+0304,U+0308,U+0329,U+1D00-1DBF,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C4,U+2113,U+2C60-2C7F,U+A720-A7FF',
}
for ad, aralik in ARALIK.items():
    secenek = subset.Options()
    secenek.flavor = 'woff2'
    secenek.layout_features = ['*']
    secenek.name_IDs = ['*']
    secenek.notdef_outline = True
    alt = subset.Subsetter(secenek)
    alt.populate(unicodes=subset.parse_unicodes(aralik))
    font = TTFont(TTF)
    alt.subset(font)
    subset.save_font(font, f'public/fonts/schibsted-grotesk-{ad}-v2.woff2', secenek)
print('tamam')
