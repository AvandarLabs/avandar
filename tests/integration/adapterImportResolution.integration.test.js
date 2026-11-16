import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { prop } from "@avandar/utils";
import { describe, expect, it } from "vitest";

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const OXLINT_BINARY = resolve(REPO_ROOT, "node_modules", ".bin", "oxlint");

const PRODUCER_TESTS_DIRECTORY = "apps/ava-video-producer/tests";
const ADAPTER_DIRECTORY = "apps/ava-video-producer/avandar-adapter";

/**
 * Import-extension rule codes that oxlint reports for adapter files when
 * producer tests are linted in the same oxlint run. An empty list means the
 * adapter resolves its `@/*` imports correctly in a batch lint.
 */
function getAdapterImportRuleCodes() {
  // `pnpm lint` and the pre-push hook lint many files in one oxlint run. The
  // producer tests are included by the producer's `tsconfig.tools.json`,
  // which sits next to the adapter and does not map `@/*`. When a producer
  // test is resolved first, the resolver reuses that cached project for
  // adapter files. oxlint lints files on parallel threads, so a run of one
  // producer test and one adapter file hits this only some of the time.
  // Linting both directories hits it on every run.
  const result = spawnSync(
    OXLINT_BINARY,
    ["--format", "json", PRODUCER_TESTS_DIRECTORY, ADAPTER_DIRECTORY],
    { cwd: REPO_ROOT, encoding: "utf8" },
  );
  const { diagnostics } = JSON.parse(result.stdout);
  return diagnostics
    .filter((diagnostic) => {
      return (
        diagnostic.filename.startsWith(`${ADAPTER_DIRECTORY}/`) &&
        diagnostic.code.endsWith("(extensions)")
      );
    })
    .map(prop("code"));
}

describe("video producer adapter import resolution", () => {
  it("reports no extension errors for adapter imports when producer tests are linted in the same run", () => {
    expect(getAdapterImportRuleCodes()).toEqual([]);
  }, 30_000);
});
