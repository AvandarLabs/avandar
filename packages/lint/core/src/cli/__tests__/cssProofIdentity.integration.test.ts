import { spawnSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterEach, expect, it } from "vitest";
import { installPublicPackages } from "../../__tests__/publicPackages.fixtures";
import { runCli } from "../cliHelpers";
import type { CoverageReport } from "../coverageHelpers";

const ROOT: string = resolve(import.meta.dirname, "../../../../../..");
const RULE: string = "avandar/canonical-block-comments";
const SOURCE: string = "/*Ordinary prose*/\n.reviewed { color: red; }\n";
const directories: string[] = [];
afterEach(() => {
  directories.splice(0).forEach((directory) => {
    rmSync(directory, { recursive: true, force: true });
  });
});

function _repository(plugins: string[]): string {
  const directory = mkdtempSync(join(tmpdir(), "css-proof-identity-"));
  directories.push(directory);
  symlinkSync(join(ROOT, "node_modules"), join(directory, "node_modules"));
  mkdirSync(join(directory, "src"));
  mkdirSync(join(directory, ".git"));
  writeFileSync(join(directory, ".gitignore"), "node_modules/\n");
  writeFileSync(join(directory, "src/reviewed.css"), SOURCE);
  writeFileSync(join(directory, "src/control.ts"), "export {};\n");
  writeFileSync(
    join(directory, ".oxlintrc.json"),
    JSON.stringify({
      categories: { correctness: "off" },
      rules: { curly: "error" },
    }),
  );
  const command = 'stylelint "src/**/*.css"';
  writeFileSync(
    join(directory, "package.json"),
    JSON.stringify({
      type: "module",
      scripts: { lint: `oxlint . && ${command}`, "lint:css": command },
    }),
  );
  writeFileSync(
    join(directory, "stylelint.config.js"),
    `export default ${JSON.stringify({ plugins, rules: { [RULE]: true } })};`,
  );
  writeFileSync(
    join(directory, "replacement.js"),
    `
import stylelint from "stylelint";
const ruleName = ${JSON.stringify(RULE)};
export default stylelint.createPlugin(ruleName, () => (root, result) => {
  root.walkComments((comment) => {
    if (!comment.text.includes("\\n")) { return; }
    stylelint.utils.report({ ruleName, result, node: comment,
      message: "AF-20: Use canonical CSS block comment markers." });
  });
});
`,
  );
  return directory;
}

async function _coverage(directory: string): Promise<CoverageReport> {
  const output: string[] = [];
  expect(
    await runCli({
      args: ["coverage", "src", "--format", "json", "--no-prompt"],
      io: {
        cwd: directory,
        stdout: (value) => {
          output.push(value);
        },
        stderr: () => {},
      },
    }),
  ).toBe(0);
  expect(readFileSync(join(directory, "src/reviewed.css"), "utf8")).toBe(
    SOURCE,
  );
  expect(readFileSync(join(directory, "src/control.ts"), "utf8")).toBe(
    "export {};\n",
  );
  const result = JSON.parse(output.join(""));
  expect(result.outcomes).toContainEqual(
    expect.objectContaining({
      ruleId: "AF-01",
      state: "enforced",
      path: join(directory, "src/control.ts"),
    }),
  );
  return result;
}

function _standalone(directory: string): void {
  rmSync(join(directory, "node_modules"));
  mkdirSync(join(directory, "node_modules/@avandar"), { recursive: true });
  readdirSync(join(ROOT, "node_modules"))
    .filter((name) => {
      return name !== "@avandar";
    })
    .forEach((name) => {
      symlinkSync(
        join(ROOT, "node_modules", name),
        join(directory, "node_modules", name),
      );
    });
  ["ajv", "yaml"].forEach((name) => {
    if (!existsSync(join(directory, "node_modules", name))) {
      symlinkSync(
        join(ROOT, "packages/lint/core/node_modules", name),
        join(directory, "node_modules", name),
      );
    }
  });
  installPublicPackages({ directory: directory, names: ["core", "css"] });
}

it.each([
  ["replacement", ["./replacement.js"]],
  [
    "official then replacement",
    ["@avandar/lint-css/stylelint", "./replacement.js"],
  ],
])(
  "keeps the exact safe capability uncovered for %s",
  async (_name, plugins) => {
    const directory = _repository(plugins);
    const original = spawnSync(
      process.execPath,
      [
        "--input-type=module",
        "-e",
        `
    import stylelint from 'stylelint';
    const result = await stylelint.lint({ files: 'src/reviewed.css' });
    console.log(JSON.stringify({ errored: result.errored, warnings: result.results[0].warnings }));
  `,
      ],
      { cwd: directory, encoding: "utf8" },
    );
    expect(original.status, original.stderr).toBe(0);
    expect(JSON.parse(original.stdout)).toEqual({
      errored: false,
      warnings: [],
    });
    const result = await _coverage(directory);
    expect(result.outcomes).toContainEqual(
      expect.objectContaining({
        ruleId: "AF-20",
        language: "css",
        capability: "standalone-prose-comments",
        path: join(directory, "src/reviewed.css"),
        state: "fallback",
        operational: true,
      }),
    );
    expect(result.summaries).toContainEqual(
      expect.objectContaining({
        ruleId: "AF-20",
        language: "css",
        state: "fallback",
        uncovered: expect.arrayContaining([
          {
            path: join(directory, "src/reviewed.css"),
            capability: "standalone-prose-comments",
          },
        ]),
      }),
    );
  },
);

