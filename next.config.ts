import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: { deviceSizes: [640, 1280, 2048], imageSizes: [] },
  outputFileTracingIncludes: {
    "/opengraph-image": ["./src/assets/share/**/*"],
    "/share/trips/*": ["./src/assets/share/**/*"],
  },
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
