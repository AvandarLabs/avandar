import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import type { SpawnSyncReturns } from "node:child_process";

const GUARD_PATH = "scripts/supabase/require-local-supabase.sh";

let temporaryRoots: string[] = [];

afterEach(() => {
  temporaryRoots.forEach((root) => {
    rmSync(root, { recursive: true, force: true });
  });
  temporaryRoots = [];
});

function _runGuard(envContents: string | undefined): SpawnSyncReturns<string> {
  const projectRoot = mkdtempSync(path.join(os.tmpdir(), "require-local-"));
  temporaryRoots = [...temporaryRoots, projectRoot];
  if (envContents !== undefined) {
    writeFileSync(path.join(projectRoot, ".env.development"), envContents);
  }
  return spawnSync("bash", [GUARD_PATH, projectRoot], {
    cwd: process.cwd(),
    encoding: "utf8",
    env: { ...process.env, AVA_SUPABASE_REMOTE_PROJECT_ID: "" },
  });
}

describe("require-local-supabase", () => {
  it("passes for a worktree on a local Supabase", () => {
    const result = _runGuard("SUPABASE_PROJECT_ID=feat-x\n");

    expect(result.status).toBe(0);
    expect(result.stderr).toBe("");
  });

  it("passes for a worktree with no .env.development", () => {
    expect(_runGuard(undefined).status).toBe(0);
  });

  it("refuses a worktree switched to a hosted project", () => {
    const result = _runGuard("AVA_SUPABASE_REMOTE_PROJECT_ID=abcdefghij\n");

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("abcdefghij");
    expect(result.stderr).toContain("ava supabase restore");
  });
});
