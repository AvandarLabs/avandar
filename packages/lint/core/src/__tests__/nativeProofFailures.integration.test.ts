import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { expect, it } from "vitest";
import { loadRuleCatalog } from "../catalog/loadRuleCatalog";
import { runCli } from "../cli/cliHelpers";
import { collectCoverage } from "../cli/coverageHelpers";
import { createNativeCoverageProbes } from "../cli/nativeSafeRules/createNativeCoverageProbes";
import {
  collectNativeCoverage as _coverage,
  createNativeRepository as _repository,
} from "./nativeProof.fixtures";

it("keeps oversized source bounded without starting a seed child", async () => {
  const directory = _repository();
  const source = `//${"x".repeat(1024 * 1024)}\nexport {};\n`;
  writeFileSync(join(directory, "src/reviewed.tsx"), source);
  const stdout: string[] = [];
  expect(
    await runCli({
      args: ["coverage", "src/reviewed.tsx", "--format", "json", "--no-prompt"],
      io: {
        cwd: directory,
        stdout: (value) => {
          stdout.push(value);
        },
        stderr: () => {},
      },
    }),
  ).toBe(0);
  const result = JSON.parse(stdout.join(""));
  expect(result.outcomes).toContainEqual(
    expect.objectContaining({
      ruleId: "avlint-ts-001",
      state: "fallback",
      recovery: expect.stringContaining("source-byte bound"),
    }),
  );
  expect(result.outcomes).toContainEqual(
    expect.objectContaining({
      ruleId: "avlint-ts-006",
      capability: "direct-top-level-calls",
      state: "fallback",
      recovery: expect.stringContaining("source-byte bound"),
    }),
  );
  const events = readFileSync(join(directory, "children.jsonl"), "utf8");
  expect(events).not.toContain('"json"');
  expect(readFileSync(join(directory, "src/reviewed.tsx"), "utf8")).toBe(
    source,
  );
});

it("chooses seed identifiers absent from the original prefix", async () => {
  const directory = _repository();
  const source =
    "const _avandarModuleContext = 2;\nconsume(_avandarModuleContext);\nexport {};\n";
  writeFileSync(join(directory, "src/reviewed.tsx"), source);
  const result = await collectCoverage({
    catalog: loadRuleCatalog(),
    probes: createNativeCoverageProbes(),
    paths: ["src/reviewed.tsx"],
    cwd: directory,
  });
  expect(result.operational).toBe(true);
  expect(result.outcomes).toContainEqual(
    expect.objectContaining({
      ruleId: "avlint-ts-006",
      capability: "direct-top-level-calls",
      state: "enforced",
    }),
  );
  expect(readFileSync(join(directory, "src/reviewed.tsx"), "utf8")).toBe(
    source,
  );
});

it.each([
  ["malformed JSON", 'process.stdout.write("{"); process.exit(1);'],
  ["output overflow", 'process.stdout.write("x".repeat(9 * 1024 * 1024));'],
  [
    "runtime stderr",
    'process.stderr.write("Error: plugin runtime failed\\n");',
  ],
  ["signal", 'process.kill(process.pid, "SIGTERM");'],
  [
    "timeout",
    "Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 35000);",
  ],
])(
  "fails closed and cleans mirrors after %s",
  async (_reason, transform) => {
    const result = await _coverage({ directory: _repository(transform) });
    expect(result.status).toBe(1);
    expect(result.outcomes).toContainEqual(
      expect.objectContaining({
        ruleId: "avlint-ts-001",
        state: "fallback",
        operational: false,
      }),
    );
    expect(
      result.outcomes.filter((entry: { state: string }) => {
        return entry.state === "enforced";
      }),
    ).toEqual([]);
  },
  40000,
);

it("fails operationally when the actual configured plugin throws during rule creation", async () => {
  const directory = _repository();
  writeFileSync(
    join(directory, "failing-plugin.js"),
    'export default { meta: { name: "broken" }, rules: { fail: { meta: { schema: [] }, create() { throw new Error("Intentional coverage fixture failure"); } } } };\n',
  );
  const configPath = join(directory, ".oxlintrc.json");
  const config = JSON.parse(readFileSync(configPath, "utf8"));
  config.jsPlugins.push({ name: "broken", specifier: "./failing-plugin.js" });
  config.rules["broken/fail"] = "error";
  writeFileSync(configPath, JSON.stringify(config));
  const result = await _coverage({ directory: directory });
  expect(result.status).toBe(1);
  expect(result.outcomes).toContainEqual(
    expect.objectContaining({
      ruleId: "avlint-ts-001",
      state: "fallback",
      operational: false,
    }),
  );
  expect(
    result.outcomes.filter((entry: { state: string }) => {
      return entry.state === "enforced";
    }),
  ).toEqual([]);
});
