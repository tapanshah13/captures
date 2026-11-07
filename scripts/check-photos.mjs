import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import ts from 'typescript';
import sharp from 'sharp';
import { root, widths, readManifest, todoFields } from './photo-manifest.mjs';

// Read the actual roll declaration without executing the app or duplicating its IDs.
async function rollIds() {
  const source = await readFile(path.join(root, 'src/data/captures.ts'), 'utf8');
  const ast = ts.createSourceFile('captures.ts', source, ts.ScriptTarget.Latest, true);
  const ids = new Set();
  function visit(node) {
    if (ts.isVariableDeclaration(node) && node.name.getText(ast) === 'rolls' && node.initializer && ts.isArrayLiteralExpression(node.initializer)) {
      for (const item of node.initializer.elements) {
        if (!ts.isObjectLiteralExpression(item)) continue;
        for (const property of item.properties) {
          if (ts.isPropertyAssignment(property) && property.name.getText(ast).replace(/["']/g, '') === 'id' && ts.isStringLiteral(property.initializer)) ids.add(property.initializer.text);
        }
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(ast);
  if (!ids.size) throw new Error('Could not read roll IDs from the rolls array in captures.ts.');
  return ids;
}

async function checkFile(src) {
  if (typeof src !== 'string') throw new Error('Missing image URL.');
  if (src.startsWith('/captures/')) {
    if (!/^\/captures\/[a-z0-9-]+\.webp$/.test(src)) throw new Error(`Invalid local image path: ${src}`);
    const file = path.join(root, 'public', src.slice(1));
    const info = await stat(file);
    if (!info.isFile() || !info.size) throw new Error(`Missing or empty image: ${src}`);
    const metadata = await sharp(file).metadata();
    if (metadata.format !== 'webp') throw new Error(`Not WebP: ${src}`);
    if (['exif', 'icc', 'iptc', 'xmp', 'orientation'].some((key) => metadata[key] !== undefined)) throw new Error(`Image still contains metadata: ${src}`);
    return metadata;
  }
  const url = new URL(src);
  if (url.protocol !== 'https:' || !url.hostname.endsWith('.public.blob.vercel-storage.com')) throw new Error(`Unsupported image URL: ${src}`);
  const response = await fetch(url, { method: 'HEAD', signal: AbortSignal.timeout(15000) });
  if (!response.ok) throw new Error(`Blob file unavailable (${response.status}): ${src}`);
  return null;
}

async function main() {
  const entries = await readManifest();
  const rolls = await rollIds();
  const errors = [];
  const hashes = new Set();
  const checked = new Map();
  let published = 0;
  for (const entry of entries) {
    const fail = (message) => errors.push(`${entry.slug}: ${message}`);
    if (!/^[a-f0-9]{64}$/.test(entry.hash ?? '')) fail('Missing or invalid SHA-256 hash.');
    if (hashes.has(entry.hash)) fail('Duplicate content hash.');
    hashes.add(entry.hash);
    if (!rolls.has(entry.roll)) fail(`Unknown roll "${entry.roll}"; assign an ID defined in captures.ts (including drafts).`);
    const isPublished = entry.title !== 'TODO';
    if (isPublished) {
      published++;
      const pending = todoFields(entry);
      if (pending.length) fail(`Published photo still has TODO: ${pending.join(', ')}.`);
      for (const key of ['title', 'place', 'story', 'date', 'roll']) if (typeof entry[key] !== 'string' || !entry[key].trim()) fail(`Published photo needs ${key}.`);
      if (!/^\d{4}-\d{2}-\d{2}T/.test(entry.date ?? '') || !Number.isFinite(Date.parse(entry.date))) fail('Published photo needs a valid ISO date.');
    }
    if (!Array.isArray(entry.collections) || entry.collections.some((value) => typeof value !== 'string')) fail('collections must be a string array.');
    if (typeof entry.favorite !== 'boolean') fail('favorite must be a boolean.');
    if (![entry.width, entry.height].every((value) => Number.isInteger(value) && value > 0)) fail('Missing final width/height.');
    if (!/^data:image\/webp;base64,[A-Za-z0-9+/]+={0,2}$/.test(entry.blurDataURL ?? '')) fail('Missing WebP blurDataURL.');
    if (entry.src !== entry.sizes?.['2048']) fail('src must equal the largest rendition (sizes.2048).');
    for (const target of widths) {
      const src = entry.sizes?.[target];
      try {
        if (!checked.has(src)) checked.set(src, checkFile(src));
        const image = await checked.get(src);
        if (image && image.width !== Math.min(target, entry.width)) fail(`sizes.${target} has unexpected width ${image.width}.`);
        if (target === 2048 && image && (image.width !== entry.width || image.height !== entry.height)) fail('Largest rendition dimensions differ from the manifest.');
      } catch (error) { fail(`sizes.${target}: ${error.message}`); }
    }
    // Validate src separately even when an edited manifest points it elsewhere.
    if (entry.src !== entry.sizes?.['2048']) {
      try { await checkFile(entry.src); } catch (error) { fail(`src: ${error.message}`); }
    }
  }
  if (errors.length) { console.error(errors.join('\n')); process.exitCode = 1; }
  console.log(`Checked ${entries.length} entries (${published} published, ${entries.length - published} drafts): ${errors.length} errors.`);
}
main().catch((error) => { console.error(`Photo validation failed: ${error.message}`); process.exitCode = 1; });
