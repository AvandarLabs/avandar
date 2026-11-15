import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const OXLINT_BIN = resolve(REPO_ROOT, "node_modules", ".bin", "oxlint");

const PRODUCER_TESTS_DIR = "apps/ava-video-producer/tests";
const ADAPTER_DIR = "apps/ava-video-producer/avandar-adapter";

/**
 * Import-extension rule codes for adapter files when producer tests are
 * linted in the same oxlint run.
 *
 * `pnpm lint` and the pre-push hook lint many files in one oxlint run. The
 * producer tests are included by `apps/ava-video-producer/tsconfig.tools.json`,
 * which sits next to the adapter and does not map `@/*`. When a producer test
 * is resolved first, the resolver reuses that cached project for adapter
 * files. oxlint lints files on parallel threads, so a run of one producer
 * test and one adapter file hits this only some of the time. Linting both
 * directories hits it on every run.
 */
function getAdapterImportRuleCodes() {
  const result = spawnSync(
    OXLINT_BIN,
    ["--format", "json", PRODUCER_TESTS_DIR, ADAPTER_DIR],
    { cwd: REPO_ROOT, encoding: "utf8" },
  );
  const { diagnostics } = JSON.parse(result.stdout);
  return diagnostics
    .filter((diagnostic) => {
      return (
        diagnostic.filename.startsWith(`${ADAPTER_DIR}/`) &&
        diagnostic.code.endsWith("(extensions)")
      );
    })
    .map((diagnostic) => {
      return diagnostic.code;
    });
}

describe("video producer adapter import resolution", () => {
  it("reports no extension errors for adapter imports when producer tests are linted in the same run", () => {
    expect(getAdapterImportRuleCodes()).toEqual([]);
  }, 30_000);
});
