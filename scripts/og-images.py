#!/usr/bin/env python3
"""Genera las imágenes OG 1200x630 (ES/EN) con el motivo Cascada SDR."""
import math, random
from PIL import Image, ImageDraw, ImageFilter, ImageFont

W, H = 1200, 630
BG = (12, 17, 23)
TEAL = (127, 216, 200)
VIO = (143, 125, 255)
MUTED = (152, 160, 171)
STRONG = (245, 246, 248)

SERIF = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSerif.ttf', 92)
MONO_S = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf', 24)
MONO_XS = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf', 20)

TAGS = {
    'es': 'NUBE · DEVSECOPS · RADIOAFICIÓN · HPC',
    'en': 'CLOUD · DEVSECOPS · HAM RADIO · HPC',
}

def serif_fit(text: str, max_width: int) -> ImageFont.FreeTypeFont:
    """Serif del mayor tamaño (≤92) con el que el texto cabe en max_width."""
    for size in range(92, 48, -4):
        font = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSerif.ttf', size)
        if font.getbbox(text)[2] <= max_width:
            return font
    return ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSerif.ttf', 48)

def make(lang: str) -> None:
    rnd = random.Random(73)
    img = Image.new('RGB', (W, H), BG)

    # Nubes de espectro (blobs suaves teal/violeta)
    fog = Image.new('RGB', (W, H), BG)
    fd = ImageDraw.Draw(fog)
    for _ in range(90):
        x, y = rnd.randint(-100, W + 100), rnd.randint(-80, H + 80)
        r = rnd.randint(40, 150)
        c = TEAL if rnd.random() < 0.55 else VIO
        alpha = rnd.uniform(0.04, 0.10) * (0.4 + 0.6 * y / H)
        col = tuple(int(BG[i] + (c[i] - BG[i]) * alpha) for i in range(3))
        fd.ellipse([x - r, y - r, x + r, y + r], fill=col)
    fog = fog.filter(ImageFilter.GaussianBlur(60))
    img = Image.blend(img, fog, 0.9)

    d = ImageDraw.Draw(img, 'RGBA')

    # Portadoras verticales
    for fx, glow, alpha in [(180, 42, 60), (430, 30, 40), (905, 48, 70), (1105, 26, 45)]:
        for off in range(-glow, glow + 1):
            a = int(alpha * math.exp(-abs(off) / (glow / 2.6)))
            d.line([(fx + off, 0), (fx + off, H)], fill=TEAL + (a,))
        d.line([(fx, 0), (fx, H)], fill=TEAL + (160,))

    # Banda FFT al pie
    bw = 10
    for i in range(0, W // bw + 1):
        t = i * bw / W
        amp = 24 + 60 * abs(math.sin(i * 0.55) * math.cos(i * 0.21)) + rnd.uniform(0, 18)
        c = tuple(int(TEAL[j] + (VIO[j] - TEAL[j]) * t) for j in range(3))
        d.rectangle([i * bw, H - amp, i * bw + bw - 2, H], fill=c + (70,))

    # Scrim para legibilidad
    scrim = Image.new('L', (W, H), 0)
    sd = ImageDraw.Draw(scrim)
    for y in range(H):
        sd.line([(0, y), (W, y)], fill=int(120 * (y / H) ** 1.6 + 40 * (1 - y / H)))
    img = Image.composite(Image.new('RGB', (W, H), BG), img, scrim)

    d = ImageDraw.Draw(img, 'RGBA')

    # Texto
    d.text((90, 208), 'RX · JUANPINEDA.CO', font=MONO_XS, fill=TEAL + (255,))
    d.text((90, 258), 'Juan Pineda', font=SERIF, fill=STRONG + (255,))
    d.text((90, 392), TAGS[lang], font=MONO_S, fill=MUTED + (255,))
    d.text((90, 548), 'Medellín, Colombia', font=MONO_XS, fill=MUTED + (220,))

    img.save(f'public/og/default-{lang}.png', optimize=True)
    print(f'public/og/default-{lang}.png')

def make_page(filename: str, kicker: str, title: str, tag: str) -> None:
    """Variante por página: mismo lienzo, texto propio."""
    rnd = random.Random(73)
    img = Image.new('RGB', (W, H), BG)
    fog = Image.new('RGB', (W, H), BG)
    fd = ImageDraw.Draw(fog)
    for _ in range(90):
        x, y = rnd.randint(-100, W + 100), rnd.randint(-80, H + 80)
        r = rnd.randint(40, 150)
        c = TEAL if rnd.random() < 0.55 else VIO
        alpha = rnd.uniform(0.04, 0.10) * (0.4 + 0.6 * y / H)
        col = tuple(int(BG[i] + (c[i] - BG[i]) * alpha) for i in range(3))
        fd.ellipse([x - r, y - r, x + r, y + r], fill=col)
    fog = fog.filter(ImageFilter.GaussianBlur(60))
    img = Image.blend(img, fog, 0.9)
    d = ImageDraw.Draw(img, 'RGBA')
    for fx, glow, alpha in [(180, 42, 60), (430, 30, 40), (905, 48, 70), (1105, 26, 45)]:
        for off in range(-glow, glow + 1):
            a = int(alpha * math.exp(-abs(off) / (glow / 2.6)))
            d.line([(fx + off, 0), (fx + off, H)], fill=TEAL + (a,))
        d.line([(fx, 0), (fx, H)], fill=TEAL + (160,))
    bw = 10
    for i in range(0, W // bw + 1):
        t = i * bw / W
        amp = 24 + 60 * abs(math.sin(i * 0.55) * math.cos(i * 0.21)) + rnd.uniform(0, 18)
        c = tuple(int(TEAL[j] + (VIO[j] - TEAL[j]) * t) for j in range(3))
        d.rectangle([i * bw, H - amp, i * bw + bw - 2, H], fill=c + (70,))
    scrim = Image.new('L', (W, H), 0)
    sd = ImageDraw.Draw(scrim)
    for y in range(H):
        sd.line([(0, y), (W, y)], fill=int(120 * (y / H) ** 1.6 + 40 * (1 - y / H)))
    img = Image.composite(Image.new('RGB', (W, H), BG), img, scrim)
    d = ImageDraw.Draw(img, 'RGBA')
    d.text((90, 208), kicker, font=MONO_XS, fill=TEAL + (255,))
    d.text((90, 258), title, font=serif_fit(title, W - 180), fill=STRONG + (255,))
    d.text((90, 392), tag, font=MONO_S, fill=MUTED + (255,))
    d.text((90, 548), 'Juan Pineda · Medellín, Colombia', font=MONO_XS, fill=MUTED + (220,))
    img.save(f'public/og/{filename}.png', optimize=True)
    print(f'public/og/{filename}.png')

make('es')
make('en')

# Una imagen por página pública. Para un post nuevo: añadir su entrada aquí
# y correr `python3 scripts/og-images.py`.
PAGES = [
    ('charlas-es', 'EN EL AIRE · JUANPINEDA.CO', 'Charlas 2026',
     'SEGURIDAD Y REDES PARA LA INDUSTRIA AV'),
    ('charlas-en', 'ON THE AIR · JUANPINEDA.CO', 'Talks 2026',
     'SECURITY AND NETWORKING FOR THE AV INDUSTRY'),
    ('proyectos-es', 'SEÑAL FUERTE · JUANPINEDA.CO', 'Proyectos',
     'HERRAMIENTAS PROPIAS · RADIOAFICIÓN'),
    ('proyectos-en', 'STRONG SIGNAL · JUANPINEDA.CO', 'Projects',
     'TOOLS OF MY OWN · HAM RADIO'),
    ('sobre-mi-es', 'QRV DESDE MEDELLÍN', 'Sobre mí',
     'NUBE · DEVSECOPS · HPC · RADIOAFICIÓN'),
    ('sobre-mi-en', 'QRV FROM MEDELLÍN', 'About',
     'CLOUD · DEVSECOPS · HPC · HAM RADIO'),
    ('blog-es', 'BITÁCORA · JUANPINEDA.CO', 'Blog',
     'NOTAS SOBRE NUBE, SEGURIDAD Y RADIO'),
    ('blog-en', 'LOGBOOK · JUANPINEDA.CO', 'Blog',
     'NOTES ON CLOUD, SECURITY AND RADIO'),
    ('kit-es', 'PARA ORGANIZADORES', 'Kit de prensa',
     'BIO · CHARLAS · MATERIAL GRÁFICO'),
    ('kit-en', 'FOR ORGANIZERS', 'Speaker kit',
     'BIO · TALKS · GRAPHIC ASSETS'),
    ('post-nueva-frecuencia-es', 'BLOG · 2026', 'Nueva frecuencia',
     'EL REDISEÑO DE ESTE SITIO'),
    ('post-nueva-frecuencia-en', 'BLOG · 2026', 'New frequency',
     'THE REDESIGN OF THIS SITE'),
]
for args in PAGES:
    make_page(*args)
