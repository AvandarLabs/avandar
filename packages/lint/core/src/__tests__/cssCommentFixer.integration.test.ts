import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterEach, expect, it } from "vitest";
import { loadRuleCatalog } from "../catalog/loadRuleCatalog";
import { runCli } from "../cli/cliHelpers";
import { collectCoverage } from "../cli/coverageHelpers";
import { createCssCoverageProbes } from "../cli/createCssCoverageProbes";
import type { CoverageReport } from "../cli/coverageHelpers";

const ROOT: string = resolve(import.meta.dirname, "../../../../..");
const RULE: string = "avandar/canonical-block-comments";
const SOURCE: string = ".reviewed { color: red; }\n";
const directories: string[] = [];

afterEach(() => {
  directories.splice(0).forEach((directory) => {
    rmSync(directory, { recursive: true, force: true });
  });
});

function _createRepository(): string {
  const directory = mkdtempSync(join(tmpdir(), "css-coverage-"));
  directories.push(directory);
  symlinkSync(join(ROOT, "node_modules"), join(directory, "node_modules"));
  mkdirSync(join(directory, "src"));
  mkdirSync(join(directory, "apps/ava-video-producer"), { recursive: true });
  writeFileSync(join(directory, "src/reviewed.css"), SOURCE);
  writeFileSync(
    join(directory, "apps/ava-video-producer/reviewed.css"),
    SOURCE,
  );
  const command = 'stylelint "src/**/*.css" "apps/ava-video-producer/**/*.css"';
  writeFileSync(
    join(directory, "package.json"),
    JSON.stringify({
      type: "module",
      scripts: {
        lint: `oxlint . && ${command}`,
        "lint:css": command,
      },
    }),
  );
  writeFileSync(
    join(directory, "stylelint.config.js"),
    readFileSync(join(ROOT, "stylelint.config.js")),
  );
  return directory;
}

function _setRefusal({
  directory,
  reason,
}: Readonly<{ directory: string; reason: string }>): void {
  let config = readFileSync(join(directory, "stylelint.config.js"), "utf8");
  if (["disabled", "warning", "fix-disabled"].includes(reason)) {
    config = `export default { plugins: ['@avandar/lint-css/stylelint'], rules: { '${RULE}': ${reason === "disabled" ? "null" : reason === "fix-disabled" ? "[true, { disableFix: true }]" : "[true, { severity: 'warning' }]"} } };`;
  } else if (reason === "source-disabled") {
    writeFileSync(
      join(directory, "src/reviewed.css"),
      `/* stylelint-disable ${RULE} */\n${SOURCE}`,
    );
  } else if (reason === "excluded") {
    writeFileSync(join(directory, ".stylelintignore"), "src/reviewed.css\n");
  } else if (reason === "unselected" || reason === "unknown-command") {
    const packagePath = join(directory, "package.json");
    const manifest = JSON.parse(readFileSync(packagePath, "utf8"));
    manifest.scripts["lint:css"] =
      reason === "unselected"
        ? 'stylelint "apps/**/*.css"'
        : 'stylelint --custom-syntax unknown "src/**/*.css"';
    manifest.scripts.lint = manifest.scripts["lint:css"];
    writeFileSync(packagePath, JSON.stringify(manifest));
  } else if (reason === "missing-engine") {
    rmSync(join(directory, "node_modules"));
  } else if (reason === "missing-plugin") {
    config = `export default { rules: { '${RULE}': true } };`;
  } else if (reason === "malformed") {
    config = "export default { invalid";
  } else if (reason === "parse-error") {
    writeFileSync(join(directory, "src/reviewed.css"), "/* Unclosed");
  }
  writeFileSync(join(directory, "stylelint.config.js"), config);
}

async function _coverage({
  directory,
  path = "src/reviewed.css",
  expectedStatus = 0,
}: Readonly<{
  directory: string;
  path?: string | readonly string[];
  expectedStatus?: number;
}>): Promise<CoverageReport> {
  const stdout: string[] = [];
  const paths = typeof path === "string" ? [path] : path;
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
  expect(status).toBe(expectedStatus);
  const result = JSON.parse(stdout.join(""));
  return result;
}

it.each(["src/reviewed.css", "apps/ava-video-producer/reviewed.css"])(
  "proves supported CSS markers at the selected original filename: %s",
  async (path) => {
    const directory = _createRepository();
    const result = await _coverage({ directory: directory, path: path });
    expect(result.outcomes).toContainEqual(
      expect.objectContaining({
        ruleId: "AF-20",
        language: "css",
        capability: "standalone-prose-comments",
        state: "enforced",
      }),
    );
    expect(result.outcomes).toContainEqual(
      expect.objectContaining({
        ruleId: "AF-20",
        capability: "unsupported-shapes",
        state: "fallback",
      }),
    );
    expect(result.summaries).toContainEqual(
      expect.objectContaining({ ruleId: "AF-20", state: "fallback" }),
    );
    expect(readFileSync(join(directory, path), "utf8")).toBe(SOURCE);
  },
);

it.each([
  "disabled",
  "warning",
  "fix-disabled",
  "source-disabled",
  "excluded",
  "unselected",
  "unknown-command",
  "missing-engine",
  "missing-plugin",
  "malformed",
  "parse-error",
])("refuses unsupported coverage evidence when %s", async (reason) => {
  const directory = _createRepository();
  _setRefusal({ directory: directory, reason: reason });
  const original = readFileSync(join(directory, "src/reviewed.css"), "utf8");
  const result = await _coverage({
    directory: directory,
    path: undefined,
    expectedStatus: ["missing-plugin", "malformed", "parse-error"].includes(
      reason,
    )
      ? 1
      : 0,
  });
  expect(result.outcomes).toContainEqual(
    expect.objectContaining({
      ruleId: "AF-20",
      capability: "standalone-prose-comments",
      state: "fallback",
    }),
  );
  expect(readFileSync(join(directory, "src/reviewed.css"), "utf8")).toBe(
    original,
  );
});

