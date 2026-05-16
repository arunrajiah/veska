import sharp from 'sharp';
import { join } from 'path';

// Generate a simple indigo square with "V" letter as the Veska icon
const SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="100" fill="#4f46e5"/>
  <text x="256" y="340" font-family="system-ui, sans-serif" font-size="300" font-weight="700"
        fill="white" text-anchor="middle">V</text>
</svg>`;

const publicDir = join(process.cwd(), 'public');

async function generate() {
  const svgBuffer = Buffer.from(SVG);

  // Generate all required icon sizes
  await sharp(svgBuffer).resize(192, 192).png().toFile(join(publicDir, 'icon-192.png'));
  await sharp(svgBuffer).resize(512, 512).png().toFile(join(publicDir, 'icon-512.png'));
  await sharp(svgBuffer).resize(180, 180).png().toFile(join(publicDir, 'apple-touch-icon.png'));
  await sharp(svgBuffer).resize(32, 32).png().toFile(join(publicDir, 'favicon-32.png'));

  // Generate a simple wide screenshot placeholder (1280x720 indigo gradient)
  const screenshotSVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1280 720">
    <defs><linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#4f46e5"/>
      <stop offset="100%" style="stop-color:#7c3aed"/>
    </linearGradient></defs>
    <rect width="1280" height="720" fill="url(#g)"/>
    <text x="640" y="380" font-family="system-ui" font-size="72" font-weight="700"
          fill="white" text-anchor="middle">Veska ERP</text>
    <text x="640" y="460" font-family="system-ui" font-size="32"
          fill="rgba(255,255,255,0.7)" text-anchor="middle">AI-native ERP platform</text>
  </svg>`;

  await sharp(Buffer.from(screenshotSVG))
    .resize(1280, 720)
    .png()
    .toFile(join(publicDir, 'screenshot-wide.png'));

  console.log('Icons generated in public/');
}

generate().catch(console.error);
