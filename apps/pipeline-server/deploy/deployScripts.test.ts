import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const DEPLOY_DIR = fileURLToPath(new URL(".", import.meta.url));
const RENDER_SCRIPT = join(DEPLOY_DIR, "render-fly-config.sh");
const DEPLOY_SCRIPT = join(DEPLOY_DIR, "deploy-pipeline-server.sh");

const FLY_ENV = {
  FLY_APP_NAME: "example-pipeline-server",
  FLY_PRIMARY_REGION: "ord",
  FLY_VM_SIZE: "performance-1x",
  FLY_VM_MEMORY: "2gb",
  FLY_VOLUME_NAME: "pipeline_server_data",
  AVA_DUCKDB_MEMORY_LIMIT: "1GB",
};

function _run(script: string, args: string[], env: Record<string, string>) {
  return spawnSync(script, args, {
    encoding: "utf8",
    env: { PATH: process.env.PATH ?? "", NO_COLOR: "1", ...env },
  });
}

describe("render-fly-config.sh", () => {
  it("fills every placeholder from the environment", () => {
    const result = _run(RENDER_SCRIPT, [], FLY_ENV);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('app = "example-pipeline-server"');
    expect(result.stdout).toContain('primary_region = "ord"');
    expect(result.stdout).toContain('size = "performance-1x"');
    expect(result.stdout).toContain('source = "pipeline_server_data"');
    expect(result.stdout).not.toContain("${");
  });

  it("fails, naming the variable, when one is missing", () => {
    const { FLY_APP_NAME: _omitted, ...env } = FLY_ENV;

    const result = _run(RENDER_SCRIPT, [], env);

    expect(result.status).not.toBe(0);
    expect(result.stdout).toBe("");
    expect(result.stderr).toContain("❌");
    expect(result.stderr).toContain("FLY_APP_NAME");
    expect(result.stderr).toMatch(/\n {2}⚠️ /);
  });

  it("prints help without reading the environment", () => {
    const result = _run(RENDER_SCRIPT, ["--help"], {});

    expect(result.status).toBe(0);
    expect(result.stdout).toMatch(/Usage:/);
  });

  it("keeps no deployment's details in the template", () => {
    const template = readFileSync(
      join(DEPLOY_DIR, "fly.toml.template"),
      "utf8",
    );

    expect(template).not.toMatch(/avandar/i);
  });
});

describe("deploy-pipeline-server.sh", () => {
  it("prints help without reading the env file or calling fly", () => {
    const result = _run(DEPLOY_SCRIPT, ["-h"], {});

    expect(result.status).toBe(0);
    expect(result.stdout).toMatch(/Usage:/);
    expect(result.stdout).toContain(".env.pipeline-server.prod");
  });

  it("fails with a recovery hint when the env file is missing", () => {
    const emptyDir = mkdtempSync(join(tmpdir(), "deploy-"));

    const result = _run(DEPLOY_SCRIPT, [], {
      AVA_PIPELINE_SERVER_ENV_FILE: join(emptyDir, ".env.pipeline-server.prod"),
    });

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("❌");
    expect(result.stderr).toMatch(
      /\n {2}⚠️ .*\.env\.pipeline-server\.prod\.example/,
    );
  });

  it("refuses an unknown argument with its usage", () => {
    const result = _run(DEPLOY_SCRIPT, ["--force"], {});

    expect(result.status).not.toBe(0);
    expect(result.stderr).toMatch(/Usage:/);
  });

  it("stops before deploying when fly is not signed in", () => {
    const emptyDir = mkdtempSync(join(tmpdir(), "deploy-"));
    const envFile = join(emptyDir, ".env.pipeline-server.prod");
    writeFileSync(
      envFile,
      Object.entries(FLY_ENV)
        .map(([name, value]) => {
          return `${name}=${value}`;
        })
        .join("\n"),
    );
    const fakeBin = mkdtempSync(join(tmpdir(), "fake-fly-"));
    writeFileSync(
      join(fakeBin, "fly"),
      '#!/bin/sh\nif [ "$1" = "auth" ]; then exit 1; fi\necho "deployed" > "$FAKE_FLY_LOG"\n',
      { mode: 0o755 },
    );
    const log = join(emptyDir, "fly.log");

    const result = _run(DEPLOY_SCRIPT, [], {
      AVA_PIPELINE_SERVER_ENV_FILE: envFile,
      PATH: `${fakeBin}:${process.env.PATH ?? ""}`,
      FAKE_FLY_LOG: log,
    });

    expect(result.status).not.toBe(0);
    expect(result.stderr).toMatch(/\n {2}⚠️ .*fly auth login/);
    expect(() => {
      return readFileSync(log);
    }).toThrow();
  });
});
