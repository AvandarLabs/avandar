import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { expect, it } from "vitest";
import {
  SAFE,
  PROOF_IMPORT,
  createUtilityRepository as _createRepository,
  collectUtilityCoverage as _coverage,
} from "./utilityFixers.fixtures";

it.each(["ts", "tsx", "js", "jsx"])(
  "proves canonical utility errors in the original import context for %s",
  async (extension) => {
    const directory = _createRepository(extension);
    const result = await _coverage(directory, extension);
    SAFE.forEach(([ruleId, capability]) => {
      expect(result.outcomes).toContainEqual(
        expect.objectContaining({
          ruleId,
          capability,
          state:
            ruleId === "AF-17" && ["js", "jsx"].includes(extension)
              ? "fallback"
              : "enforced",
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
    ).toBe(PROOF_IMPORT);
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
])("keeps utility proofs in fallback when %s", async (reason) => {
  const directory = _createRepository();
  const path = join(
    directory,
    reason === "nested" ? "src/.oxlintrc.json" : ".oxlintrc.json",
  );
  const config =
    reason === "nested"
      ? {
          jsPlugins: [
            { name: "avandar", specifier: "@avandar/lint-typescript/oxlint" },
          ],
        }
      : JSON.parse(readFileSync(path, "utf8"));
  if (reason === "source-disabled") {
    writeFileSync(
      join(directory, "src/reviewed.ts"),
      `/* eslint-disable ${[
        ...new Set(
          SAFE.map(([, , name]) => {
            return `avandar/${name}`;
          }),
        ),
      ].join(", ")} */\n${PROOF_IMPORT}`,
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
  const result = await _coverage(
    directory,
    "ts",
    ["missing-plugin", "malformed"].includes(reason) ? 1 : 0,
  );
  SAFE.forEach(([ruleId, capability]) => {
    expect(result.outcomes).toContainEqual(
      expect.objectContaining({ ruleId, capability, state: "fallback" }),
    );
  });
});

it.each([
  "const globalValue = 1;",
  "export {};",
  "const marker = 'import \"@avandar/utils\";';",
  '/* import "@avandar/utils"; */',
  'import type { prop } from "@avandar/utils";',
])(
  "does not manufacture utility availability or module context: %s",
  async (source) => {
    const result = await _coverage(_createRepository("ts", source));
    SAFE.filter(([ruleId]) => {
      return ruleId !== "AF-16";
    }).forEach(([ruleId, capability]) => {
      expect(result.outcomes).toContainEqual(
        expect.objectContaining({ ruleId, capability, state: "fallback" }),
      );
    });
  },
);

it("keeps two import-dependent capabilities independent in the seeded proof", async () => {
  const result = await _coverage(
    _createRepository("ts", 'import { prop } from "@avandar/utils";\n'),
  );
  expect(result.outcomes).toContainEqual(
    expect.objectContaining({
      ruleId: "AF-15",
      capability: "literal-property-map",
      state: "enforced",
    }),
  );
  expect(result.outcomes).toContainEqual(
    expect.objectContaining({
      ruleId: "AF-15",
      capability: "literal-property-equality",
      state: "fallback",
    }),
  );
  expect(result.outcomes).toContainEqual(
    expect.objectContaining({
      ruleId: "AF-17",
      capability: "optional-parameter-candidates",
      state: "fallback",
    }),
  );
});

it("does not credit the map capability from an equality diagnostic", async () => {
  const result = await _coverage(
    _createRepository("ts", 'import { propEq } from "@avandar/utils";\n'),
  );
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
