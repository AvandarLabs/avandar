import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { AvaEnv, DEFAULT_ENV_NAME } from "@ava-cli/AvaEnv/AvaEnv";
import { afterEach, describe, expect, it } from "vitest";

/** Writes an env file into a throwaway directory and returns its path. */
function _writeEnvFile(contents: string): string {
  const directory = mkdtempSync(path.join(tmpdir(), "ava-env-"));
  const filePath = path.join(directory, ".env.test");
  writeFileSync(filePath, contents);
  return filePath;
}

afterEach(() => {
  // Every test that loads another env leaves the module pointed there, so put
  // it back for the ones that assert the default.
  AvaEnv.load({
    envName: DEFAULT_ENV_NAME,
    envFilePath: _writeEnvFile("AVA_ENV_TEST_RESET=1\n"),
  });
  delete process.env.AVA_ENV_TEST_VALUE;
  delete process.env.AVA_ENV_TEST_RESET;
});

describe("AvaEnv.getEnvNameFromArgv", () => {
  it("is development when --env is not passed", () => {
    expect(AvaEnv.getEnvNameFromArgv(["supabase", "status"])).toBe(
      "development",
    );
  });

  it("reads the name after --env wherever it appears", () => {
    expect(
      AvaEnv.getEnvNameFromArgv([
        "pipeline",
        "run",
        "socrata",
        "--local",
        "--env",
        "demo",
      ]),
    ).toBe("demo");
    expect(AvaEnv.getEnvNameFromArgv(["--env", "staging", "supabase"])).toBe(
      "staging",
    );
  });

  it("accepts any kebab-case name", () => {
    expect(AvaEnv.getEnvNameFromArgv(["--env", "demo-measles-2"])).toBe(
      "demo-measles-2",
    );
  });

  it("refuses --env without a name", () => {
    expect(() => {
      return AvaEnv.getEnvNameFromArgv(["pipeline", "run", "--env"]);
    }).toThrow(/--env needs an environment name/);
    expect(() => {
      return AvaEnv.getEnvNameFromArgv(["--env", "--local"]);
    }).toThrow(/--env needs an environment name/);
  });

  // The name becomes part of a file path, so anything but kebab-case could
  // reach outside the repo root or name a file that is not an env file.
  it("refuses a name that is not kebab-case", () => {
    ["../secrets", "Demo", "development.edge", "1demo"].forEach((envName) => {
      expect(() => {
        return AvaEnv.getEnvNameFromArgv(["--env", envName]);
      }).toThrow(/lowercase letters, digits, and hyphens/);
    });
  });

  it("refuses --env passed twice rather than picking one", () => {
    expect(() => {
      return AvaEnv.getEnvNameFromArgv(["--env", "staging", "--env", "demo"]);
    }).toThrow(/Pass --env at most once/);
  });

  // The argument parser never reads `--env=demo` as `--env`, so accepting it
  // here would load a file the rest of the CLI never saw requested.
  it("refuses --env=<name>, naming the two-word form", () => {
    expect(() => {
      return AvaEnv.getEnvNameFromArgv(["pipeline", "list", "--env=demo"]);
    }).toThrow(/--env demo/);
  });

  // A substring must not count: silently treating `--environment` as `--env`
  // would point a run somewhere it did not ask for.
  it("matches --env exactly", () => {
    expect(AvaEnv.getEnvNameFromArgv(["--environment", "demo"])).toBe(
      "development",
    );
    expect(AvaEnv.getEnvNameFromArgv(["--envy", "demo"])).toBe("development");
  });

  // The parser ignores an option nobody declared. A removed flag that went
  // quiet would run a command meant for production against development.
  it("refuses --staging and --prod, naming the --env that replaced them", () => {
    expect(() => {
      return AvaEnv.getEnvNameFromArgv(["supabase", "run", "--staging"]);
    }).toThrow(/--env staging/);
    expect(() => {
      return AvaEnv.getEnvNameFromArgv(["--prod", "supabase", "run"]);
    }).toThrow(/--env production/);
  });
});

