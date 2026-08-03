import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Standalone only for Docker (Linux). Native Windows hits EPERM symlink errors.
  ...(process.env.BUILD_STANDALONE === "1" ? { output: "standalone" } : {}),
  transpilePackages: ["@idx/modular-rag-sdk", "@idx/voice-input", "@idx/i18n"],
};

export default nextConfig;
