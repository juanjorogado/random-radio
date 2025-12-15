# Logo Radio Mundial

Este proyecto incluye un logo minimalista estilo Braun para Radio Mundial.

## Archivos creados

- `src/logo.svg` - Logo principal (200x200px)
- `public/favicon.svg` - Favicon SVG para navegadores modernos

## Generar PNG desde SVG

Para generar los archivos PNG (`logo192.png` y `logo512.png`) desde el SVG, puedes usar:

### Opción 1: Usando ImageMagick (recomendado)
```bash
# Instalar ImageMagick si no lo tienes
# macOS: brew install imagemagick
# Ubuntu: sudo apt-get install imagemagick

# Generar logo192.png
convert -background none -resize 192x192 src/logo.svg public/logo192.png

# Generar logo512.png
convert -background none -resize 512x512 src/logo.svg public/logo512.png
```

### Opción 2: Usando Inkscape
```bash
# macOS: brew install inkscape
# Ubuntu: sudo apt-get install inkscape

inkscape src/logo.svg --export-filename=public/logo192.png --export-width=192 --export-height=192
inkscape src/logo.svg --export-filename=public/logo512.png --export-width=512 --export-height=512
```

### Opción 3: Herramientas online
- [CloudConvert](https://cloudconvert.com/svg-to-png)
- [Convertio](https://convertio.co/svg-png/)

Sube `src/logo.svg` y genera los tamaños 192x192 y 512x512.

### Opción 4: Usando Node.js con sharp
```bash
npm install --save-dev sharp
node -e "
const sharp = require('sharp');
sharp('src/logo.svg').resize(192, 192).toFile('public/logo192.png');
sharp('src/logo.svg').resize(512, 512).toFile('public/logo512.png');
"
```

## Diseño

El logo representa ondas de radio minimalistas en estilo Braun/Dieter Rams:
- Color principal: #e85d33 (naranja Braun)
- Diseño limpio y funcional
- Ondas concéntricas representando transmisión de radio
- Punto central como transmisor

