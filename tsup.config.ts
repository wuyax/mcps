import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    index: "src/index.ts",
    cli: "src/cli.ts",
  },
  format: ["cjs", "esm"],
  dts: true,
  clean: true,
  sourcemap: false,
  target: "node22",
  env: {
    VERSION: process.env.npm_package_version ?? "0.1.0",
  },
});
