/**
 * Turns the downloaded illustrations in art/raw into the WebP files the app serves.
 *
 *   npm run images            process everything in art/raw
 *   npm run images -- chess   only the named slugs
 *
 * A file is matched to a slug when its name is `<slug>.<ext>` or contains the slug's
 * ElevenLabs generation id (see art/images.json). Output: public/courses/<slug>-800.webp
 * and <slug>-1280.webp, centre-cropped to 16:10.
 */
import { readdirSync, readFileSync, mkdirSync } from 'node:fs';
import { join, parse } from 'node:path';
import sharp from 'sharp';

interface Manifest {
  images: Record<string, { generationId?: string }>;
}

const root = process.cwd();
const rawDir = join(root, 'art', 'raw');
const outDir = join(root, 'public', 'courses');
const manifest: Manifest = JSON.parse(readFileSync(join(root, 'art', 'images.json'), 'utf8'));
const only = new Set(process.argv.slice(2));
const WIDTHS = [800, 1280];

function slugFor(file: string): string | null {
  const name = parse(file).name.toLowerCase();
  if (manifest.images[name]) return name;
  for (const [slug, info] of Object.entries(manifest.images)) {
    if (info.generationId && file.includes(info.generationId)) return slug;
  }
  return null;
}

async function main() {
  mkdirSync(outDir, { recursive: true });
  const files = readdirSync(rawDir).filter((f) => /\.(png|jpe?g|webp)$/i.test(f));
  if (!files.length) {
    console.log('No images in art/raw. Download them from the ElevenLabs flow first (see docs/image-prompts.md).');
    return;
  }
  const done = new Set<string>();
  for (const file of files) {
    const slug = slugFor(file);
    if (!slug) {
      console.warn(`skip ${file}: name it <slug>.png (slugs: ${Object.keys(manifest.images).join(', ')})`);
      continue;
    }
    if (only.size && !only.has(slug)) continue;
    const src = sharp(join(rawDir, file));
    const { width = 0, height = 0 } = await src.metadata();
    // Largest 16:10 box that fits, centred.
    let w = width;
    let h = Math.round((w * 10) / 16);
    if (h > height) {
      h = height;
      w = Math.round((h * 16) / 10);
    }
    const left = Math.round((width - w) / 2);
    const top = Math.round((height - h) / 2);
    for (const target of WIDTHS) {
      const outW = Math.min(target, w);
      await sharp(join(rawDir, file))
        .extract({ left, top, width: w, height: h })
        .resize(outW, Math.round((outW * 10) / 16))
        .webp({ quality: target <= 800 ? 78 : 82, effort: 6 })
        .toFile(join(outDir, `${slug}-${target}.webp`));
    }
    done.add(slug);
    console.log(`✓ ${slug}  (${file}, ${width}×${height} → ${w}×${h})`);
  }
  const missing = Object.keys(manifest.images).filter((s) => !done.has(s) && (!only.size || only.has(s)));
  if (missing.length) console.log(`Not processed: ${missing.join(', ')}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
