import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it, vi } from "vitest";
import { loadDevEnv } from "./loadDevEnv";

describe("loadDevEnv", () => {
  const thisDirectoryPath: string = path.dirname(
    fileURLToPath(import.meta.url)
  );
  const repoRootPath: string = path.resolve(thisDirectoryPath, "../../..");
  const originalPipelineServerSecret: string | undefined =
    process.env.AVA_PIPELINE_SERVER_SECRET;

  afterEach(() => {
    vi.restoreAllMocks();

    if (originalPipelineServerSecret === undefined) {
      delete process.env.AVA_PIPELINE_SERVER_SECRET;
      return;
    }

    process.env.AVA_PIPELINE_SERVER_SECRET = originalPipelineServerSecret;
  });

  it("overrides pre-existing environment variables with .env.development values", () => {
    const tempDirectoryPath: string = fs.mkdtempSync(
      path.join(os.tmpdir(), "loadDevEnv-"),
    );
    const envFilePath: string = path.join(tempDirectoryPath, ".env.fixture");
    const expectedSecret = "fixture-pipeline-secret";

    fs.writeFileSync(
      envFilePath,
      `AVA_PIPELINE_SERVER_SECRET=${expectedSecret}\n`,
      "utf8",
    );

    process.env.AVA_PIPELINE_SERVER_SECRET = "stale-secret";

    try {
      loadDevEnv({ envFilePath });
      expect(process.env.AVA_PIPELINE_SERVER_SECRET).toBe(expectedSecret);
    } finally {
      fs.rmSync(tempDirectoryPath, { recursive: true, force: true });
    }
  });

  it("throws a friendly error when .env.development cannot be loaded", () => {
    expect(() => {
      loadDevEnv({
        envFilePath: path.join(repoRootPath, ".env.missing"),
      });
    }).toThrow(
      "Failed to load .env.development. Run this command from the repo root so we can load the environment variables.",
    );
  });
});
