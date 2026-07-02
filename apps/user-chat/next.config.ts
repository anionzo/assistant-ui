import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  transpilePackages: ["@idx/modular-rag-sdk", "@idx/voice-input", "@idx/i18n"],
};

export default nextConfig;
