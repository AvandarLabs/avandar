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
import { runCli } from "../../../src/cli/main";

const ROOT = resolve(import.meta.dirname, "../../../../../..");
const CSS_RULE = "avandar/canonical-block-comments";
const NATIVE = 'if (Boolean(1)) console.log("uncovered");';
const CUSTOM = "const _localE2ECount = 1;\nconsole.log(_localE2ECount);";
const PROSE = "/* First sentence.\n   Second sentence. */";
const directories: string[] = [];
afterEach(() => {
  directories.splice(0).forEach((directory) => {
    rmSync(directory, { recursive: true, force: true });
  });
});

function _repository() {
  const directory = mkdtempSync(join(tmpdir(), "suppression-coverage-"));
  directories.push(directory);
  symlinkSync(join(ROOT, "node_modules"), join(directory, "node_modules"));
  mkdirSync(join(directory, ".git"));
  mkdirSync(join(directory, "src"));
  writeFileSync(join(directory, ".gitignore"), "node_modules/\n");
  writeFileSync(
    join(directory, "package.json"),
    JSON.stringify({
      type: "module",
      scripts: {
        lint: 'oxlint . && stylelint "src/**/*.css"',
        "lint:css": 'stylelint "src/**/*.css"',
      },
    }),
  );
  writeFileSync(
    join(directory, ".oxlintrc.json"),
    JSON.stringify({
      categories: { correctness: "off" },
      plugins: ["typescript"],
      jsPlugins: [
        { name: "avandar", specifier: "@avandar/lint-typescript/oxlint" },
      ],
      rules: {
        curly: "error",
        "avandar/local-e2e-casing": "error",
        "typescript/prefer-as-const": "error",
      },
    }),
  );
  writeFileSync(
    join(directory, "stylelint.config.js"),
    `export default { plugins: ["@avandar/lint-css/stylelint"], rules: { "${CSS_RULE}": true, "color-no-invalid-hex": true } };\n`,
  );
  return directory;
}

async function _coverage(directory: string, path: string, source: string) {
  const stdout: string[] = [];
  expect(
    await runCli(["coverage", path, "--format", "json", "--no-prompt"], {
      cwd: directory,
      stdout: (value) => {
        stdout.push(value);
      },
      stderr: () => {},
    }),
  ).toBe(0);
  expect(readFileSync(join(directory, path), "utf8")).toBe(source);
  return JSON.parse(stdout.join(""));
}

function _assertHandoff(
  report: { outcomes: unknown[]; summaries: unknown[] },
  directory: string,
  path: string,
  ruleId: string,
  capability: string,
) {
  expect(report.outcomes).toContainEqual(
    expect.objectContaining({
      path: join(directory, path),
      ruleId,
      capability,
      state: "fallback",
      recovery: expect.stringContaining("suppression"),
    }),
  );
  expect(report.summaries).toContainEqual(
    expect.objectContaining({
      ruleId,
      state: "fallback",
      uncovered: expect.arrayContaining([
        { path: join(directory, path), capability },
      ]),
    }),
  );
}

function _nativeSource(prefix: string, kind: string) {
  const blanket = kind.startsWith("blanket");
  const mode = kind.replace("blanket-", "");
  const rules = blanket ? "" : " curly, avandar/local-e2e-casing";
  if (mode === "region") {
    return `export {};\n/* ${prefix}-disable${rules} */\n${NATIVE}\n${CUSTOM}\n/* ${prefix}-enable${rules} */\n`;
  }
  const directive = mode === "line" ? "disable-line" : "disable-next-line";
  const nativeRule = blanket ? "" : " curly";
  const customRule = blanket ? "" : " avandar/local-e2e-casing";
  if (mode === "line") {
    return `export {};\n${NATIVE} // ${prefix}-${directive}${nativeRule}\nconst _localE2ECount = 1; console.log(_localE2ECount); // ${prefix}-${directive}${customRule}\n`;
  }
  return `export {};\n// ${prefix}-${directive}${nativeRule}\n${NATIVE}\n// ${prefix}-${directive}${customRule}\n${CUSTOM}\n`;
}

