const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Este script genera iconos desde logo.svg usando sharp
// Si sharp no está disponible, intenta usar herramientas del sistema

async function generateIcons() {
  const publicDir = path.join(__dirname, '..', 'public');
  const logoPath = path.join(publicDir, 'logo.png');
  const svgPath = path.join(publicDir, 'logo.svg');
  
  // Verificar que existe logo.png o logo.svg
  let sourcePath = logoPath;
  let sourceType = 'PNG';
  
  if (!fs.existsSync(logoPath)) {
    if (fs.existsSync(svgPath)) {
      sourcePath = svgPath;
      sourceType = 'SVG';
    } else {
      console.error('❌ No se encontró logo.png ni logo.svg en la carpeta public');
      process.exit(1);
    }
  }
  
  console.log(`📦 Generando iconos desde logo.${sourceType === 'PNG' ? 'png' : 'svg'}...`);
  
  try {
    // Intentar usar sharp primero
    const sharp = require('sharp');
    const sourceBuffer = fs.readFileSync(sourcePath);
    
    // Color de fondo (#E5ECDF = rgb(229, 236, 223))
    const bgColor = { r: 229, g: 236, b: 223, alpha: 1 };
    
    // Generar favicon.png (32x32) - algunos navegadores aceptan PNG como favicon
    const faviconPngPath = path.join(publicDir, 'favicon.png');
    const faviconOptions = sourceType === 'SVG' 
      ? { fit: 'contain', background: bgColor }
      : { fit: 'contain' };
    await sharp(sourceBuffer)
      .resize(32, 32, faviconOptions)
      .png()
      .toFile(faviconPngPath);
    console.log('✅ Generado favicon.png (32x32)');
    
    // Generar logo192.png desde logo.png
    const logo192Path = path.join(publicDir, 'logo192.png');
    const logo192Options = sourceType === 'SVG' 
      ? { fit: 'contain', background: bgColor }
      : { fit: 'contain' };
    await sharp(sourceBuffer)
      .resize(192, 192, logo192Options)
      .png()
      .toFile(logo192Path);
    console.log('✅ Generado logo192.png');
    
    // Generar logo512.png desde logo.png
    const logo512Path = path.join(publicDir, 'logo512.png');
    const logo512Options = sourceType === 'SVG' 
      ? { fit: 'contain', background: bgColor }
      : { fit: 'contain' };
    await sharp(sourceBuffer)
      .resize(512, 512, logo512Options)
      .png()
      .toFile(logo512Path);
    console.log('✅ Generado logo512.png');
    
    console.log('✨ ¡Todos los iconos generados exitosamente!');
    
  } catch (error) {
    if (error.code === 'MODULE_NOT_FOUND') {
      console.error('❌ Error: sharp no está instalado');
      console.log('💡 Ejecuta: npm install sharp --save-dev');
      console.log('💡 O instala ImageMagick/Inkscape y usa las herramientas del sistema');
      process.exit(1);
    } else {
      console.error('❌ Error generando iconos:', error.message);
      console.log('💡 Asegúrate de que sharp esté instalado: npm install sharp --save-dev');
      process.exit(1);
    }
  }
}

generateIcons();

