import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { ESLint } from "eslint";
import { describe, expect, it } from "vitest";

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

const PRODUCER_TEST = "apps/ava-video-producer/tests/avandar-scenes.test.ts";
const ADAPTER_SCREEN =
  "apps/ava-video-producer/avandar-adapter/ExplorerScreen/ExplorerScreen.tsx";

/**
 * Import-rule ids for the explorer adapter after a producer test file has
 * already been linted in this process.
 *
 * The pre-push hook lints every changed file in one ESLint run. A producer
 * test is included by `apps/ava-video-producer/tsconfig.tools.json`, which
 * sits next to the adapter and does not map `@/*`. The resolver then reuses
 * that cached project for adapter files.
 */
async function getAdapterImportRuleIds() {
  const eslint = new ESLint({ cwd: REPO_ROOT });
  await eslint.lintFiles([PRODUCER_TEST]);
  const [result] = await eslint.lintFiles([ADAPTER_SCREEN]);
  return result.messages
    .filter((message) => {
      return (
        message.ruleId === "import-x/no-unresolved" ||
        message.ruleId === "import-x/extensions"
      );
    })
    .map((message) => {
      return message.ruleId;
    });
}

describe("video producer adapter import resolution", () => {
  it("reports no unresolved or extension errors for adapter imports when a producer test is linted first", async () => {
    expect(await getAdapterImportRuleIds()).toEqual([]);
  }, 30_000);
});
