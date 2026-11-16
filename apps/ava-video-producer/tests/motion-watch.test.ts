import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { setTimeout as pause } from "node:timers/promises";
import {
  type ShowcaseSiteWatcher,
  watchShowcaseSite,
} from "../scripts/showcase/watchShowcaseSite";
import { buildStockContracts } from "../scripts/stock/buildStockContracts/buildStockContracts";
import { createShowcaseFixture } from "./createShowcaseFixture";

/** Every built script, joined, so a test can search the emitted copy. */
async function _readBuiltScripts(root: string): Promise<string> {
  const site = path.join(root, "out/showcase/browser");
  const files = (await fs.readdir(site, { recursive: true })).filter(
    (filename) => filename.endsWith(".js"),
  );
  const scripts = await Promise.all(
    files.map((filename) => fs.readFile(path.join(site, filename), "utf8")),
  );
  return scripts.join("\n");
}

function _readDecisionForkPrompt(
  generation: Awaited<ReturnType<typeof buildStockContracts>>,
): string {
  const request = generation.stockRequestSchema.parse({
    preset: "decision-fork",
  });
  if (request.preset !== "decision-fork") {
    throw new Error("Expected the decision-fork request.");
  }
  return request.input.prompt;
}

async function _editDecisionForkPrompt(root: string): Promise<void> {
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
}

test("actual showcase watch refreshes edited stock defaults once without a restart or rebuild loop", async () => {
  const root = await createShowcaseFixture("atlas-copy-watch-");
  let watcher: ShowcaseSiteWatcher | undefined;
  try {
    let builds = 0;
    let notify: (() => void) | undefined;
    watcher = await watchShowcaseSite({
      appRoot: root,
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
    await _editDecisionForkPrompt(root);
    await Promise.race([
      completed,
      pause(60_000, undefined, { ref: false }).then(() => {
        throw new Error("Showcase watch did not rebuild");
      }),
    ]);
    notify = undefined;
    assert.match(
      await _readBuiltScripts(root),
      /Fresh copy through the actual watcher/,
    );
    const refreshed = await buildStockContracts(root);
    assert.equal(
      _readDecisionForkPrompt(refreshed),
      "Fresh copy through the actual watcher",
    );
    assert.equal(
      _readDecisionForkPrompt(first),
      "Where does the fictional sketch belong?",
    );
    const settledBuilds = builds;
    await pause(1200);
    assert.equal(
      builds,
      settledBuilds,
      "A settled build must not repeatedly trigger the watcher",
    );
    await release();
  } finally {
    await watcher?.dispose();
    await fs.rm(root, { recursive: true, force: true });
  }
});
