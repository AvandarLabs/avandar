import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { mkdtemp, writeFile } from "node:fs/promises";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { LicenseFixtures } from "../../../../tests/LicenseFixtures";

async function _startShowcaseWithOccupiedPort(): Promise<
  Readonly<{
    directory: string;
    occupied: ReturnType<typeof createServer>;
    child: ReturnType<typeof spawn> &
      Readonly<{
        stdout: NonNullable<ReturnType<typeof spawn>["stdout"]>;
        stderr: NonNullable<ReturnType<typeof spawn>["stderr"]>;
      }>;
  }>
> {
  const directory = await mkdtemp(path.join(tmpdir(), "showcase-license-"));
  const keyFile = path.join(directory, ".env.local");
  await writeFile(keyFile, LicenseFixtures.makeFixtureFromDirectory());
  const occupied = createServer();
  occupied.listen(0, "127.0.0.1");
  await once(occupied, "listening");
  const address = occupied.address();
  assert.ok(address && typeof address !== "string");
  const child = spawn(
    process.execPath,
    [
      "--import",
      "tsx",
      "--import",
      "./scripts/yaml/registerYaml.ts",
      "scripts/showcase/server/server.ts",
    ],
    {
      cwd: fileURLToPath(new URL("../../../../", import.meta.url)),
      env: {
        ...LicenseFixtures.licenseTestEnvironment(keyFile),
        PORT: String(address.port),
      },
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  return { directory, occupied, child };
}
/** A local showcase process fixture that encounters an occupied port. */
export const ShowcasePortFixture = {
  /** Starts a fixture process against an occupied loopback port. */
  startWithOccupiedPort: _startShowcaseWithOccupiedPort,
};
