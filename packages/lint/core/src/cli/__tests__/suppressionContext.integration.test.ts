import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { expect, it } from "vitest";
import {
  assertSuppressionHandoff,
  buildNativeSourceFromSuppression,
  collectSuppressionCoverage,
  createSuppressionRepository,
  CSS_RULE,
  CUSTOM,
  NATIVE,
  PROSE,
  ROOT,
} from "./SuppressionContextTestHelpers";

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
    const directory = createSuppressionRepository();
    const source = buildNativeSourceFromSuppression({
      prefix: prefix!,
      kind: kind!,
    });
    writeFileSync(join(directory, "src/reviewed.ts"), source);
    const original = spawnSync(
      join(ROOT, "node_modules/.bin/oxlint"),
      ["--format", "json", "src/reviewed.ts"],
      { cwd: directory, encoding: "utf8" },
    );
    expect(original.status, `${original.stdout}${original.stderr}`).toBe(0);
    expect(JSON.parse(original.stdout).diagnostics).toEqual([]);
    const report = await collectSuppressionCoverage({
      directory: directory,
      path: "src/reviewed.ts",
      source: source,
    });
    assertSuppressionHandoff({
      report: report,
      directory: directory,
      path: "src/reviewed.ts",
      ruleId: "avlint-ts-001",
      capability: "if-body",
    });
    assertSuppressionHandoff({
      report: report,
      directory: directory,
      path: "src/reviewed.ts",
      ruleId: "avlint-ts-013",
      capability: "fresh-data-object",
    });
    expect(report.outcomes).toContainEqual(
      expect.objectContaining({
        ruleId: "avlint-ts-004",
        state: kind!.startsWith("blanket") ? "fallback" : "enforced",
      }),
    );
  },
);

it.each(["curly", "avandar/straight-line-object-construction"])(
  "does not discharge %s after re-enable while unaffected rules remain enforced",
  async (rule) => {
    const directory = createSuppressionRepository();
    const source = `export {};\n/* eslint-disable ${rule} */\n${rule === "curly" ? NATIVE : CUSTOM}\n/* eslint-enable ${rule} */\n`;
    writeFileSync(join(directory, "src/reviewed.ts"), source);
    const report = await collectSuppressionCoverage({
      directory: directory,
      path: "src/reviewed.ts",
      source: source,
    });
    assertSuppressionHandoff({
      report: report,
      directory: directory,
      path: "src/reviewed.ts",
      ruleId: rule === "curly" ? "avlint-ts-001" : "avlint-ts-013",
      capability: rule === "curly" ? "if-body" : "fresh-data-object",
    });
    expect(report.outcomes).toContainEqual(
      expect.objectContaining({
        ruleId: rule === "curly" ? "avlint-ts-013" : "avlint-ts-001",
        state: "enforced",
      }),
    );
  },
);

it("proves unsuppressed original native/custom violations independently", async () => {
  const directory = createSuppressionRepository();
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
      expect.objectContaining({
        code: "avandar(straight-line-object-construction)",
      }),
    ]),
  );
  const report = await collectSuppressionCoverage({
    directory: directory,
    path: "src/reviewed.ts",
    source: source,
  });
  ["avlint-ts-001", "avlint-ts-013"].forEach((ruleId) => {
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
  const directory = createSuppressionRepository();
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
  expect(original.status, `${original.stdout}${original.stderr}`).toBe(0);
  expect(JSON.parse(original.stdout || original.stderr)[0].warnings).toEqual(
    [],
  );
  const report = await collectSuppressionCoverage({
    directory: directory,
    path: "src/reviewed.css",
    source: source,
  });
  assertSuppressionHandoff({
    report: report,
    directory: directory,
    path: "src/reviewed.css",
    ruleId: "avlint-css-001",
    capability: "standalone-prose-comments",
  });
});

it.each(["none", "other-rule-line"])(
  "proves unsuppressed CSS capability with %s context",
  async (kind) => {
    const directory = createSuppressionRepository();
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
    expect(original.status, `${original.stdout}${original.stderr}`).toBe(
      kind === "none" ? 2 : 0,
    );
    if (kind === "none") {
      expect(
        JSON.parse(original.stdout || original.stderr)[0].warnings,
      ).toContainEqual(expect.objectContaining({ rule: CSS_RULE }));
    }
    const report = await collectSuppressionCoverage({
      directory: directory,
      path: "src/reviewed.css",
      source: source,
    });
    expect(report.outcomes).toContainEqual(
      expect.objectContaining({
        ruleId: "avlint-css-001",
        capability: "standalone-prose-comments",
        state: "enforced",
      }),
    );
  },
);

it("retains every TypeScript native capability under its actual configured namespace", async () => {
  const directory = createSuppressionRepository();
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
  expect(original.status, `${original.stdout}${original.stderr}`).toBe(0);
  expect(JSON.parse(original.stdout).diagnostics).toEqual([]);
  const report = await collectSuppressionCoverage({
    directory: directory,
    path: "src/reviewed.ts",
    source: source,
  });
  [
    ["avlint-ts-003", "type-imports"],
    ["avlint-ts-003", "type-exports"],
    ["avlint-ts-004", "literal-assertions"],
  ].forEach(([ruleId, capability]) => {
    assertSuppressionHandoff({
      report: report,
      directory: directory,
      path: "src/reviewed.ts",
      ruleId: ruleId!,
      capability: capability!,
    });
  });
  expect(report.outcomes).toContainEqual(
    expect.objectContaining({ ruleId: "avlint-ts-001", state: "enforced" }),
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
