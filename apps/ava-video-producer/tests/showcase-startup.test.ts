import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
  buildLicenseFixture,
  LICENSE_FIXTURE,
  licenseTestEnvironment,
} from "./license-fixture";

test("an occupied showcase port exits with actionable guidance and no build errors", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "showcase-license-"));
  const keyFile = path.join(directory, ".env.local");
  await writeFile(keyFile, buildLicenseFixture());
  const occupied = createServer();
  occupied.listen(0, "127.0.0.1");
  await once(occupied, "listening");
  const address = occupied.address();
  assert.ok(address && typeof address !== "string");
  const child = spawn(
    process.execPath,
    ["--import", "tsx", "scripts/showcase/server.ts"],
    {
      cwd: fileURLToPath(new URL("../", import.meta.url)),
      env: { ...licenseTestEnvironment(keyFile), PORT: String(address.port) },
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  let output = "";
  child.stdout.on("data", (chunk) => {
    output += chunk;
  });
  child.stderr.on("data", (chunk) => {
    output += chunk;
  });
  const timeout = setTimeout(() => child.kill("SIGKILL"), 30_000);
  try {
    const [code, signal] = await once(child, "close");
    assert.equal(signal, null, output);
    assert.equal(code, 1, output);
    assert.match(output, /PORT=\d+ pnpm showcase/);
    assert.doesNotMatch(
      output,
      /\[WARNING\]|\[ERROR\]|Cannot rebuild|at Server\./,
    );
    const appRoot = fileURLToPath(new URL("../", import.meta.url));
    const bundles = await Promise.all(
      ["live-player.js", "motion-gallery.js", "product/product.js"].map(
        (filename) =>
          readFile(
            path.join(appRoot, "out/showcase/browser", filename),
            "utf8",
          ),
      ),
    );
    [...bundles, output].forEach((text) => {
      assert.ok(
        !text.includes(LICENSE_FIXTURE.privateKey),
        "Private key leaked",
      );
      assert.ok(
        !text.includes(LICENSE_FIXTURE.unrelatedSecret),
        "Unrelated dotenv secret leaked",
      );
    });
  } finally {
    clearTimeout(timeout);
    child.kill("SIGKILL");
    await new Promise<void>((resolve) => occupied.close(() => resolve()));
    await rm(directory, { recursive: true, force: true });
  }
});
