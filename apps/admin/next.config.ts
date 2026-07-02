import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@idx/i18n"],
  // Standalone output is enabled only for Docker builds (Linux).
  // On Windows, pnpm + Next standalone can hit EPERM symlink errors.
  // Set BUILD_STANDALONE=1 in Dockerfile build.
  ...(process.env.BUILD_STANDALONE === "1" ? { output: "standalone" } : {}),
};

export default nextConfig;
