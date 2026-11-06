import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { enumerateProducerTests } from "./enumerateProducerTests";

test("discovery includes colocated producer tests and excludes unrelated or generated trees", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "producer-tests-"));
  const included = [
    "src/stock/Preset/Preset.test.ts",
    "avandar-adapter/OntologyScreen/ontologyStage.test.ts",
    "src/control/control.test.tsx",
    "scripts/showcase/api/api.test.ts",
    "scripts/testing/runner.test.mjs",
    "tests/stock.test.ts",
    "tests/helpers/check/check.test.ts",
    "showcase/player.test.mjs",
  ];
  const excluded = [
    "out/result.test.ts",
    "node_modules/lib/lib.test.ts",
    "src/node_modules/lib/lib.test.ts",
    "src/.ignored/hidden.test.ts",
    "tests/e2e/gallery.test.ts",
    "other/product.test.ts",
    "showcase/generated/player.test.mjs",
  ];
  try {
    await Promise.all(
      [...included, ...excluded].map(async (filename) => {
        await fs.mkdir(path.dirname(path.join(root, filename)), {
          recursive: true,
        });
        await fs.writeFile(path.join(root, filename), "");
      }),
    );
    assert.deepEqual(await enumerateProducerTests(root), [...included].sort());
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});