it.each(
  ["eslint", "oxlint"].flatMap((prefix) => {
    return [
      "region",
      "next-line",
      "line",
      "blanket-region",
      "blanket-next-line",
      "blanket-line",
    ].map((kind) => {
      return [prefix, kind];
    });
  }),
)(
  "retains native/custom handoff for original %s %s suppression",
  async (prefix, kind) => {
    const directory = _repository();
    const source = _nativeSource(prefix!, kind!);
    writeFileSync(join(directory, "src/reviewed.ts"), source);
    const original = spawnSync(
      join(ROOT, "node_modules/.bin/oxlint"),
      ["--format", "json", "src/reviewed.ts"],
      { cwd: directory, encoding: "utf8" },
    );
    expect(original.status, original.stdout + original.stderr).toBe(0);
    expect(JSON.parse(original.stdout).diagnostics).toEqual([]);
    const report = await _coverage(directory, "src/reviewed.ts", source);
    _assertHandoff(report, directory, "src/reviewed.ts", "AF-01", "if-body");
    _assertHandoff(
      report,
      directory,
      "src/reviewed.ts",
      "AF-13",
      "local-primitive-bindings",
    );
    expect(report.outcomes).toContainEqual(
      expect.objectContaining({
        ruleId: "AF-04",
        state: kind!.startsWith("blanket") ? "fallback" : "enforced",
      }),
    );
  },
);

it.each(["curly", "avandar/local-e2e-casing"])(
  "does not discharge %s after re-enable while unaffected rules remain enforced",
  async (rule) => {
    const directory = _repository();
    const source = `export {};\n/* eslint-disable ${rule} */\n${rule === "curly" ? NATIVE : CUSTOM}\n/* eslint-enable ${rule} */\n`;
    writeFileSync(join(directory, "src/reviewed.ts"), source);
    const report = await _coverage(directory, "src/reviewed.ts", source);
    _assertHandoff(
      report,
      directory,
      "src/reviewed.ts",
      rule === "curly" ? "AF-01" : "AF-13",
      rule === "curly" ? "if-body" : "local-primitive-bindings",
    );
    expect(report.outcomes).toContainEqual(
      expect.objectContaining({
        ruleId: rule === "curly" ? "AF-13" : "AF-01",
        state: "enforced",
      }),
    );
  },
);

it("proves unsuppressed original native/custom violations independently", async () => {
  const directory = _repository();
  const source = `export {};\n${NATIVE}\n${CUSTOM}\n`;
  writeFileSync(join(directory, "src/reviewed.ts"), source);
  const original = spawnSync(
    join(ROOT, "node_modules/.bin/oxlint"),
    ["--format", "json", "src/reviewed.ts"],
    { cwd: directory, encoding: "utf8" },
  );
  expect(original.status).toBe(1);
  expect(JSON.parse(original.stdout).diagnostics).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ code: "eslint(curly)" }),
      expect.objectContaining({ code: "avandar(local-e2e-casing)" }),
    ]),
  );
  const report = await _coverage(directory, "src/reviewed.ts", source);
  ["AF-01", "AF-13"].forEach((ruleId) => {
    expect(report.outcomes).toContainEqual(
      expect.objectContaining({ ruleId, state: "enforced" }),
    );
  });
});

it.each([
  "region",
  "next-line",
  "blanket-region",
  "blanket-next-line",
  "blanket-line",
])("retains CSS handoff for original %s suppression", async (kind) => {
  const directory = _repository();
  const rules = kind.startsWith("blanket") ? "" : ` ${CSS_RULE}`;
  const source =
    kind === "blanket-line"
      ? ".theme { color: #zz; } /* stylelint-disable-line */\n"
      : kind.endsWith("region")
        ? `/* stylelint-disable${rules} */\n${PROSE}\n/* stylelint-enable${rules} */\n.theme { color: red; }\n`
        : `/* stylelint-disable-next-line${rules} */\n${PROSE}\n.theme { color: red; }\n`;
  writeFileSync(join(directory, "src/reviewed.css"), source);
  const original = spawnSync(
    join(ROOT, "node_modules/.bin/stylelint"),
    ["src/reviewed.css", "--formatter", "json"],
    { cwd: directory, encoding: "utf8" },
  );
  expect(original.status, original.stdout + original.stderr).toBe(0);
  expect(JSON.parse(original.stdout || original.stderr)[0].warnings).toEqual(
    [],
  );
  const report = await _coverage(directory, "src/reviewed.css", source);
  _assertHandoff(
    report,
    directory,
    "src/reviewed.css",
    "AF-20",
    "standalone-prose-comments",
  );
});

