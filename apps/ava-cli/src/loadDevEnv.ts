import { existsSync } from "node:fs";
import path from "node:path";
import * as dotenv from "dotenv";

type DotenvConfigResult = Readonly<{
  error?: unknown;
}>;

type LoadDevEnvOptions = Readonly<{
  envFilePath?: string;
}>;

function _getDefaultEnvFilePath(): string {
  let currentDirectoryPath: string = process.cwd();

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

export function loadDevEnv(options: LoadDevEnvOptions = {}): void {
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
