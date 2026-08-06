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
      // Bundle the generated SQLite migrations alongside the app so the
      // production main process can apply them on first launch. See
      // `apps/desktop/main/config/migrationsDir.ts`.
      "./migrations": "migrations",
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