it.each(["none", "other-rule-line"])(
  "proves unsuppressed CSS capability with %s context",
  async (kind) => {
    const directory = _repository();
    const source =
      kind === "none"
        ? `${PROSE}\n.theme { color: red; }\n`
        : ".theme { color: #zz; } /* stylelint-disable-line color-no-invalid-hex */\n";
    writeFileSync(join(directory, "src/reviewed.css"), source);
    const original = spawnSync(
      join(ROOT, "node_modules/.bin/stylelint"),
      ["src/reviewed.css", "--formatter", "json"],
      { cwd: directory, encoding: "utf8" },
    );
    expect(original.status, original.stdout + original.stderr).toBe(
      kind === "none" ? 2 : 0,
    );
    if (kind === "none") {
      expect(
        JSON.parse(original.stdout || original.stderr)[0].warnings,
      ).toContainEqual(expect.objectContaining({ rule: CSS_RULE }));
    }
    const report = await _coverage(directory, "src/reviewed.css", source);
    expect(report.outcomes).toContainEqual(
      expect.objectContaining({
        ruleId: "AF-20",
        capability: "standalone-prose-comments",
        state: "enforced",
      }),
    );
  },
);

it("retains every TypeScript native capability under its actual configured namespace", async () => {
  const directory = _repository();
  const rules = [
    "consistent-type-imports",
    "consistent-type-exports",
    "prefer-as-const",
  ];
  const configPath = join(directory, ".oxlintrc.json");
  const config = JSON.parse(readFileSync(configPath, "utf8"));
  config.options = { typeAware: true };
  rules.forEach((rule) => {
    config.rules[`typescript/${rule}`] = "error";
  });
  writeFileSync(configPath, JSON.stringify(config));
  writeFileSync(
    join(directory, "tsconfig.json"),
    JSON.stringify({
      compilerOptions: {
        strict: true,
        noEmit: true,
        module: "preserve",
      },
      include: ["src"],
    }),
  );
  const violation =
    'import { Stats } from "node:fs";\nlet stats: Stats;\ntype Shape = { value: number };\nexport { Shape };\nconst literal = "value" as "value";\n';
  const names = rules
    .map((rule) => {
      return `typescript/${rule}`;
    })
    .join(", ");
  const source = `/* oxlint-disable ${names} */\n${violation}/* oxlint-enable ${names} */\n`;
  writeFileSync(join(directory, "src/reviewed.ts"), source);
  const original = spawnSync(
    join(ROOT, "node_modules/.bin/oxlint"),
    ["--format", "json", "src/reviewed.ts"],
    { cwd: directory, encoding: "utf8" },
  );
  expect(original.status, original.stdout + original.stderr).toBe(0);
  expect(JSON.parse(original.stdout).diagnostics).toEqual([]);
  const report = await _coverage(directory, "src/reviewed.ts", source);
  [
    ["AF-03", "type-imports"],
    ["AF-03", "type-exports"],
    ["AF-04", "literal-assertions"],
  ].forEach(([ruleId, capability]) => {
    _assertHandoff(report, directory, "src/reviewed.ts", ruleId!, capability!);
  });
  expect(report.outcomes).toContainEqual(
    expect.objectContaining({ ruleId: "AF-01", state: "enforced" }),
  );
  writeFileSync(join(directory, "src/reviewed.ts"), violation);
  const unsuppressed = spawnSync(
    join(ROOT, "node_modules/.bin/oxlint"),
    ["--format", "json", "src/reviewed.ts"],
    { cwd: directory, encoding: "utf8" },
  );
  expect(unsuppressed.status).toBe(1);
  expect(
    JSON.parse(unsuppressed.stdout).diagnostics.map(
      (diagnostic: { code: string }) => {
        return diagnostic.code;
      },
    ),
  ).toEqual(
    expect.arrayContaining([
      "typescript(consistent-type-imports)",
      "typescript(consistent-type-exports)",
      "typescript(prefer-as-const)",
    ]),
  );
});
