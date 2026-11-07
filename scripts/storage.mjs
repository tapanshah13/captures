import { mkdir, writeFile, rename } from 'node:fs/promises';
import path from 'node:path';
import { root } from './photo-manifest.mjs';

// Only this adapter knows where generated images live.
export async function createStorage(mode = process.env.STORAGE ?? 'local') {
  if (mode === 'local') {
    const directory = path.join(root, 'public/captures');
    return {
      async put(filename, data) {
        if (!/^[a-z0-9-]+\.webp$/.test(filename)) throw new Error(`Unsafe output filename: ${filename}`);
        await mkdir(directory, { recursive: true });
        const destination = path.join(directory, filename);
        const temporary = `${destination}.${process.pid}.tmp`;
        await writeFile(temporary, data);
        await rename(temporary, destination);
        return `/captures/${filename}`;
      },
    };
  }
  if (mode !== 'blob') throw new Error(`Unknown STORAGE=${mode}; use local or blob.`);
  if (!process.env.BLOB_READ_WRITE_TOKEN) throw new Error('STORAGE=blob requires BLOB_READ_WRITE_TOKEN. Use STORAGE=local for local files.');
  let put;
  try { ({ put } = await import('@vercel/blob')); }
  catch (error) {
    if (error.code === 'ERR_MODULE_NOT_FOUND') throw new Error('Blob storage needs @vercel/blob, which is not installed. Add it when ready to switch storage, or use STORAGE=local.');
    throw error;
  }
  return {
    async put(filename, data) {
      const blob = await put(`captures/${filename}`, data, {
        access: 'public', contentType: 'image/webp', addRandomSuffix: true,
        token: process.env.BLOB_READ_WRITE_TOKEN,
      });
      return blob.url;
    },
  };
}