it("preserves dynamic configuration identity and per-file overrides", async () => {
  const directory = _createRepository();
  writeFileSync(
    join(directory, "stylelint.config.js"),
    `
export default {
  plugins: ['@avandar/lint-css/stylelint'],
  rules: { '${RULE}': process.cwd() === ${JSON.stringify(realpathSync(directory))} ? true : null },
  overrides: [{ files: ['apps/**/*.css'], rules: { '${RULE}': null } }],
};
`,
  );
  expect((await _coverage({ directory: directory })).outcomes).toContainEqual(
    expect.objectContaining({
      ruleId: "AF-20",
      capability: "standalone-prose-comments",
      state: "enforced",
    }),
  );
  expect(
    (
      await _coverage({
        directory: directory,
        path: "apps/ava-video-producer/reviewed.css",
      })
    ).outcomes,
  ).toContainEqual(
    expect.objectContaining({
      ruleId: "AF-20",
      capability: "standalone-prose-comments",
      state: "fallback",
    }),
  );
});

it("keeps generated stylesheets outside the root repair coverage", async () => {
  const directory = _createRepository();
  writeFileSync(join(directory, "src/reviewed.gen.css"), SOURCE);
  const result = await _coverage({
    directory: directory,
    path: "src/reviewed.gen.css",
  });
  expect(result.outcomes).toContainEqual(
    expect.objectContaining({
      ruleId: "AF-20",
      capability: "standalone-prose-comments",
      state: "fallback",
    }),
  );
});

function _instrumentProofProcesses(directory: string): string {
  const log = join(directory, "processes.jsonl");
  const configPath = join(directory, "stylelint.config.js");
  const config = readFileSync(configPath, "utf8");
  writeFileSync(
    configPath,
    `
import { appendFileSync } from "node:fs";
import { setTimeout as delay } from "node:timers/promises";
const log = ${JSON.stringify(log)};
appendFileSync(log, \`\${JSON.stringify({ event: "start", pid: process.pid })}\\n\`);
process.once("exit", () => {
  appendFileSync(log, \`\${JSON.stringify({ event: "end", pid: process.pid })}\\n\`);
});
await delay(100);
${config}
`,
  );
  return log;
}

function _getProcessActivity(log: string): {
  started: number;
  maximum: number;
  remaining: number;
} {
  const events = readFileSync(log, "utf8")
    .trim()
    .split("\n")
    .map((line): { event: "start" | "end" } => {
      return JSON.parse(line);
    });
  let active = 0;
  const activeCounts = events.map(({ event }) => {
    active += event === "start" ? 1 : -1;
    return active;
  });
  return {
    started: events.filter(({ event }) => {
      return event === "start";
    }).length,
    maximum: Math.max(...activeCounts),
    remaining: active,
  };
}

function _expectSourceUnchanged({
  directory,
  paths,
}: Readonly<{ directory: string; paths: readonly string[] }>): void {
  paths.forEach((path) => {
    expect(readFileSync(join(directory, path), "utf8")).toBe(SOURCE);
  });
}

it("serializes real CSS proof children across eager directory coverage", async () => {
  const directory = _createRepository();
  const paths = ["src/reviewed.css", "src/second.css", "src/third.css"];
  paths.forEach((path) => {
    writeFileSync(join(directory, path), SOURCE);
  });
  const log = _instrumentProofProcesses(directory);
  const result = await _coverage({
    directory: directory,
    path: ["src", "src/reviewed.css"],
  });
  expect(
    result.outcomes.filter((entry: { ruleId: string; capability: string }) => {
      return (
        entry.ruleId === "AF-20" &&
        entry.capability === "standalone-prose-comments"
      );
    }),
  ).toEqual(
    paths.map((path) => {
      return expect.objectContaining({
        path: join(directory, path),
        state: "enforced",
        operational: true,
      });
    }),
  );
  expect(_getProcessActivity(log)).toEqual({
    started: 3,
    maximum: 1,
    remaining: 0,
  });
  _expectSourceUnchanged({ directory: directory, paths: paths });
});

it("continues queued real CSS proofs after a preceding proof rejects", async () => {
  const brokenDirectory = _createRepository();
  writeFileSync(join(brokenDirectory, "package.json"), "{ invalid");
  const directory = _createRepository();
  const probes = createCssCoverageProbes();
  const catalog = loadRuleCatalog();
  const rule = catalog.rules.find((entry) => {
    return entry.id === "AF-20";
  })!;
  const rejectedProof = probes[0]!.prove({
    cwd: brokenDirectory,
    path: join(brokenDirectory, "src/reviewed.css"),
    rule,
  });
  const rejection = expect(rejectedProof).rejects.toThrow();
  const later = collectCoverage({
    catalog,
    probes,
    cwd: directory,
    paths: ["src"],
  });
  await rejection;
  const result = await later;
  expect(result.operational).toBe(true);
  expect(result.outcomes).toContainEqual(
    expect.objectContaining({
      ruleId: "AF-20",
      capability: "standalone-prose-comments",
      state: "enforced",
      path: join(directory, "src/reviewed.css"),
    }),
  );
  expect(result.outcomes).toContainEqual(
    expect.objectContaining({
      ruleId: "AF-20",
      capability: "unsupported-shapes",
      state: "fallback",
    }),
  );
  _expectSourceUnchanged({ directory: directory, paths: ["src/reviewed.css"] });
  _expectSourceUnchanged({
    directory: brokenDirectory,
    paths: ["src/reviewed.css"],
  });
});
