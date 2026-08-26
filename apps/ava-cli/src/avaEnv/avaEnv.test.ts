import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  getAvaEnvTargetFromArgv,
  getLoadedAvaEnvFile,
  getLoadedAvaEnvTarget,
  loadAvaEnv,
  requireEnv,
} from "@ava-cli/avaEnv/avaEnv";
import { afterEach, describe, expect, it } from "vitest";

/** Writes an env file into a throwaway directory and returns its path. */
function _writeEnvFile(contents: string): string {
  const directory = mkdtempSync(path.join(tmpdir(), "ava-env-"));
  const filePath = path.join(directory, ".env.test");
  writeFileSync(filePath, contents);
  return filePath;
}

afterEach(() => {
  // Every test that loads a non-local target leaves the module pointed there,
  // so put it back for the ones that assert the default.
  loadAvaEnv({
    target: "local",
    envFilePath: _writeEnvFile("AVA_ENV_TEST_RESET=1\n"),
  });
  delete process.env.AVA_ENV_TEST_VALUE;
  delete process.env.AVA_ENV_TEST_RESET;
});

describe("getAvaEnvTargetFromArgv", () => {
  it("is local when neither flag is passed", () => {
    expect(getAvaEnvTargetFromArgv(["supabase", "status"])).toBe("local");
  });

  it("reads --staging and --prod wherever they appear", () => {
    expect(getAvaEnvTargetFromArgv(["supabase", "run", "--staging"])).toBe(
      "staging",
    );
    expect(getAvaEnvTargetFromArgv(["--prod", "supabase", "run"])).toBe(
      "production",
    );
  });

  it("refuses both at once rather than picking one", () => {
    expect(() => {
      return getAvaEnvTargetFromArgv(["supabase", "run", "--staging", "--prod"]);
    }).toThrow(/at most one of --staging and --prod/);
  });

  // A substring must not count: `--production` is not a flag this CLI has, and
  // silently treating it as `--prod` would point a run somewhere it did not ask
  // for.
  it("matches flags exactly", () => {
    expect(getAvaEnvTargetFromArgv(["--prodding"])).toBe("local");
    expect(getAvaEnvTargetFromArgv(["--no-staging"])).toBe("local");
  });
});

describe("loadAvaEnv", () => {
  it("loads the file and records the target", () => {
    loadAvaEnv({
      target: "staging",
      envFilePath: _writeEnvFile("AVA_ENV_TEST_VALUE=from-staging\n"),
    });

    expect(process.env.AVA_ENV_TEST_VALUE).toBe("from-staging");
    expect(getLoadedAvaEnvTarget()).toBe("staging");
    expect(getLoadedAvaEnvFile()).toBe(".env.staging");
  });

  it("throws naming the file when it cannot be read", () => {
    expect(() => {
      return loadAvaEnv({
        target: "production",
        envFilePath: path.join(tmpdir(), "definitely-absent", ".env.nope"),
      });
    }).toThrow(/Failed to load \.env\.production/);
  });

  // The whole point of the module: a value the target's file does not define
  // must not survive from a previously loaded environment.
  it("does not merge a previous target's values", () => {
    loadAvaEnv({
      target: "local",
      envFilePath: _writeEnvFile("AVA_ENV_TEST_VALUE=from-development\n"),
    });
    expect(process.env.AVA_ENV_TEST_VALUE).toBe("from-development");

    // A fresh process would not have the development value at all. Simulate
    // that, then load a staging file that omits the key.
    delete process.env.AVA_ENV_TEST_VALUE;
    loadAvaEnv({
      target: "staging",
      envFilePath: _writeEnvFile("AVA_ENV_OTHER_KEY=1\n"),
    });

    expect(process.env.AVA_ENV_TEST_VALUE).toBeUndefined();
    expect(() => {
      return requireEnv("AVA_ENV_TEST_VALUE");
    }).toThrow(/not set in \.env\.staging/);
  });

  it("lets the loaded file win over an ambient shell value", () => {
    process.env.AVA_ENV_TEST_VALUE = "from-shell";

    loadAvaEnv({
      target: "local",
      envFilePath: _writeEnvFile("AVA_ENV_TEST_VALUE=from-file\n"),
    });

    expect(process.env.AVA_ENV_TEST_VALUE).toBe("from-file");
  });
});

describe("requireEnv", () => {
  it("returns the value", () => {
    process.env.AVA_ENV_TEST_VALUE = "a-value";

    expect(requireEnv("AVA_ENV_TEST_VALUE")).toBe("a-value");
  });

  it("defaults its message to .env.development", () => {
    expect(() => {
      return requireEnv("AVA_ENV_TEST_VALUE");
    }).toThrow("AVA_ENV_TEST_VALUE is not set in .env.development");
  });

  it("names the loaded file, not the default one", () => {
    loadAvaEnv({
      target: "production",
      envFilePath: _writeEnvFile("AVA_ENV_OTHER_KEY=1\n"),
    });

    expect(() => {
      return requireEnv("AVA_ENV_TEST_VALUE");
    }).toThrow("AVA_ENV_TEST_VALUE is not set in .env.production");
  });

  // A key present but blank is what an unfilled env file line looks like, and
  // it is not a usable value.
  it("treats an empty or whitespace value as missing", () => {
    process.env.AVA_ENV_TEST_VALUE = "   ";

    expect(() => {
      return requireEnv("AVA_ENV_TEST_VALUE");
    }).toThrow(/not set in/);
  });

  it("trims a padded value", () => {
    process.env.AVA_ENV_TEST_VALUE = "  padded  ";

    expect(requireEnv("AVA_ENV_TEST_VALUE")).toBe("padded");
  });
});
