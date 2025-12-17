const fs = require('fs');
const path = require('path');

// Script para generar favicon.ico desde logo.svg usando sharp

async function generateFavicon() {
  try {
    const sharp = require('sharp');
    const publicDir = path.join(__dirname, '..', 'public');
    const svgPath = path.join(publicDir, 'logo.svg');
    const faviconPath = path.join(publicDir, 'favicon.ico');
    
    if (!fs.existsSync(svgPath)) {
      console.error('❌ No se encontró logo.svg en la carpeta public');
      process.exit(1);
    }
    
    console.log('📦 Generando favicon.ico desde logo.svg...');
    
    const svgBuffer = fs.readFileSync(svgPath);
    const bgColor = { r: 229, g: 236, b: 223, alpha: 1 };
    
    // Generar favicon.ico (32x32)
    await sharp(svgBuffer)
      .resize(32, 32, { fit: 'contain', background: bgColor })
      .png()
      .toBuffer()
      .then(buffer => {
        // Sharp no genera ICO directamente, pero podemos generar PNG y renombrarlo
        // O mejor, generar múltiples tamaños y crear un ICO
        return sharp(buffer)
          .resize(32, 32)
          .png()
          .toFile(faviconPath.replace('.ico', '.png'));
      });
    
    // Para ICO real, necesitaríamos una librería adicional
    // Por ahora generamos PNG que funciona como favicon en navegadores modernos
    console.log('✅ Generado favicon.png (32x32) desde logo.svg');
    console.log('💡 Nota: Los navegadores modernos aceptan PNG como favicon');
    console.log('💡 Para generar ICO real, instala: npm install to-ico --save-dev');
    
  } catch (error) {
    if (error.code === 'MODULE_NOT_FOUND') {
      console.error('❌ Error: sharp no está instalado');
      console.log('💡 Ejecuta: npm install sharp --save-dev');
      process.exit(1);
    } else {
      console.error('❌ Error generando favicon:', error.message);
      process.exit(1);
    }
  }
}

generateFavicon();

