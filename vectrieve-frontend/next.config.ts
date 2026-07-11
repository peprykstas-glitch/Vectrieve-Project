import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  output: "standalone",
  turbopack: {
    // Explicitly set workspace root to this frontend directory,
    // preventing Next.js from being confused by the root-level package-lock.json
    root: path.resolve(__dirname),
  },
};

export default nextConfig;
