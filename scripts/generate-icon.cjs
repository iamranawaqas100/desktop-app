#!/usr/bin/env node

/**
 * Icon Generator Script
 * Converts logo.png to icon.ico for Windows
 */

const sharp = require('sharp');
const { default: pngToIco } = require('png-to-ico');
const fs = require('fs');
const path = require('path');

const assetsDir = path.join(__dirname, '..', 'assets');
const logoPath = path.join(assetsDir, 'logo.png');
const iconPath = path.join(assetsDir, 'icon.ico');
const tempIconsDir = path.join(assetsDir, 'temp-icons');

console.log('🎨 Generating Windows icon from logo.png...\n');

async function generateIcon() {
  try {
    // Check if logo.png exists
    if (!fs.existsSync(logoPath)) {
      console.error('❌ logo.png not found at:', logoPath);
      process.exit(1);
    }

    // Ensure temp-icons directory exists
    if (!fs.existsSync(tempIconsDir)) {
      fs.mkdirSync(tempIconsDir, { recursive: true });
    }

    console.log('📐 Generating icon sizes: 16, 32, 48, 64, 128, 256...');

    // Generate multiple sizes
    const sizes = [16, 32, 48, 64, 128, 256];
    const pngPaths = [];

    for (const size of sizes) {
      const outputPath = path.join(tempIconsDir, `icon-${size}.png`);
      await sharp(logoPath)
        .resize(size, size, {
          fit: 'contain',
          background: { r: 255, g: 255, b: 255, alpha: 0 }
        })
        .png()
        .toFile(outputPath);
      
      pngPaths.push(outputPath);
      console.log(`  ✓ Generated ${size}x${size}`);
    }

    console.log('\n🔨 Converting to .ico format...');

    // Convert to ICO (use all sizes for best quality)
    const icoBuffer = await pngToIco(pngPaths);
    fs.writeFileSync(iconPath, icoBuffer);

    console.log('✅ icon.ico generated successfully!\n');
    console.log(`📍 Location: ${iconPath}\n`);
    console.log('🎉 Your app will now use the custom icon!\n');

  } catch (error) {
    console.error('❌ Error generating icon:', error.message);
    process.exit(1);
  }
}

generateIcon();

