import { cpSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { inject } from "vitest";

declare module "vitest" {
  export interface ProvidedContext {
    publicPackages: string;
  }
}

/** Installs fresh public tarball contents owned by core's global setup. */
export function installPublicPackages(
  directory: string,
  names: readonly string[],
): void {
  const packed = inject("publicPackages");
  mkdirSync(join(directory, "node_modules/@avandar"), { recursive: true });
  names.forEach((name) => {
    const packageName = name === "core" ? "lint" : `lint-${name}`;
    cpSync(
      join(packed, name, "package"),
      join(directory, "node_modules/@avandar", packageName),
      { recursive: true },
    );
  });
}
