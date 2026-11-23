import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { pathToFileURL } from "node:url";
import { promisify } from "node:util";
import { createRealTempDirectory } from "../../../tests/createRealTempDirectory";
import { LicenseFixtures } from "../../../tests/LicenseFixtures";
import { linkAppDependencies } from "../../../tests/linkAppDependencies";
import { SHOWCASE_PAGES } from "../makeShowcaseViteConfigFromAppRoot";

/** Showcase pages whose Motion Atlas entry does not compile. */
async function _createFailedBuildFixture(root: string): Promise<void> {
  await linkAppDependencies(root);
  await fs.writeFile(
    path.join(root, "test-license.env"),
    LicenseFixtures.makeFixtureFromDirectory(),
  );
  await fs.mkdir(path.join(root, "showcase"), { recursive: true });
  await fs.mkdir(path.join(root, "scripts"), { recursive: true });
  await fs.mkdir(path.join(root, "src/gallery"), { recursive: true });
  // Isolate the watcher lifecycle from reading the Avandar theme.
  await fs.writeFile(
    path.join(root, "scripts/readTheme.ts"),
    "process.stdout.write(JSON.stringify({ primary: [], neutral: [] }));",
  );
  await Promise.all(
    SHOWCASE_PAGES.map((page) => {
      return fs.writeFile(
        path.join(root, "showcase", `${page}.html`),
        `<!doctype html><script type="module" src="./${page}.ts"></script>`,
      );
    }),
  );
  await Promise.all(
    SHOWCASE_PAGES.map((page) => {
      return fs.writeFile(
        path.join(root, "showcase", `${page}.ts`),
        page === "motion" ? "export const =" : "export {};",
      );
    }),
  );
}

test("a failed first showcase build closes its watcher so the process exits", async () => {
  const root = await createRealTempDirectory("showcase-build-failure-");
  try {
    await _createFailedBuildFixture(root);
    const entry = pathToFileURL(
      path.resolve("scripts/showcase/watchShowcaseSite/watchShowcaseSite.ts"),
    ).href;
    const script = `
      import assert from "node:assert/strict";
      const { watchShowcaseSite } = await import(${JSON.stringify(entry)});
      await assert.rejects(
        watchShowcaseSite({ appRoot: ${JSON.stringify(root)}, onBuilt: async () => {} }),
        /motion\\.ts:\\d+:\\d+: ERROR: Expected identifier/,
      );
      process.stdout.write("initial build rejected");
    `;
    const { stdout } = await promisify(execFile)(
      process.execPath,
      ["--import", "tsx", "--input-type=module", "--eval", script],
      {
        cwd: root,
        env: {
          ...LicenseFixtures.licenseTestEnvironment(
            path.join(root, "test-license.env"),
          ),
          // The root has no tsconfig, so tsx needs the app's `@utils` paths.
          TSX_TSCONFIG_PATH: path.resolve("tsconfig.json"),
        },
        timeout: 20_000,
      },
    );
    assert.equal(stdout, "initial build rejected");
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});