it("credits the final official registration rather than an earlier replacement", async () => {
  const directory = _repository([
    "./replacement.js",
    "@avandar/lint-css/stylelint",
  ]);
  expect((await _coverage(directory)).outcomes).toContainEqual(
    expect.objectContaining({
      ruleId: "AF-20",
      capability: "standalone-prose-comments",
      state: "enforced",
    }),
  );
});

it.each(["named-module", "default-object"])(
  "keeps a final %s replacement in fallback beside the official registration",
  async (shape) => {
    const directory = _repository([
      "@avandar/lint-css/stylelint",
      "./replacement.js",
    ]);
    const replacementPath = join(directory, "replacement.js");
    if (shape === "named-module") {
      writeFileSync(
        replacementPath,
        `${readFileSync(replacementPath, "utf8").replace(
          "export default stylelint.createPlugin",
          "const plugin = stylelint.createPlugin",
        )}\nexport { ruleName };\nexport const rule = plugin.rule;\n`,
      );
    } else {
      writeFileSync(
        join(directory, "stylelint.config.js"),
        `
import replacement from "./replacement.js";
export default {
  plugins: ["@avandar/lint-css/stylelint", { default: replacement }],
  rules: { ${JSON.stringify(RULE)}: true },
};
`,
      );
    }
    const result = await _coverage(directory);
    expect(result.outcomes).toContainEqual(
      expect.objectContaining({
        ruleId: "AF-20",
        capability: "standalone-prose-comments",
        state: "fallback",
        operational: true,
      }),
    );
    expect(result.summaries).toContainEqual(
      expect.objectContaining({
        ruleId: "AF-20",
        language: "css",
        state: "fallback",
        uncovered: expect.arrayContaining([
          {
            path: join(directory, "src/reviewed.css"),
            capability: "standalone-prose-comments",
          },
        ]),
      }),
    );
  },
);

function _packedCoverage(directory: string): CoverageReport {
  const result = spawnSync(
    process.execPath,
    [
      join(directory, "node_modules/@avandar/lint/dist/main.js"),
      "coverage",
      "src",
      "--format",
      "json",
      "--no-prompt",
    ],
    { cwd: directory, encoding: "utf8" },
  );
  expect(result.status, result.stderr).toBe(0);
  const report = JSON.parse(result.stdout);
  expect(report.outcomes).toContainEqual(
    expect.objectContaining({ ruleId: "AF-01", state: "enforced" }),
  );
  expect(readFileSync(join(directory, "src/reviewed.css"), "utf8")).toBe(
    SOURCE,
  );
  return report;
}

it("proves the freshly packed official CSS entry from a standalone core consumer", () => {
  const directory = _repository(["@avandar/lint-css/stylelint"]);
  _standalone(directory);
  expect(_packedCoverage(directory).outcomes).toContainEqual(
    expect.objectContaining({
      ruleId: "AF-20",
      capability: "standalone-prose-comments",
      state: "enforced",
    }),
  );
});

it.each(["version", "conditional-export", "static-wrapper"])(
  "retains fallback for an unsupported official-package %s context",
  async (reason) => {
    const directory = _repository(["@avandar/lint-css/stylelint"]);
    _standalone(directory);
    expect(_packedCoverage(directory).outcomes).toContainEqual(
      expect.objectContaining({
        ruleId: "AF-20",
        capability: "standalone-prose-comments",
        state: "enforced",
      }),
    );
    const packagePath = join(
      directory,
      "node_modules/@avandar/lint-css/package.json",
    );
    const manifest = JSON.parse(readFileSync(packagePath, "utf8"));
    if (reason === "version") {
      manifest.version = "0.0.0";
    } else if (reason === "static-wrapper") {
      manifest.exports["./stylelint"] = "./wrapper.js";
      writeFileSync(
        join(directory, "node_modules/@avandar/lint-css/wrapper.js"),
        readFileSync(join(directory, "replacement.js"), "utf8"),
      );
    } else {
      manifest.exports["./stylelint"] = {
        import: "./dist/stylelint.js",
        require: "./dist/stylelint.js",
        default: "./dist/stylelint.js",
      };
    }
    writeFileSync(packagePath, JSON.stringify(manifest));
    expect(_packedCoverage(directory).outcomes).toContainEqual(
      expect.objectContaining({
        ruleId: "AF-20",
        capability: "standalone-prose-comments",
        state: "fallback",
      }),
    );
  },
);

it.each([
  ["different result source", 'entry.source = entry.source + ".sibling.css";'],
  ["missing end", "delete warning.endLine; delete warning.endColumn;"],
  [
    "zero length",
    "warning.endLine = warning.line; warning.endColumn = warning.column;",
  ],
  ["end beyond seed", "warning.endLine += 1000;"],
  ["end past line", "warning.endColumn = 1000000;"],
  ["negative column", "warning.column = -1;"],
  ["noninteger column", "warning.column = 1.5;"],
  ["nonfinite end", "warning.endColumn = Infinity;"],
])("refuses actual-engine warnings with %s", async (_reason, mutation) => {
  const directory = _repository(["@avandar/lint-css/stylelint"]);
  const configPath = join(directory, "stylelint.config.js");
  const config = readFileSync(configPath, "utf8");
  writeFileSync(
    configPath,
    `
import stylelint from "stylelint";
const lint = stylelint.lint;
stylelint.lint = async (options) => {
  const result = await lint(options);
  if (options.code) {
    result.results.forEach((entry) => {
      entry.warnings.forEach((warning) => { ${mutation} });
    });
  }
  return result;
};
${config}
`,
  );
  expect((await _coverage(directory)).outcomes).toContainEqual(
    expect.objectContaining({
      ruleId: "AF-20",
      capability: "standalone-prose-comments",
      state: "fallback",
      operational: true,
    }),
  );
});
