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
import { runCli } from "../../../src/cli/main";

const ROOT = resolve(import.meta.dirname, "../../../../../..");
const RULE = "avandar/canonical-block-comments";
const SOURCE = ".reviewed { color: red; }\n";
const directories: string[] = [];

afterEach(() => {
  directories.splice(0).forEach((directory) => {
    rmSync(directory, { recursive: true, force: true });
  });
});

function _createRepository() {
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

function _setRefusal(directory: string, reason: string) {
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

async function _coverage(
  directory: string,
  path = "src/reviewed.css",
  expectedStatus = 0,
) {
  const stdout: string[] = [];
  const status = await runCli(
    ["coverage", path, "--format", "json", "--no-prompt"],
    {
      cwd: directory,
      stdout: (value) => {
        stdout.push(value);
      },
      stderr: () => {},
    },
  );
  expect(status).toBe(expectedStatus);
  const result = JSON.parse(stdout.join(""));
  return result;
}

it.each(["src/reviewed.css", "apps/ava-video-producer/reviewed.css"])(
  "proves supported CSS markers at the selected original filename: %s",
  async (path) => {
    const directory = _createRepository();
    const result = await _coverage(directory, path);
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
  _setRefusal(directory, reason);
  const original = readFileSync(join(directory, "src/reviewed.css"), "utf8");
  const result = await _coverage(
    directory,
    undefined,
    ["missing-plugin", "malformed", "parse-error"].includes(reason) ? 1 : 0,
  );
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
  expect((await _coverage(directory)).outcomes).toContainEqual(
    expect.objectContaining({
      ruleId: "AF-20",
      capability: "standalone-prose-comments",
      state: "enforced",
    }),
  );
  expect(
    (await _coverage(directory, "apps/ava-video-producer/reviewed.css"))
      .outcomes,
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
  const result = await _coverage(directory, "src/reviewed.gen.css");
  expect(result.outcomes).toContainEqual(
    expect.objectContaining({
      ruleId: "AF-20",
      capability: "standalone-prose-comments",
      state: "fallback",
    }),
  );
});
