import type { NextConfig } from "next";
import { dirname } from "path";
import { fileURLToPath } from "url";

const nextConfig: NextConfig = {
  // Hay lockfiles en la raíz y en frontend/; fijamos la raíz para que
  // Turbopack no la infiera mal.
  turbopack: {
    root: dirname(fileURLToPath(import.meta.url)),
  },
};

export default nextConfig;
