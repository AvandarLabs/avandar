import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { expect, it } from "vitest";
import {
  collectSourceCoverage,
  createSourceRepository,
  fixSource,
  getSourceTypeDiagnosticsFromSource,
  SAFE,
} from "./SourceFixerTestHelpers";

it.each(["ts", "tsx", "js", "jsx"])(
  "proves supported source capabilities with root rules for %s",
  async (extension) => {
    const directory = createSourceRepository(extension);
    const result = await collectSourceCoverage({
      directory: directory,
      extension: extension,
    });
    SAFE.forEach(([ruleId, capability]) => {
      expect(result.outcomes).toContainEqual(
        expect.objectContaining({
          ruleId,
          capability,
          state: "enforced",
        }),
      );
      expect(result.outcomes).toContainEqual(
        expect.objectContaining({
          ruleId,
          capability: "unsupported-shapes",
          state: "fallback",
        }),
      );
      expect(result.summaries).toContainEqual(
        expect.objectContaining({ ruleId, state: "fallback" }),
      );
    });
    expect(
      readFileSync(join(directory, `src/reviewed.${extension}`), "utf8"),
    ).toBe("export {};\n");
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
])("keeps source proofs in fallback when %s", async (reason) => {
  const directory = createSourceRepository();
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
      `/* eslint-disable ${SAFE.map(([, , name]) => {
        return `avandar/${name}`;
      }).join(", ")} */\nexport {};\n`,
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
  const result = await collectSourceCoverage({
    directory: directory,
    extension: "ts",
    status: ["missing-plugin", "malformed"].includes(reason) ? 1 : 0,
  });
  SAFE.forEach(([ruleId, capability]) => {
    expect(result.outcomes).toContainEqual(
      expect.objectContaining({ ruleId, capability, state: "fallback" }),
    );
  });
});

it.each(["ts", "js"])(
  "refuses synthetic module context for original %s scripts",
  async (extension) => {
    const directory = createSourceRepository(extension);
    const source = "const externalValue = 1;\nconsume(externalValue);\n";
    writeFileSync(join(directory, `src/reviewed.${extension}`), source);
    const result = await collectSourceCoverage({
      directory: directory,
      extension: extension,
    });
    SAFE.forEach(([ruleId, capability]) => {
      expect(result.outcomes).toContainEqual(
        expect.objectContaining({
          ruleId,
          capability,
          state: "fallback",
          recovery: expect.stringContaining("original module context"),
        }),
      );
    });
    expect(
      readFileSync(join(directory, `src/reviewed.${extension}`), "utf8"),
    ).toBe(source);
  },
);

it.each([
  ['const marker = "export {};";\nconsume(marker);\n', "fake textual marker"],
  [
    "// export {};\nconst externalValue = 1;\nconsume(externalValue);\n",
    "comment marker",
  ],
  ["export {};\n", "disabled witness"],
  ["export {};\n", "warning witness"],
  [
    "/* eslint-disable avandar/module-context-witness */\nexport {};\n",
    "suppressed witness",
  ],
])(
  "refuses unproved original module context: %s (%s)",
  async (source, reason) => {
    const directory = createSourceRepository();
    writeFileSync(join(directory, "src/reviewed.ts"), source);
    if (reason.endsWith("witness") && reason !== "suppressed witness") {
      const path = join(directory, ".oxlintrc.json");
      const config = JSON.parse(readFileSync(path, "utf8"));
      config.rules["avandar/module-context-witness"] =
        reason === "warning witness" ? "warn" : "off";
      writeFileSync(path, JSON.stringify(config));
    }
    const result = await collectSourceCoverage({ directory: directory });
    SAFE.forEach(([ruleId, capability]) => {
      expect(result.outcomes).toContainEqual(
        expect.objectContaining({
          ruleId,
          capability,
          state: "fallback",
          recovery: expect.stringContaining("original module context"),
        }),
      );
    });
  },
);

it("accepts an original module marker at the end of a Unicode prefix", async () => {
  const directory = createSourceRepository();
  writeFileSync(
    join(directory, "src/reviewed.ts"),
    'const label = "😀 é";\nconsume(label);\nexport {};\n',
  );
  const result = await collectSourceCoverage({ directory: directory });
  SAFE.forEach(([ruleId, capability]) => {
    expect(result.outcomes).toContainEqual(
      expect.objectContaining({ ruleId, capability, state: "enforced" }),
    );
  });
});

it.each(["ts", "tsx", "js", "jsx"])(
  "composes ordinary function fixes idempotently for %s",
  (extension) => {
    expect(
      fixSource({
        source:
          "export {}; const read = () => { consume(); return 1; }; read(); function load() { function nested() { return 2; } return nested(); } load(); function helper() { return 3; } export function run() { return helper(); }",
        extension: extension,
      }),
    ).toBe(
      "export {}; function read() { consume(); return 1; } read(); function load() { const nested = () => { return 2; }; return nested(); } load(); function _helper() { return 3; } export function run() { return _helper(); }",
    );
  },
);

it.each([
  "export {}; function outer() { function read(value: number): number; function read(value: number) { return value; } return read(1); }",
  "export {}; const _read: () => number = () => 1; _read();",
  "export {}; const _read = <T>(value: T) => value; _read(1);",
  "export {}; function read(value: number): number; function read(value: number) { return value; } read(1);",
  "export {}; const _read = () => 1; type Read = typeof _read; _read();",
  "export {}; class Reader extends Base { method() { const _read = () => super.method(); return _read(); } }",
])("preserves unsupported TypeScript function contracts: %s", (source) => {
  expect(fixSource({ source: source })).toBe(source);
});

