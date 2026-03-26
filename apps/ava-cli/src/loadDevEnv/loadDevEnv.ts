import { existsSync } from "node:fs";
import path from "node:path";
import * as dotenv from "dotenv";

type DotenvConfigResult = Readonly<{
  error?: unknown;
}>;

function _getDefaultEnvFilePath(): string {
  let currentDirectoryPath: string = process.cwd();

  // climb up the directory tree until we find a .env.development
  while (true) {
    const envFilePath: string = path.join(
      currentDirectoryPath,
      ".env.development",
    );

    if (existsSync(envFilePath)) {
      return envFilePath;
    }

    const parentDirectoryPath: string = path.dirname(currentDirectoryPath);
    if (parentDirectoryPath === currentDirectoryPath) {
      return path.join(process.cwd(), ".env.development");
    }

    currentDirectoryPath = parentDirectoryPath;
  }
}

export function loadDevEnv(options: { envFilePath?: string } = {}): void {
  const result = dotenv.config({
    path: options.envFilePath ?? _getDefaultEnvFilePath(),
    quiet: true,
    override: true,
  }) as DotenvConfigResult;

  if (result.error !== undefined) {
    throw new Error(
      "Failed to load .env.development. Run this command from the repo root " +
        "so we can load the environment variables.",
    );
  }
}