describe("AvaEnv.load", () => {
  it("loads the file and records the env name", () => {
    AvaEnv.load({
      envName: "staging",
      envFilePath: _writeEnvFile("AVA_ENV_TEST_VALUE=from-staging\n"),
    });

    expect(process.env.AVA_ENV_TEST_VALUE).toBe("from-staging");
    expect(AvaEnv.getLoadedEnvName()).toBe("staging");
    expect(AvaEnv.getLoadedEnvFile()).toBe(".env.staging");
  });

  it("names the file after any env name", () => {
    AvaEnv.load({
      envName: "demo",
      envFilePath: _writeEnvFile("AVA_ENV_TEST_VALUE=from-demo\n"),
    });

    expect(AvaEnv.getLoadedEnvFile()).toBe(".env.demo");
  });

  it("throws naming the file when it cannot be read", () => {
    expect(() => {
      return AvaEnv.load({
        envName: "demo",
        envFilePath: path.join(tmpdir(), "definitely-absent", ".env.nope"),
      });
    }).toThrow(/Failed to load \.env\.demo/);
  });

  // The whole point of the module: a value the env's file does not define
  // must not survive from a previously loaded environment.
  it("does not merge a previous env's values", () => {
    AvaEnv.load({
      envName: DEFAULT_ENV_NAME,
      envFilePath: _writeEnvFile("AVA_ENV_TEST_VALUE=from-development\n"),
    });
    expect(process.env.AVA_ENV_TEST_VALUE).toBe("from-development");

    // A fresh process would not have the development value at all. Simulate
    // that, then load a staging file that omits the key.
    delete process.env.AVA_ENV_TEST_VALUE;
    AvaEnv.load({
      envName: "staging",
      envFilePath: _writeEnvFile("AVA_ENV_OTHER_KEY=1\n"),
    });

    expect(process.env.AVA_ENV_TEST_VALUE).toBeUndefined();
    expect(() => {
      return AvaEnv.requireVar("AVA_ENV_TEST_VALUE");
    }).toThrow(/not set in \.env\.staging/);
  });

  it("lets the loaded file win over an ambient shell value", () => {
    process.env.AVA_ENV_TEST_VALUE = "from-shell";

    AvaEnv.load({
      envName: DEFAULT_ENV_NAME,
      envFilePath: _writeEnvFile("AVA_ENV_TEST_VALUE=from-file\n"),
    });

    expect(process.env.AVA_ENV_TEST_VALUE).toBe("from-file");
  });
});

describe("AvaEnv.isLocal", () => {
  it("is true for the default development env", () => {
    expect(AvaEnv.isLocal()).toBe(true);
  });

  it("is false for any other env", () => {
    ["staging", "production", "demo"].forEach((envName) => {
      AvaEnv.load({
        envName,
        envFilePath: _writeEnvFile("AVA_ENV_OTHER_KEY=1\n"),
      });

      expect(AvaEnv.isLocal()).toBe(false);
    });
  });
});

describe("AvaEnv.requireVar", () => {
  it("returns the value", () => {
    process.env.AVA_ENV_TEST_VALUE = "a-value";

    expect(AvaEnv.requireVar("AVA_ENV_TEST_VALUE")).toBe("a-value");
  });

  it("defaults its message to .env.development", () => {
    expect(() => {
      return AvaEnv.requireVar("AVA_ENV_TEST_VALUE");
    }).toThrow("AVA_ENV_TEST_VALUE is not set in .env.development");
  });

  it("names the loaded file, not the default one", () => {
    AvaEnv.load({
      envName: "demo",
      envFilePath: _writeEnvFile("AVA_ENV_OTHER_KEY=1\n"),
    });

    expect(() => {
      return AvaEnv.requireVar("AVA_ENV_TEST_VALUE");
    }).toThrow("AVA_ENV_TEST_VALUE is not set in .env.demo");
  });

  // A key present but blank is what an unfilled env file line looks like, and
  // it is not a usable value.
  it("treats an empty or whitespace value as missing", () => {
    process.env.AVA_ENV_TEST_VALUE = "   ";

    expect(() => {
      return AvaEnv.requireVar("AVA_ENV_TEST_VALUE");
    }).toThrow(/not set in/);
  });

  it("trims a padded value", () => {
    process.env.AVA_ENV_TEST_VALUE = "  padded  ";

    expect(AvaEnv.requireVar("AVA_ENV_TEST_VALUE")).toBe("padded");
  });
});