it.each([
  [
    ["top-level-function-declarations"],
    "export {}; const read = function() { return 1; }; read();",
    "export {}; function read() { return 1; } read();",
  ],
  [
    ["private-helper-prefix"],
    "export {}; const read = function() { return 1; }; export function load() { return read(); }",
    "export {}; const _read = function() { return 1; }; export function load() { return _read(); }",
  ],
  [
    ["nested-arrow-functions"],
    "export {}; function load() { function read() { return 1; } return read(); }",
    "export {}; function load() { const read = () => { return 1; }; return read(); }",
  ],
])("applies only enabled source rules %j", (rules, source, output) => {
  expect(fixSource({ source: source, extension: "ts", rules: rules })).toBe(
    output,
  );
});

it("preserves typed signatures in the supported direct-call subset", () => {
  expect(
    fixSource({
      source:
        "export {}; const _read = (value: number): number => { consume(); return value; }; _read(1); function _load() { function read(value: number): number { return value; } return read(2); } _load();",
    }),
  ).toBe(
    "export {}; function _read(value: number): number { consume(); return value; } _read(1); function _load() { const read = (value: number): number => { return value; }; return read(2); } _load();",
  );
});

it("keeps interleaved conversion and rename envelopes disjoint in one native pass", () => {
  expect(
    fixSource({
      source:
        "export {}; function helper() { return 1; } const direct = function() { return 2; }; direct(); export function load() { return helper(); } function other() { return 3; } export function run() { return other(); }",
    }),
  ).toBe(
    "export {}; function helper() { return 1; } function direct() { return 2; } direct(); export function load() { return helper(); } function _other() { return 3; } export function run() { return _other(); }",
  );
});

it.each([
  [
    "export {}; const _read = (): number => 1; _read();",
    "export {}; const _read = (): number => {return 1}; _read();",
  ],
  [
    "export {};\nconst _read = (): number => { if (flag) consume(); return 1; };\n_read();",
    "export {};\nconst _read = (): number => { if (flag) {consume();} return 1; };\n_read();",
  ],
  [
    "export {}; function read(): string { return 'value' as 'value'; } export function load(): string { return read(); }",
    "export {}; function read(): string { return 'value' as const; } export function load(): string { return read(); }",
  ],
  [
    "export {}; function read(): number { return 1; }\n/**\n * Read a value.\n */\nexport function load(): number { return read(); }",
    "export {}; function read(): number { return 1; }\n/** Read a value. */\nexport function load(): number { return read(); }",
  ],
  [
    "export function load(): number {\n  function read(): number {\n    /** Read only once. */\n    return 1;\n  }\n  return read();\n}",
    "export function load(): number {\n  function read(): number {\n    // Read only once.\n    return 1;\n  }\n  return read();\n}",
  ],
  [
    "export function load(): number {\n  function read(callback = () => 1): number { return callback(); }\n  return read();\n}",
    "export function load(): number {\n  function read(callback = () => {return 1}): number { return callback(); }\n  return read();\n}",
  ],
])(
  "composes root native and comment repairs without exposing function edits: %s",
  (source, output) => {
    expect(
      fixSource({
        source: source,
        extension: "ts",
        rules: undefined,
        root: true,
      }),
    ).toBe(output);
  },
);

it("renames separate adjacent helper pairs in one native pass", () => {
  expect(
    fixSource({
      source:
        "export {}; function first() { return 1; } export function load() { return first(); } function second() { return 2; } export function run() { return second(); }",
    }),
  ).toBe(
    "export {}; function _first() { return 1; } export function load() { return _first(); } function _second() { return 2; } export function run() { return _second(); }",
  );
});

it.each([
  "export {}; function read() { return 1; } export function load(_read: () => number) { return read() + _read(); }",
  "export {}; function read() { return 1; } export function load() { return read() + _read(); }",
  "export {}; function read() { return 1; } export function load() { return read.name; }",
  "export {}; const contract = 'r\\u0065ad'; function read() { return 1; } export function load() { return read(); }",
])(
  "preserves exact adjacent export collision and identity contracts: %s",
  (source) => {
    expect(fixSource({ source: source })).toBe(source);
  },
);

it.each(["asserts candidate", "asserts candidate is number"])(
  "preserves declaration narrowing and zero TypeScript errors for %s",
  (assertion) => {
    const source = [
      `declare function check(candidate: unknown): ${assertion};`,
      "export function load(value: number | undefined): number {",
      "  function read(",
      "    candidate: number | undefined,",
      `  ): ${assertion} {`,
      "    check(candidate);",
      "  }",
      "  read(value);",
      "  return value;",
      "}",
    ].join("\n");
    expect(getSourceTypeDiagnosticsFromSource(source)).toEqual({
      status: 0,
      diagnostics: "",
    });
    const fixed = fixSource({
      source: source,
      extension: "ts",
      rules: undefined,
      root: true,
    });
    expect(getSourceTypeDiagnosticsFromSource(fixed)).toEqual({
      status: 0,
      diagnostics: "",
    });
    expect(fixed).toBe(source);
  },
);

it("preserves the TypeScript pseudo-this parameter through native root repair", () => {
  const source = [
    "export function load(): number {",
    "  function read(this: void): number { return 1; }",
    "  return read();",
    "}",
  ].join("\n");
  expect(getSourceTypeDiagnosticsFromSource(source)).toEqual({
    status: 0,
    diagnostics: "",
  });
  const fixed = fixSource({
    source: source,
    extension: "ts",
    rules: undefined,
    root: true,
  });
  expect(fixed).toBe(source);
  expect(getSourceTypeDiagnosticsFromSource(fixed)).toEqual({
    status: 0,
    diagnostics: "",
  });
});
