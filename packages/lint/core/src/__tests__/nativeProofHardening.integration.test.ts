import { mkdtempSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, it } from "vitest";
import {
  collectNativeCoverage as _coverage,
  createNativeRepository as _repository,
  directories,
} from "./nativeProof.fixtures";

it("accepts canonical pinned-engine diagnostics inside exact Unicode byte ranges", async () => {
  const result = await _coverage({ directory: _repository() });
  expect(result.status).toBe(0);
  expect(
    result.outcomes
      .filter((entry: { state: string }) => {
        return entry.state === "enforced";
      })
      .map((entry: { ruleId: string; capability: string }) => {
        return `${entry.ruleId}:${entry.capability}`;
      }),
  ).toEqual([
    "AF-01:if-body",
    "AF-03:type-imports",
    "AF-03:type-exports",
    "AF-04:literal-assertions",
    "AF-06:standalone-body-prose",
    "AF-07:short-prose-jsdoc",
    "AF-08:direct-top-level-calls",
    "AF-09:direct-nested-calls",
    "AF-10:private-direct-calls",
    "AF-11:one-to-one-module-key",
    "AF-12:single-component-props",
    "AF-14:boolean-jsx-children",
    "AF-15:literal-property-map",
    "AF-15:literal-property-equality",
    "AF-16:fresh-data-object",
    "AF-17:optional-parameter-candidates",
  ]);
});

it("does not own another invocation's temporary mirror", async () => {
  const owner = mkdtempSync(join(tmpdir(), "mirror-ownership-"));
  directories.push(owner);
  const record = join(owner, "unrelated.txt");
  const directory = _repository(`
    const unrelated = require("node:fs").mkdtempSync(${JSON.stringify(join(tmpdir(), "avandar-native-proof-unrelated-"))});
    require("node:fs").writeFileSync(${JSON.stringify(record)}, unrelated);
  `);
  try {
    expect((await _coverage({ directory: directory })).status).toBe(0);
    expect(readdirSync(readFileSync(record, "utf8"))).toEqual([]);
  } finally {
    rmSync(readFileSync(record, "utf8"), { recursive: true, force: true });
  }
});

it.each([
  [
    "sibling path",
    'output.diagnostics.forEach(diagnostic => { diagnostic.filename = "src/sibling.tsx"; });',
  ],
  [
    "original workspace path",
    `output.diagnostics.forEach(diagnostic => { diagnostic.filename = ORIGINAL_PATH; });`,
  ],
  [
    "missing path",
    "output.diagnostics.forEach(diagnostic => { delete diagnostic.filename; });",
  ],
  [
    "wrong canonical namespace",
    'output.diagnostics.forEach(diagnostic => { diagnostic.code = diagnostic.code.replace(/^[^(]+/, "lookalike"); });',
  ],
  [
    "original source labels",
    "output.diagnostics.forEach(diagnostic => { diagnostic.labels.forEach(label => { label.span.offset = 0; }); });",
  ],
  [
    "past final seed",
    "output.diagnostics.forEach(diagnostic => { diagnostic.labels.forEach(label => { label.span.offset = 1000000; }); });",
  ],
  [
    "range crossing label",
    "output.diagnostics.forEach(diagnostic => { diagnostic.labels.forEach(label => { label.span.length = 1000000; }); });",
  ],
  [
    "zero length label",
    "output.diagnostics.forEach(diagnostic => { diagnostic.labels.forEach(label => { label.span.length = 0; }); });",
  ],
  [
    "warning-only evidence",
    'output.diagnostics.forEach(diagnostic => { diagnostic.severity = "warning"; }); status = 0;',
  ],
  ["unexpected exit", "status = 2;"],
  ["unknown truncation envelope", "output.truncated = true;"],
  ["missing diagnostics schema", "delete output.diagnostics;"],
  ["malformed diagnostic", "output.diagnostics.push(null);"],
  [
    "runtime error beside rules",
    'output.diagnostics.push({ code: "oxlint", message: "Plugin runtime error", severity: "error", filename: "src/reviewed.tsx", labels: [] });',
  ],
])(
  "rejects %s from an otherwise real engine proof",
  async (_reason, transform) => {
    const directory = _repository(transform);
    const result = await _coverage({ directory: directory });
    expect(
      result.outcomes.filter((entry: { state: string }) => {
        return entry.state === "enforced";
      }),
    ).toEqual([]);
  },
);

it("does not credit the equality seed diagnostic to the map capability", async () => {
  const result = await _coverage({
    directory: _repository(`
    const utility = output.diagnostics.filter(diagnostic => diagnostic.code === "avandar(property-helper-callbacks)");
    const equality = utility.sort((first, second) => second.labels[0].span.offset - first.labels[0].span.offset)[0];
    if (!equality) throw new Error("Missing actual utility diagnostics");
    output.diagnostics = output.diagnostics.filter(diagnostic => diagnostic.code !== "avandar(property-helper-callbacks)" || diagnostic === equality);
  `),
  });
  expect(result.status).toBe(0);
  expect(result.outcomes).toContainEqual(
    expect.objectContaining({
      ruleId: "AF-15",
      capability: "literal-property-map",
      state: "fallback",
    }),
  );
  expect(result.outcomes).toContainEqual(
    expect.objectContaining({
      ruleId: "AF-15",
      capability: "literal-property-equality",
      state: "enforced",
    }),
  );
});
