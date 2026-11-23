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

afterEach(() => {
  directories.splice(0).forEach((directory) => {
    rmSync(directory, { recursive: true, force: true });
  });
});

function _createRepository(hasPackages: boolean = true): string {
  const directory = mkdtempSync(join(tmpdir(), "review-handoff-"));
  directories.push(directory);
  mkdirSync(join(directory, "src"));
  mkdirSync(join(directory, ".git"));
  writeFileSync(join(directory, ".gitignore"), "node_modules/\n");
  if (hasPackages) {
    symlinkSync(join(ROOT, "node_modules"), join(directory, "node_modules"));
    symlinkSync(join(ROOT, "eslint"), join(directory, "eslint"));
  }
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
    readFileSync(join(ROOT, ".oxlintrc.json")),
  );
  writeFileSync(
    join(directory, "stylelint.config.js"),
    readFileSync(join(ROOT, "stylelint.config.js")),
  );
  writeFileSync(
    join(directory, "tsconfig.json"),
    JSON.stringify({
      compilerOptions: { strict: true, noEmit: true, module: "preserve" },
      include: ["src"],
    }),
  );
  writeFileSync(join(directory, "src/reviewed.tsx"), "export {};\n");
  writeFileSync(join(directory, "src/theme.css"), ".theme { color: red; }\n");
  writeFileSync(join(directory, "src/policy.rego"), "package policy\n");
  return directory;
}

async function _coverage({
  directory,
  paths,
}: Readonly<{
  directory: string;
  paths: readonly string[];
}>): Promise<CoverageReport> {
  const stdout: string[] = [];
  const status = await runCli({
    args: ["coverage", ...paths, "--format", "json", "--no-prompt"],
    io: {
      cwd: directory,
      stdout: (value) => {
        stdout.push(value);
      },
      stderr: () => {},
    },
  });
  const report = JSON.parse(stdout.join(""));
  expect(
    status,
    JSON.stringify(
      report.outcomes
        .filter((outcome: { operational: boolean }) => {
          return !outcome.operational;
        })
        .slice(0, 3),
    ),
  ).toBe(0);
  return report;
}

it("separates exact TSX and plain CSS proofs from unsupported review obligations", async () => {
  const directory = _createRepository();
  const report = await _coverage({
    directory: directory,
    paths: ["src/reviewed.tsx", "src/theme.css"],
  });
  expect(report.operational).toBe(true);
  [
    ["AF-01", "typescript", "src/reviewed.tsx", "if-body"],
    ["AF-06", "typescript", "src/reviewed.tsx", "standalone-body-prose"],
    ["AF-20", "css", "src/theme.css", "standalone-prose-comments"],
  ].forEach(([ruleId, language, path, capability]) => {
    expect(report.outcomes).toContainEqual(
      expect.objectContaining({
        ruleId,
        language,
        path: join(directory, path!),
        capability,
        state: "enforced",
      }),
    );
  });
  ["AF-06", "AF-20"].forEach((ruleId) => {
    expect(report.outcomes).toContainEqual(
      expect.objectContaining({
        ruleId,
        capability: "unsupported-shapes",
        state: "fallback",
      }),
    );
  });
  ["AF-02", "AF-05", "AF-19"].forEach((ruleId) => {
    expect(report.outcomes).toContainEqual(
      expect.objectContaining({
        ruleId,
        language: "typescript",
        state: "fallback",
      }),
    );
  });
}, 30_000);

it("retains custom fallback when the plugin is disabled while native proof stays independent", async () => {
  const directory = _createRepository();
  const path = join(directory, ".oxlintrc.json");
  const config = JSON.parse(readFileSync(path, "utf8"));
  config.jsPlugins = config.jsPlugins.filter((plugin: { name?: string }) => {
    return plugin.name !== "avandar";
  });
  [config, ...config.overrides].forEach(
    (section: { rules: Record<string, unknown> }) => {
      section.rules = Object.fromEntries(
        Object.entries(section.rules).filter(([name]) => {
          return !name.startsWith("avandar/");
        }),
      );
    },
  );
  writeFileSync(path, JSON.stringify(config));
  const report = await _coverage({
    directory: directory,
    paths: ["src/reviewed.tsx"],
  });
  expect(report.outcomes).toContainEqual(
    expect.objectContaining({
      ruleId: "AF-06",
      capability: "standalone-body-prose",
      state: "fallback",
    }),
  );
  expect(report.outcomes).toContainEqual(
    expect.objectContaining({
      ruleId: "AF-01",
      capability: "if-body",
      state: "enforced",
    }),
  );
}, 30_000);

it("returns unknown-language fallback without inventing JS inapplicability", async () => {
  const directory = _createRepository();
  const report = await _coverage({
    directory: directory,
    paths: ["src/policy.rego"],
  });
  expect(report.outcomes).toContainEqual(
    expect.objectContaining({
      ruleId: "AF-06",
      language: "unknown",
      path: join(directory, "src/policy.rego"),
      capability: "all",
      state: "fallback",
    }),
  );
  expect(
    report.outcomes.some((outcome: { state: string }) => {
      return outcome.state !== "fallback";
    }),
  ).toBe(false);
});

it("retains native fallback when the consumer has no installed lint engines", async () => {
  const directory = _createRepository(false);
  const report = await _coverage({
    directory: directory,
    paths: ["src/reviewed.tsx"],
  });
  expect(report.operational).toBe(true);
  expect(report.outcomes).toContainEqual(
    expect.objectContaining({
      ruleId: "AF-01",
      capability: "if-body",
      state: "fallback",
      recovery: expect.stringContaining("Install"),
    }),
  );
  expect(
    report.outcomes.some((outcome: { state: string }) => {
      return outcome.state === "enforced";
    }),
  ).toBe(false);
});
