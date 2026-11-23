import { spawnSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { loadRuleCatalog } from "../../../src/catalog/index";
import {
  collectCoverage,
  summarizeCoverage,
  type CoverageProbe,
} from "../../../src/cli/coverage";
import {
  createCoverageDirectory as _createDirectory,
  COVERAGE_CATALOG as catalog,
} from "./coverage.fixtures";

/** Coverage claims require engine evidence for every file and capability. */
describe("coverage", () => {
  it("enforces an enabled seeded rule only after the real engine reports its violation", async () => {
    const directory = _createDirectory();
    writeFileSync(
      join(directory, ".oxlintrc.json"),
      JSON.stringify({
        categories: { correctness: "off" },
        rules: { curly: "error" },
      }),
    );
    writeFileSync(
      join(directory, "seed.ts"),
      "if (true) console.log('seed');\n",
    );
    const probe: CoverageProbe = {
      ruleId: "AF-01",
      language: "typescript",
      capability: "if-body",
      prove: async () => {
        const result = spawnSync(
          resolve(
            import.meta.dirname,
            "../../../../../../node_modules/.bin/oxlint",
          ),
          [
            "--config",
            join(directory, ".oxlintrc.json"),
            "--format",
            "json",
            join(directory, "seed.ts"),
          ],
          { encoding: "utf8" },
        );
        const diagnostics = JSON.parse(result.stdout).diagnostics;
        return {
          available: true,
          enabled: true,
          included: true,
          operational: !result.error,
          exitCode: result.status ?? 0,
          diagnosticRuleIds: diagnostics.some(
            (diagnostic: { code: string }) => {
              return diagnostic.code.includes("curly");
            },
          )
            ? ["AF-01"]
            : [],
        };
      },
    };
    const result = await collectCoverage({
      catalog,
      paths: [join(directory, "seed.ts")],
      probes: [probe],
    });
    expect(result.outcomes[0]).toMatchObject({
      state: "enforced",
      capability: "if-body",
    });
  });

  it.each([
    "disabled",
    "missing-plugin",
    "excluded",
    "operational",
    "unproven",
  ])("falls back when evidence is %s", async (reason) => {
    const directory = _createDirectory();
    const path = join(directory, "seed.ts");
    writeFileSync(path, "export {};\n");
    const result = await collectCoverage({
      catalog,
      paths: [path],
      probes: [
        {
          ruleId: "AF-01",
          language: "typescript",
          capability: "if-body",
          prove: async () => {
            return {
              available: reason !== "missing-plugin",
              enabled: reason !== "disabled",
              included: reason !== "excluded",
              operational: reason !== "operational",
              exitCode: reason === "unproven" ? 0 : 1,
              diagnosticRuleIds: ["AF-01"],
            };
          },
        },
      ],
    });
    expect(result.outcomes[0]?.state).toBe("fallback");
    expect(result.outcomes[0]?.recovery).toMatch(
      /Run|Enable|Install|Include|Verify/,
    );
  });

  it("keeps a language summary in fallback for mixed capabilities", async () => {
    const directory = _createDirectory();
    const paths = ["supported.ts", "unsupported.ts"].map((name) => {
      return join(directory, name);
    });
    paths.forEach((path) => {
      return writeFileSync(path, "export {};\n");
    });
    const result = await collectCoverage({
      catalog,
      paths,
      probes: [
        {
          ruleId: "AF-01",
          language: "typescript",
          capability: "supported-framework",
          prove: async ({ path }) => {
            return {
              available: true,
              enabled: true,
              included: true,
              operational: true,
              exitCode: 1,
              diagnosticRuleIds: path.endsWith("unsupported.ts")
                ? []
                : ["AF-01"],
            };
          },
        },
      ],
    });
    expect(
      result.outcomes.map((entry) => {
        return entry.state;
      }),
    ).toEqual(["enforced", "fallback"]);
    expect(summarizeCoverage(result.outcomes)[0]?.state).toBe("fallback");
  });

  it("falls back for unknown languages and reports JSON comment rules as not applicable", async () => {
    const directory = _createDirectory();
    const paths = ["unknown.xyz", "data.json"].map((name) => {
      return join(directory, name);
    });
    paths.forEach((path) => {
      return writeFileSync(path, "{}");
    });
    const result = await collectCoverage({ catalog: loadRuleCatalog(), paths });
    expect(
      result.outcomes.find((entry) => {
        return entry.path.endsWith("unknown.xyz");
      })?.state,
    ).toBe("fallback");
    expect(
      result.outcomes.find((entry) => {
        return entry.path.endsWith("data.json") && entry.ruleId === "GD-01";
      })?.state,
    ).toBe("not-applicable");
  });

  it.each(["md", "po", "map"])(
    "reports fallback for an explicitly reviewed .%s file",
    async (extension) => {
      const directory = _createDirectory();
      const path = join(directory, `reviewed.${extension}`);
      writeFileSync(path, "reviewed content");
      const result = await collectCoverage({ catalog, paths: [path] });
      expect(result.outcomes).toMatchObject([
        { path, language: "unknown", state: "fallback" },
      ]);
      expect(result.summaries).toMatchObject([
        {
          language: "unknown",
          state: "fallback",
          uncovered: [{ path, capability: "all" }],
        },
      ]);
    },
  );

  it("retains unsupported explicit paths beside enforced TypeScript paths", async () => {
    const directory = _createDirectory();
    const supportedPath = join(directory, "supported.ts");
    const unsupportedPath = join(directory, "README.md");
    [supportedPath, unsupportedPath].forEach((path) => {
      writeFileSync(path, "reviewed content");
    });
    const result = await collectCoverage({
      catalog,
      paths: [supportedPath, unsupportedPath],
      probes: [
        {
          ruleId: "AF-01",
          language: "typescript",
          capability: "if-body",
          prove: async () => {
            return {
              available: true,
              enabled: true,
              included: true,
              operational: true,
              exitCode: 1,
              diagnosticRuleIds: ["AF-01"],
            };
          },
        },
      ],
    });
    expect(result.outcomes).toHaveLength(2);
    expect(
      result.outcomes.find((outcome) => {
        return outcome.path === supportedPath;
      })?.state,
    ).toBe("enforced");
    expect(
      result.outcomes.find((outcome) => {
        return outcome.path === unsupportedPath;
      })?.state,
    ).toBe("fallback");
  });

  it("turns a thrown probe error into an operational fallback", async () => {
    const directory = _createDirectory();
    const path = join(directory, "seed.ts");
    writeFileSync(path, "export {};\n");
    const result = await collectCoverage({
      catalog,
      paths: [path],
      probes: [
        {
          ruleId: "AF-01",
          language: "typescript",
          capability: "if-body",
          prove: async () => {
            throw new Error("broken engine");
          },
        },
      ],
    });
    expect(result.operational).toBe(false);
    expect(result.outcomes[0]?.state).toBe("fallback");
  });
});
