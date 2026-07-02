import * as esbuild from "esbuild";

await esbuild.build({
  entryPoints: {
    "db/bootstrap": "src/db/bootstrap.ts",
    index: "src/index.ts",
  },
  outdir: "dist",
  bundle: true,
  platform: "node",
  target: "node20",
  format: "esm",
  packages: "external",
  sourcemap: true,
});