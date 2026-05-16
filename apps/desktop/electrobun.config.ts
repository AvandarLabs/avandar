import type { ElectrobunConfig } from "electrobun";

const config: ElectrobunConfig = {
  app: {
    name: "Avandar",
    identifier: "com.avandarlabs.desktop",
    version: "0.0.0",
  },
  build: {
    bun: {
      entrypoint: "main/index.ts",
    },
    views: {
      preload: {
        entrypoint: "preload/index.ts",
      },
    },
    copy: {
      "../../dist": "web",
    },
    buildFolder: "build",
    artifactFolder: "bundle",
    targets: "macos-arm64,macos-x64",
  },
  runtime: {
    exitOnLastWindowClosed: true,
  },
};

export default config;
