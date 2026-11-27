import { spawnSync } from "node:child_process";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterEach, expect, it } from "vitest";
import { runCli } from "../cliHelpers";
import type { CoverageReport } from "../coverageHelpers";

const ROOT: string = resolve(import.meta.dirname, "../../../../../..");
const directories: string[] = [];
const SAFE = [
  ["avlint-common-001", "standalone-body-prose", "function-body-line-comments"],
  ["avlint-common-002", "short-prose-jsdoc", "single-line-short-jsdoc"],
  ["avlint-ts-009", "one-to-one-module-key", "export-key-jsdoc"],
] as const;

afterEach(() => {
  directories.splice(0).forEach((directory) => {
    rmSync(directory, { recursive: true, force: true });
  });
});

function _createRepository(extension: string = "ts"): string {
  const directory = mkdtempSync(join(tmpdir(), "comment-coverage-"));
  directories.push(directory);
  ["node_modules", "eslint"].forEach((name) => {
    symlinkSync(join(ROOT, name), join(directory, name));
  });
  mkdirSync(join(directory, ".git"));
  mkdirSync(join(directory, "src"));
  writeFileSync(join(directory, ".gitignore"), "node_modules/\n");
  writeFileSync(
    join(directory, "package.json"),
    JSON.stringify({
      scripts: {
        lint: "oxlint --report-unused-disable-directives-severity=error .",
      },
    }),
  );
  writeFileSync(
    join(directory, ".oxlintrc.json"),
    readFileSync(join(ROOT, ".oxlintrc.json")),
  );
  writeFileSync(
    join(directory, "tsconfig.json"),
    JSON.stringify({
      compilerOptions: { strict: true, noEmit: true, module: "preserve" },
      include: ["src"],
    }),
  );
  writeFileSync(join(directory, `src/reviewed.${extension}`), "export {};\n");
  return directory;
}

async function _coverage({
  directory,
  paths = ["src/reviewed.ts"],
  status = 0,
}: Readonly<{
  directory: string;
  paths?: string[];
  status?: number;
}>): Promise<CoverageReport> {
  const stdout: string[] = [];
  const code = await runCli({
    args: ["coverage", ...paths, "--format", "json", "--no-prompt"],
    io: {
      cwd: directory,
      stdout: (value) => {
        stdout.push(value);
      },
      stderr: () => {},
    },
  });
  expect(code).toBe(status);
  return JSON.parse(stdout.join(""));
}

it("proves each safe comment capability using the complete root configuration", async () => {
  const directory = _createRepository();
  const result = await _coverage({ directory: directory });
  SAFE.forEach(([ruleId, capability]) => {
    expect(result.outcomes).toContainEqual(
      expect.objectContaining({
        ruleId,
        capability,
        state: "enforced",
        language: "typescript",
      }),
    );
    expect(result.outcomes).toContainEqual(
      expect.objectContaining({
        ruleId,
        capability: "unsupported-shapes",
        state: "fallback",
        recovery: expect.stringContaining("unsupported"),
      }),
    );
    expect(result.summaries).toContainEqual(
      expect.objectContaining({
        ruleId,
        state: "fallback",
      }),
    );
  });
  expect(readFileSync(join(directory, "src/reviewed.ts"), "utf8")).toBe(
    "export {};\n",
  );
});

it.each(["js", "tsx", "jsx"])(
  "proves only configured comment capabilities for %s",
  async (extension) => {
    const result = await _coverage({
      directory: _createRepository(extension),
      paths: [`src/reviewed.${extension}`],
    });
    SAFE.slice(0, 2).forEach(([ruleId, capability]) => {
      expect(result.outcomes).toContainEqual(
        expect.objectContaining({
          ruleId,
          capability,
          state: "enforced",
        }),
      );
    });
    if (extension !== "tsx") {
      expect(result.outcomes).toContainEqual(
        expect.objectContaining({
          ruleId: "avlint-ts-009",
          state: "not-applicable",
        }),
      );
    }
  },
);

it.each([
  "disabled",
  "source-disabled",
  "warning",
  "nested",
  "excluded",
  "missing-plugin",
  "malformed",
])("keeps exact-path comment proofs in fallback when %s", async (reason) => {
  const directory = _createRepository();
  const path = join(
    directory,
    reason === "nested" ? "src/.oxlintrc.json" : ".oxlintrc.json",
  );
  const config =
    reason === "nested"
      ? {
          jsPlugins: [
            {
              name: "avandar",
              specifier: "@avandar/lint-typescript/oxlint",
            },
          ],
        }
      : JSON.parse(readFileSync(path, "utf8"));
  if (reason === "source-disabled") {
    writeFileSync(
      join(directory, "src/reviewed.ts"),
      "/* eslint-disable avandar/function-body-line-comments, avandar/single-line-short-jsdoc, avandar/export-key-jsdoc */\nexport {};\n",
    );
  } else if (reason === "excluded") {
    config.ignorePatterns.push("src/reviewed.ts");
  } else if (reason === "missing-plugin") {
    config.jsPlugins = config.jsPlugins.filter((plugin: { name?: string }) => {
      return plugin.name !== "avandar";
    });
  } else {
    config.rules = Object.fromEntries(
      SAFE.map(([, , name]) => {
        return [`avandar/${name}`, reason === "warning" ? "warn" : "off"];
      }),
    );
    config.overrides = [];
  }
  writeFileSync(
    path,
    reason === "malformed" ? "{ invalid" : JSON.stringify(config),
  );
  const result = await _coverage({
    directory: directory,
    paths: undefined,
    status: ["missing-plugin", "malformed"].includes(reason) ? 1 : 0,
  });
  SAFE.forEach(([ruleId, capability]) => {
    expect(result.outcomes).toContainEqual(
      expect.objectContaining({
        ruleId,
        capability,
        state: "fallback",
      }),
    );
  });
});

