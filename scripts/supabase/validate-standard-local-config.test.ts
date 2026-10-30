import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";
import type { SpawnSyncReturns } from "node:child_process";

const VALIDATOR_PATH = "scripts/supabase/validate-standard-local-config.sh";

const STANDARD_CONFIG = `project_id = "avandar"

[api]
port = 54321

[db]
port = 54322
shadow_port = 54320

[db.pooler]
port = 54329

[studio]
port = 54323

[inbucket]
port = 51634

[edge_runtime]
inspector_port = 8083

[analytics]
port = 54327
`;

function _runValidator(configContents: string): SpawnSyncReturns<string> {
  return spawnSync("bash", [VALIDATOR_PATH], {
    cwd: process.cwd(),
    encoding: "utf8",
    input: configContents,
  });
}

describe("validate-standard-local-config", () => {
  it("accepts the standard local Supabase configuration from stdin", () => {
    const result = _runValidator(STANDARD_CONFIG);

    expect(result.status).toBe(0);
    expect(result.stderr).toBe("");
  });

  it("rejects a changed root project id with restoration guidance", () => {
    const result = _runValidator(
      STANDARD_CONFIG.replace('project_id = "avandar"', 'project_id = "temp"'),
    );

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("project_id must be avandar");
    expect(result.stderr).toContain("ava supabase restore");
  });

  it("indents the warning without ANSI escapes when stderr is redirected", () => {
    const result = _runValidator(
      STANDARD_CONFIG.replace('project_id = "avandar"', 'project_id = "temp"'),
    );

    expect(result.status).toBe(1);
    expect(result.stderr).toContain(
      "\n  ⚠️ Run 'ava supabase restore', stage the restored files, and retry.\n",
    );
    expect(result.stderr).not.toContain("\u001b");
    expect(result.stdout).toBe("");
  });

  it("prints the indented warning in bold yellow when stderr is a terminal", () => {
    const result = spawnSync(
      "python3",
      [
        "-c",
        `import os, pty, subprocess, sys
terminal, stderr = pty.openpty()
result = subprocess.run(
    ["bash", sys.argv[1]], input=sys.stdin.buffer.read(), stderr=stderr,
)
sys.stdout.buffer.write(os.read(terminal, 4096))
os.close(stderr)
os.close(terminal)
sys.exit(result.returncode)`,
        VALIDATOR_PATH,
      ],
      {
        cwd: process.cwd(),
        encoding: "utf8",
        input: STANDARD_CONFIG.replace(
          'project_id = "avandar"',
          'project_id = "temp"',
        ),
        timeout: 5_000,
      },
    );

    expect(result.stderr).toBe("");
    expect(result.status).toBe(1);
    expect(result.stdout.replaceAll("\r\n", "\n")).toContain(
      "\n  \u001b[1;33m⚠️ Run 'ava supabase restore', stage the restored files, and retry.\u001b[0m\n",
    );
  });

  it.each([
    ["api.port", "port = 54321", "port = 55321"],
    ["db.port", "port = 54322", "port = 55322"],
    ["db.shadow_port", "shadow_port = 54320", "shadow_port = 55320"],
    ["db.pooler.port", "port = 54329", "port = 55329"],
    ["studio.port", "port = 54323", "port = 55323"],
    ["inbucket.port", "port = 51634", "port = 52634"],
    [
      "edge_runtime.inspector_port",
      "inspector_port = 8083",
      "inspector_port = 9083",
    ],
    ["analytics.port", "port = 54327", "port = 55327"],
  ])("rejects a changed %s", (key, currentValue, changedValue) => {
    const result = _runValidator(
      STANDARD_CONFIG.replace(currentValue, changedValue),
    );

    expect(result.status).toBe(1);
    expect(result.stderr).toContain(`${key} must be`);
    expect(result.stderr).toContain("ava supabase restore");
  });

  it("ignores comments and remote configuration values", () => {
    const configWithIgnoredValues = `${STANDARD_CONFIG}
# project_id = "temp"
# port = 55321

[remotes.production]
project_id = "remote-project"

[remotes.production.api]
port = 65321
`;
    const result = _runValidator(configWithIgnoredValues);

    expect(result.status).toBe(0);
  });
});
