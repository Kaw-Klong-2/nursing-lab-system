import sharp from 'sharp';
import fs from 'fs';

async function main() {
  const artifactDir = 'C:/Users/Nurse2/.gemini/antigravity/brain/d6e319fc-9087-45cf-b5f5-fcd102558f90';
  const dieCutPath = `${artifactDir}/nurse_mascot_diecut.png`;
  const withShadowPath = `${artifactDir}/nurse_mascot_with_shadow.png`;

  const mascot = sharp(dieCutPath);
  const meta = await mascot.metadata();

  const padX = 50;
  const padTop = 15;
  const padBottom = 45;
  const canvasWidth = meta.width + padX * 2;
  const canvasHeight = meta.height + padTop + padBottom;

  const shadowCx = canvasWidth / 2;
  const shadowCy = canvasHeight - 28;
  const rx = meta.width * 0.32;
  const ry = 14;

  const shadowSvg = Buffer.from(`
    <svg width="${canvasWidth}" height="${canvasHeight}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="groundShadow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="#0f172a" stop-opacity="0.45" />
          <stop offset="35%" stop-color="#0f172a" stop-opacity="0.25" />
          <stop offset="70%" stop-color="#0f172a" stop-opacity="0.08" />
          <stop offset="100%" stop-color="#0f172a" stop-opacity="0" />
        </radialGradient>
      </defs>
      <ellipse cx="${shadowCx}" cy="${shadowCy}" rx="${rx}" ry="${ry}" fill="url(#groundShadow)" />
    </svg>
  `);

  await sharp({
    create: {
      width: canvasWidth,
      height: canvasHeight,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    }
  })
  .composite([
    { input: shadowSvg, top: 0, left: 0 },
    { input: dieCutPath, top: padTop, left: padX }
  ])
  .png()
  .toFile(withShadowPath);

  // Also copy to public/images for web preview and production use
  if (!fs.existsSync('public/images')) {
    fs.mkdirSync('public/images', { recursive: true });
  }
  fs.copyFileSync(dieCutPath, 'public/images/nurse_mascot_diecut.png');
  fs.copyFileSync(withShadowPath, 'public/images/nurse_mascot_with_shadow.png');

  console.log('Successfully created:');
  console.log('1. Die-cut PNG:', dieCutPath);
  console.log('2. With Ground Shadow PNG:', withShadowPath);
}

main().catch(console.error);
