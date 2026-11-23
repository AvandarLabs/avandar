import { cpSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { inject } from "vitest";

declare module "vitest" {
  /** Packed public packages shared with integration test workers. */
  export interface ProvidedContext {
    publicPackages: string;
  }
}

/**
 * Installs the public packages prepared by global setup into a directory.
 * Use it, for example, to prepare an isolated consumer for an integration test.
 */
export function installPublicPackages({
  directory,
  names,
}: Readonly<{ directory: string; names: readonly string[] }>): void {
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