it("keeps unsupported languages in fallback alongside proven TS files", async () => {
  const directory = _createRepository();
  writeFileSync(join(directory, "src/reviewed.rs"), "fn main() {}\n");
  const result = await _coverage({
    directory: directory,
    paths: ["src/reviewed.ts", "src/reviewed.rs"],
  });
  ["avlint-common-001", "avlint-common-002"].forEach((ruleId) => {
    expect(result.outcomes).toContainEqual(
      expect.objectContaining({
        ruleId,
        language: "rust",
        state: "fallback",
      }),
    );
  });
});

function _fix({
  source,
  extension = "ts",
}: Readonly<{ source: string; extension?: string }>): string {
  const directory = _createRepository(extension);
  const path = join(directory, `src/reviewed.${extension}`);
  writeFileSync(path, source);
  const run = () => {
    return spawnSync(
      join(ROOT, "node_modules/.bin/oxlint"),
      ["--fix", `src/reviewed.${extension}`],
      { cwd: directory, encoding: "utf8" },
    );
  };
  const first = run();
  expect(first.error, `${first.stdout}${first.stderr}`).toBeUndefined();
  expect(first.status, `${first.stdout}${first.stderr}`).toBe(0);
  const fixed = readFileSync(path, "utf8");
  const second = run();
  expect(second.status, `${second.stdout}${second.stderr}`).toBe(0);
  expect(readFileSync(path, "utf8")).toBe(fixed);
  return fixed;
}

it("safely composes root comment fixes through two ordinary fix passes", () => {
  expect(
    _fix({
      source:
        "function load(): void {\n  /** Read once. */\n  console.log(1);\n}\n/**\n * Read a value.\n */\nfunction _read(): void {}\nexport const Reader = {\n  read: _read,\n};\n",
    }),
  ).toBe(
    "function load(): void {\n  // Read once.\n  console.log(1);\n}\nfunction _read(): void {}\nexport const Reader = {\n  /** Read a value. */\n  read: _read,\n};\n",
  );
});

it.each([
  "function load(): void {\n  /** Nested value docs. */\n  // Implementation note.\n  const value = 1;\n}\n",
  "function load(): void {\n  /*! Copyright Example */\n  console.log(1);\n}\n",
  `/** ${"a".repeat(73)} */\nconst LIMIT = 1;\nexport const Reader = {\n  LIMIT,\n};\n`,
  `/**\n * ${"a".repeat(77)}\n */\nconst LIMIT = 1;\nexport const Reader = {\n  LIMIT,\n};\n`,
  `/**\n * ${"a".repeat(77)}\n */\nconst LIMIT = 1;\nexport const Reader = {\n\tLIMIT,\n};\n`,
])("review boundaries remain unchanged through root fixes %s", (source) => {
  expect(_fix({ source: source })).toBe(source);
});

it("review width boundary permits an exact 80-column single-line move", () => {
  const source = `/** ${"a".repeat(71)} */\nconst LIMIT = 1;\nexport const Reader = {\n  LIMIT,\n};\n`;
  expect(_fix({ source: source })).toBe(
    `const LIMIT = 1;\nexport const Reader = {\n  /** ${"a".repeat(71)} */\n  LIMIT,\n};\n`,
  );
});

it.each(["  ", "\t"])(
  "review width boundary permits an exact multiline move with %j",
  (indent) => {
    const source = `/**\n * ${"a".repeat(75)}\n */\nconst LIMIT = 1;\nexport const Reader = {\n${indent}LIMIT,\n};\n`;
    expect(_fix({ source: source })).toBe(
      `const LIMIT = 1;\nexport const Reader = {\n${indent}/**\n${indent} * ${"a".repeat(75)}\n${indent} */\n${indent}LIMIT,\n};\n`,
    );
  },
);

it.each([
  "function load(): void {\n  interface Shape {\n    /** Visible member. */\n    name: string;\n  }\n  enum Kind {\n    /** Visible enum member. */\n    Value,\n  }\n}\n",
  "/** Read a value. */\nfunction _read(): void {\n  // Existing interior explanation.\n  console.log(1);\n}\nexport const Reader = {\n  read: _read,\n};\n",
  "interface Store {\n  /** Read a value. */\n  read: () => void;\n}\n/** Read a value. */\nfunction _read(): void {}\nexport const Reader: Store = {\n  read: _read,\n};\n",
  "/** Read a value. */\nfunction _read(): void {}\nexport const Reader = {\n  read: _read,\n} satisfies Record<string, unknown>;\n",
  "/** Read a value. */\nfunction _read(): void {}\nexport const Reader = {\n  read: _read,\n} as const;\n",
])(
  "preserves documented interfaces and asserted module ownership %s",
  (source) => {
    expect(_fix({ source: source })).toBe(source);
  },
);
