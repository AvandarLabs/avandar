import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { setTimeout as pause } from "node:timers/promises";
import { pathToFileURL } from "node:url";
import { buildStockContracts } from "../scripts/stock/buildStockContracts/buildStockContracts";
import { buildLicenseFixture } from "./license-fixture";

async function _createWatchFixture(root: string) {
  await fs.symlink(
    path.resolve("node_modules"),
    path.join(root, "node_modules"),
  );
  await fs.writeFile(path.join(root, ".env.local"), buildLicenseFixture());
  await fs.writeFile(path.join(root, "package.json"), '{"type":"module"}');
  const files = [
    "scripts/buildAtlas",
    "scripts/yaml",
    "scripts/require-license.mjs",
    "scripts/lib/readLicense.mjs",
    "scripts/stock/buildStockMessages",
    "lingui.gallery.config.ts",
    "src/gallery",
    "src/continuity",
    "src/motion-components",
    "showcase/watch-films.js",
    "src/stock",
    "src/motion.ts",
    "showcase/download.js",
  ];
  await Promise.all(
    files.map(async (filename) => {
      const target = path.join(root, filename);
      await fs.mkdir(path.dirname(target), {
        recursive: true,
      });
      await fs.cp(filename, target, {
        recursive: true,
      });
    }),
  );
  await fs.writeFile(
    path.join(root, "scripts/read-theme.mjs"),
    'import fs from "node:fs"; process.stdout.write(fs.readFileSync(new URL("../src/gallery/theme-colors.json",import.meta.url),"utf8"));',
  );
}
test("actual buildAtlas watch refreshes translated defaults once without a restart or rebuild loop", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "atlas-copy-watch-"));
  let watcher:
    | {
        dispose: () => Promise<void>;
      }
    | undefined;
  try {
    await _createWatchFixture(root);
    const { buildAtlas } = await import(
      pathToFileURL(path.join(root, "scripts/buildAtlas/buildAtlas.mjs")).href
    );
    let builds = 0;
    let notify: (() => void) | undefined;
    watcher = await buildAtlas({
      watch: true,
      onBuilt: async () => {
        builds += 1;
        notify?.();
      },
    });
    const first = await buildStockContracts(root);
    const release = first.retain();
    const completed = new Promise<void>((resolve) => {
      notify = resolve;
    });
    const fixture = path.join(
      root,
      "src/stock/presets/DecisionFork/DecisionFork.fixtures.ts",
    );
    await fs.writeFile(
      fixture,
      (await fs.readFile(fixture, "utf8")).replace(
        "Where does the fictional sketch belong?",
        "Fresh copy through the actual watcher",
      ),
    );
    await Promise.race([
      completed,
      pause(15000, undefined, {
        ref: false,
      }).then(() => {
        throw new Error("Gallery watch did not rebuild");
      }),
    ]);
    notify = undefined;
    const javascript = await fs.readFile(
      path.join(root, "out/showcase/browser/motion-gallery.js"),
      "utf8",
    );
    assert.match(javascript, /Fresh copy through the actual watcher/);
    const refreshed = await buildStockContracts(root);
    assert.equal(
      (
        refreshed.stockRequestSchema.parse({
          preset: "decision-fork",
        }).input as {
          prompt: string;
        }
      ).prompt,
      "Fresh copy through the actual watcher",
    );
    assert.equal(
      (
        first.stockRequestSchema.parse({
          preset: "decision-fork",
        }).input as {
          prompt: string;
        }
      ).prompt,
      "Where does the fictional sketch belong?",
    );
    const messages = path.join(root, "src/stock/i18n/messages.en.generated.ts");
    const modified = (await fs.stat(messages)).mtimeMs;
    const settledBuilds = builds;
    await pause(1200);
    assert.equal(
      builds,
      settledBuilds,
      "Generated messages must not repeatedly trigger the watcher",
    );
    assert.equal((await fs.stat(messages)).mtimeMs, modified);
    await release();
  } finally {
    await watcher?.dispose();
    await fs.rm(root, {
      recursive: true,
      force: true,
    });
  }
});
