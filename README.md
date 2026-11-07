This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Adding photos

1. Copy `.jpg`, `.jpeg`, `.png`, `.heic`, or `.webp` files into `photos/originals/` (create the directory if needed; subfolders are ignored).
2. Run `pnpm photos`. The importer creates metadata-free, auto-rotated sRGB WebPs at up to 640, 1280, and 2048px plus an embedded blur placeholder. Originals and generated files stay local and are gitignored. HEIC requires support in your installed sharp/libvips build; export a JPEG if decoding fails.
3. Edit `src/data/photos.json`: replace `TODO` in title, place, story, roll, and date if missing; choose roll IDs from `src/data/captures.ts`, then set collections and favorite. A title of exactly `TODO` keeps an entry unpublished. Run `pnpm check:photos` after editing: all entries need files and valid roll IDs, and published entries must contain no TODO values.
4. Refresh the site. An empty manifest uses sample photos; a manifest containing only drafts shows an empty gallery.

`pnpm photos --force` regenerates entries matched by SHA-256, refreshing only hash, src, sizes, width, height, blurDataURL, and exif. Slugs and all editorial fields (including date) are preserved. Renamed identical files are skipped; changed file contents create a new entry with a unique slug. Width suffixes are target sizes: smaller originals are never enlarged. EXIF dates retain their timezone offset when supplied, otherwise local ISO wall time; a missing date is `TODO`. GPS and other location-coordinate metadata are never copied.

Storage defaults to `STORAGE=local`. Later, add `@vercel/blob`, set `BLOB_READ_WRITE_TOKEN`, and run `STORAGE=blob pnpm photos --force` to replace local URLs with public Blob URLs; no component changes are needed. Blob imports create new URLs and leave old blobs untouched. `pnpm check:photos` checks local files without network access; Blob URLs are checked with HEAD requests. No deployment is part of this pipeline.
