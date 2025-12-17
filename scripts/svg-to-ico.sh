#!/bin/bash

# Script para generar favicon.ico desde logo.svg usando sips y herramientas disponibles

PUBLIC_DIR="public"
SVG_FILE="$PUBLIC_DIR/logo.svg"
TEMP_PNG="$PUBLIC_DIR/favicon-temp.png"
FAVICON_PNG="$PUBLIC_DIR/favicon.png"
FAVICON_ICO="$PUBLIC_DIR/favicon.ico"

if [ ! -f "$SVG_FILE" ]; then
    echo "❌ No se encontró logo.svg en la carpeta public"
    exit 1
fi

echo "📦 Generando favicon desde logo.svg..."

# Convertir SVG a PNG usando sips
sips -s format png "$SVG_FILE" --out "$TEMP_PNG" > /dev/null 2>&1

# Redimensionar a 32x32
sips -z 32 32 "$TEMP_PNG" --out "$FAVICON_PNG" > /dev/null 2>&1

# Limpiar archivo temporal
rm -f "$TEMP_PNG"

echo "✅ Favicon PNG generado: $FAVICON_PNG"

# Intentar convertir a ICO si hay herramientas disponibles
if command -v convert &> /dev/null; then
    convert "$FAVICON_PNG" "$FAVICON_ICO"
    echo "✅ Favicon ICO generado: $FAVICON_ICO"
elif command -v magick &> /dev/null; then
    magick "$FAVICON_PNG" "$FAVICON_ICO"
    echo "✅ Favicon ICO generado: $FAVICON_ICO"
else
    echo "💡 Para generar favicon.ico, instala ImageMagick: brew install imagemagick"
    echo "💡 O usa el favicon.png (los navegadores modernos lo aceptan)"
fi

