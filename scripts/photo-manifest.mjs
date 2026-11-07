import { readFile, writeFile, rename } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

export const root = fileURLToPath(new URL('../', import.meta.url));
export const manifestPath = path.join(root, 'src/data/photos.json');
export const widths = [640, 1280, 2048];

export function privateFields(value, prefix = '') {
  if (!value || typeof value !== 'object') return [];
  return Object.entries(value).flatMap(([key, child]) => {
    const location = prefix ? `${prefix}.${key}` : key;
    const normalized = key.toLowerCase().replace(/[^a-z]/g, '');
    const forbidden = /gps|latitude|longitude|coordinate|geolocation|geotag|altitude/.test(normalized)
      || ['lat', 'lon', 'lng', 'location', 'position', 'geo'].includes(normalized);
    return [...(forbidden ? [location] : []), ...privateFields(child, location)];
  });
}

export function todoFields(value, prefix = '') {
  if (typeof value === 'string') return value.includes('TODO') ? [prefix] : [];
  if (!value || typeof value !== 'object') return [];
  return Object.entries(value).flatMap(([key, child]) => todoFields(child, prefix ? `${prefix}.${key}` : key));
}

export async function readManifest() {
  const entries = JSON.parse(await readFile(manifestPath, 'utf8'));
  if (!Array.isArray(entries)) throw new Error('photos.json must contain an array.');
  const slugs = new Set();
  for (const entry of entries) {
    if (!entry || typeof entry !== 'object' || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(entry.slug ?? '')) throw new Error('Every entry needs a safe, nonempty slug.');
    if (slugs.has(entry.slug)) throw new Error(`Duplicate slug: ${entry.slug}`);
    slugs.add(entry.slug);
    const forbidden = privateFields(entry);
    if (forbidden.length) throw new Error(`${entry.slug}: remove private location fields: ${forbidden.join(', ')}`);
  }
  return entries;
}

export async function saveManifest(entries) {
  const temporary = `${manifestPath}.${process.pid}.tmp`;
  await writeFile(temporary, `${JSON.stringify(entries, null, 2)}\n`, { flag: 'wx' });
  await rename(temporary, manifestPath);
}
