import { readdir, readFile, open, unlink, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import sharp from 'sharp';
import exifr from 'exifr';
import { createStorage } from './storage.mjs';
import { root, widths, readManifest, saveManifest, todoFields } from './photo-manifest.mjs';

const force = process.argv.includes('--force');
const clean = (value) => typeof value === 'string' ? value.replace(/\0/g, '').replace(/\s+/g, ' ').trim() : '';
const slugify = (name) => path.parse(name).name.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'photo';

function metadata(raw = {}) {
  const make = clean(raw.Make).replace(/\b(corporation|corp\.?|inc\.?|co\.?|ltd\.?)\b/gi, '').replace(/[,\s.]+$/g, '').trim();
  const model = clean(raw.Model);
  const camera = model.toLowerCase().startsWith(make.toLowerCase()) ? model : [make, model].filter(Boolean).join(' ');
  const exif = {};
  if (camera) exif.camera = camera;
  if (clean(raw.LensModel)) exif.lens = clean(raw.LensModel);
  if (Number(raw.FNumber) > 0) exif.aperture = `f/${Number(Number(raw.FNumber).toFixed(2))}`;
  const exposure = Number(raw.ExposureTime);
  if (exposure > 0) exif.shutter = exposure <= 0.5 ? `1/${Math.round(1 / exposure)}` : `${Number(exposure.toFixed(4))}s`;
  if (Number(raw.ISO) > 0) exif.iso = Number(raw.ISO);
  // EXIF often omits the timezone. Preserve local ISO wall time rather than inventing one.
  const match = clean(raw.DateTimeOriginal).match(/^(\d{4}):(\d{2}):(\d{2})[ T](\d{2}):(\d{2}):(\d{2})$/);
  let date = 'TODO';
  if (match) {
    const [, year, month, day, hour, minute, second] = match;
    const offset = clean(raw.OffsetTimeOriginal);
    const candidate = `${year}-${month}-${day}T${hour}:${minute}:${second}${/^[+-]\d{2}:\d{2}$/.test(offset) ? offset : ''}`;
    if (Number.isFinite(Date.parse(candidate))) date = candidate;
  }
  return { exif, date };
}

async function main() {
  const unknown = process.argv.slice(2).filter((arg) => arg !== '--force');
  if (unknown.length) throw new Error(`Unknown arguments: ${unknown.join(', ')}. Usage: pnpm photos [--force]`);
  await mkdir(path.join(root, 'photos/originals'), { recursive: true });
  const lockPath = path.join(root, 'photos/.import.lock');
  let lock;
  try { lock = await open(lockPath, 'wx'); }
  catch (error) {
    if (error.code === 'EEXIST') throw new Error('Another photo import is running. If an earlier import crashed, remove photos/.import.lock before retrying.');
    throw error;
  }
  let added = 0, skipped = 0, failed = 0, refreshed = 0;
  try {
    const entries = await readManifest();
    const storage = await createStorage();
    const directory = path.join(root, 'photos/originals');
    const files = (await readdir(directory, { withFileTypes: true }))
      .filter((entry) => entry.isFile() && /\.(jpe?g|png|heic|webp)$/i.test(entry.name))
      .map((entry) => entry.name).sort();
    const seen = new Set();
    for (const filename of files) {
      try {
        const input = await readFile(path.join(directory, filename));
        const hash = createHash('sha256').update(input).digest('hex');
        const existing = entries.find((entry) => entry.hash === hash);
        if (seen.has(hash) || (existing && !force)) { skipped++; continue; }
        seen.add(hash);
        const base = slugify(filename);
        let slug = existing?.slug ?? base;
        for (let suffix = 2; !existing && entries.some((entry) => entry.slug === slug); suffix++) slug = `${base}-${suffix}`;
        // Allowlist before decoding/re-encoding; GPS, XMP, IPTC and maker notes are never retained.
        let raw;
        try {
          raw = await exifr.parse(input, {
            gps: false, xmp: false, iptc: false, icc: false, makerNote: false, userComment: false,
            reviveValues: false,
            pick: ['Make', 'Model', 'LensModel', 'FNumber', 'ExposureTime', 'ISO', 'DateTimeOriginal', 'OffsetTimeOriginal'],
          });
        } catch { console.warn(`${filename}: EXIF unavailable; continuing with editable date and empty EXIF.`); }
        const { exif, date } = metadata(raw);
        const pipeline = sharp(input).rotate().toColourspace('srgb');
        // sharp strips all metadata by default. Never call keepMetadata/withMetadata here.
        const rendered = [];
        for (const width of widths) {
          rendered.push(await pipeline.clone().resize({ width, withoutEnlargement: true }).webp({ quality: 80 }).toBuffer({ resolveWithObject: true }));
        }
        const blur = await pipeline.clone().resize({ width: 16, withoutEnlargement: true }).webp({ quality: 60 }).toBuffer();
        const sizes = {};
        for (let i = 0; i < widths.length; i++) sizes[widths[i]] = await storage.put(`${slug}-${widths[i]}.webp`, rendered[i].data);
        const { width, height } = rendered.at(-1).info;
        const technical = { hash, src: sizes[2048], sizes, width, height, blurDataURL: `data:image/webp;base64,${blur.toString('base64')}`, exif };
        const next = existing
          ? { ...existing, ...technical }
          : { slug, ...technical, date, title: 'TODO', place: 'TODO', story: 'TODO', roll: 'TODO', collections: [], favorite: false };
        const updated = existing ? entries.map((entry) => entry === existing ? next : entry) : [...entries, next];
        // Commit after each photo so one bad input never loses earlier successful imports.
        await saveManifest(updated);
        entries.splice(0, entries.length, ...updated);
        if (existing) refreshed++; else added++;
        console.log(`${existing ? 'Refreshed' : 'Added'} ${slug} (${width} × ${height})`);
      } catch (error) {
        failed++;
        console.error(`${filename}: ${error.message}${/\.heic$/i.test(filename) ? ' HEIC decoding depends on your sharp/libvips build; export as JPEG if unsupported.' : ''}`);
      }
    }
    console.log(`\nAdded: ${added} / skipped: ${skipped} / failed: ${failed} / refreshed: ${refreshed}`);
    const pending = entries.map((entry) => ({ slug: entry.slug, fields: todoFields(entry) })).filter((entry) => entry.fields.length);
    console.log(pending.length ? `Still TODO:\n${pending.map((entry) => `  ${entry.slug}: ${entry.fields.join(', ')}`).join('\n')}` : 'No TODO entries remaining.');
    if (failed) process.exitCode = 1;
  } finally {
    await lock.close();
    await unlink(lockPath);
  }
}

main().catch((error) => { console.error(`Photo import failed: ${error.message}`); process.exitCode = 1; });
