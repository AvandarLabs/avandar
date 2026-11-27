import { mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { expect, it } from "vitest";
import { loadRuleCatalog } from "../catalog/loadRuleCatalog";
import { collectCoverage } from "../cli/coverageHelpers";
import { createNativeCoverageProbes } from "../cli/nativeSafeRules/createNativeCoverageProbes";
import {
  ORIGINAL,
  collectNativeCoverage as _coverage,
  createNativeRepository as _repository,
} from "./nativeProof.fixtures";

it("reuses one inclusion listing for isolated mixed-language proofs and late requests", async () => {
  const directory = _repository();
  const paths = [
    "src/a.ts",
    "src/b.tsx",
    "src/c.js",
    "src/d.jsx",
    "src/e.ts",
    "src/f.js",
  ];
  [...paths, "src/late.ts"].forEach((path) => {
    writeFileSync(join(directory, path), ORIGINAL);
  });
  const probes = createNativeCoverageProbes();
  const collect = (selected: string[]) => {
    return collectCoverage({
      catalog: loadRuleCatalog(),
      cwd: directory,
      paths: selected,
      probes,
    });
  };
  const start = performance.now();
  const first = await collect(paths);
  const late = await collect(["src/late.ts", "src/a.ts"]);
  expect(first.operational).toBe(true);
  expect(late.operational).toBe(true);
  expect(
    first.outcomes.filter((entry) => {
      return entry.ruleId === "AF-01" && entry.state === "enforced";
    }),
  ).toHaveLength(6);
  expect(
    late.outcomes.filter((entry) => {
      return entry.ruleId === "AF-01" && entry.state === "enforced";
    }),
  ).toHaveLength(2);
  const events = readFileSync(join(directory, "children.jsonl"), "utf8")
    .trim()
    .split("\n")
    .map((line) => {
      return JSON.parse(line);
    });
  const starts = events.filter((event) => {
    return event.event === "start";
  });
  console.info(
    JSON.stringify({
      measurement: "mixed-isolated-proof",
      milliseconds: Math.round(performance.now() - start),
      children: starts.length,
      listings: starts.filter((event) => {
        return event.args.includes("files");
      }).length,
    }),
  );
  expect(
    starts.filter((event) => {
      return event.args.includes("files");
    }),
  ).toHaveLength(1);
  expect(
    starts.filter((event) => {
      return event.args.includes("json");
    }),
  ).toHaveLength(7);
  let active = 0;
  events.forEach((event) => {
    active += event.event === "start" ? 1 : -1;
    expect(active).toBeGreaterThanOrEqual(0);
    expect(active).toBeLessThanOrEqual(1);
  });
  expect(active).toBe(0);
  paths.forEach((path) => {
    expect(readFileSync(join(directory, path), "utf8")).toBe(ORIGINAL);
  });
  starts
    .filter((event) => {
      return event.args.includes("json");
    })
    .forEach((event) => {
      expect(() => {
        return readdirSync(event.cwd);
      }).toThrow();
    });
}, 15000);

it("keeps cached inclusion listings scoped to each source cwd", async () => {
  const first = _repository();
  const second = _repository();
  const configPath = join(first, ".oxlintrc.json");
  const config = JSON.parse(readFileSync(configPath, "utf8"));
  config.rules.curly = "off";
  config.overrides = [];
  writeFileSync(configPath, JSON.stringify(config));
  const probes = createNativeCoverageProbes();
  await Promise.all(
    [
      { directory: first, state: "fallback" },
      { directory: second, state: "enforced" },
    ].map(async ({ directory, state }) => {
      const result = await collectCoverage({
        catalog: loadRuleCatalog(),
        probes,
        cwd: directory,
        paths: ["src/reviewed.tsx"],
      });
      expect(result.outcomes).toContainEqual(
        expect.objectContaining({ ruleId: "AF-01", state }),
      );
      const events = readFileSync(join(directory, "children.jsonl"), "utf8")
        .trim()
        .split("\n")
        .map((line) => {
          return JSON.parse(line);
        });
      expect(
        events.filter((event) => {
          return event.event === "start" && event.args.includes("files");
        }),
      ).toHaveLength(1);
    }),
  );
});

it("keeps same basenames independent under error warning and disabled overrides", async () => {
  const directory = _repository();
  const paths = ["error", "warning", "disabled"].map((name) => {
    mkdirSync(join(directory, "src", name));
    const path = `src/${name}/reviewed.ts`;
    writeFileSync(join(directory, path), ORIGINAL);
    return path;
  });
  const configPath = join(directory, ".oxlintrc.json");
  const config = JSON.parse(readFileSync(configPath, "utf8"));
  config.overrides.push(
    ...["warning", "disabled"].map((name) => {
      return {
        files: [`src/${name}/reviewed.ts`],
        rules: {
          curly: name === "warning" ? "warn" : "off",
          "avandar/module-context-witness": name === "warning" ? "warn" : "off",
        },
      };
    }),
  );
  writeFileSync(configPath, JSON.stringify(config));
  const result = await _coverage({ directory: directory, paths: paths });
  expect(result.status).toBe(0);
  ["AF-01", "AF-08", "AF-09", "AF-10"].forEach((ruleId) => {
    expect(
      result.outcomes.filter((entry: { ruleId: string; state: string }) => {
        return entry.ruleId === ruleId && entry.state === "enforced";
      }),
    ).toEqual([expect.objectContaining({ path: join(directory, paths[0]!) })]);
  });
});

it.each([false, true])(
  "retains suppression fallback and source bytes with reenabled=%s",
  async (reenabled) => {
    const directory = _repository();
    const source = `export {};\n/* eslint-disable curly */\nif (Boolean(1)) consume();\n${reenabled ? "/* eslint-enable curly */\n" : ""}`;
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
        ruleId: "AF-01",
        state: "fallback",
      }),
    );
    expect(readFileSync(join(directory, "src/reviewed.tsx"), "utf8")).toBe(
      source,
    );
  },
);

it("settles later requests after an operational proof failure", async () => {
  const directory = _repository(
    'if (process.argv.some(argument => argument.includes("fail.ts"))) { delete output.diagnostics; }',
  );
  writeFileSync(join(directory, "src/fail.ts"), ORIGINAL);
  const probes = createNativeCoverageProbes();
  const collect = (paths: string[]) => {
    return collectCoverage({
      catalog: loadRuleCatalog(),
      probes,
      paths,
      cwd: directory,
    });
  };
  const first = await collect(["src/fail.ts", "src/reviewed.tsx"]);
  expect(first.operational).toBe(false);
  expect(first.outcomes).toContainEqual(
    expect.objectContaining({
      path: join(directory, "src/reviewed.tsx"),
      ruleId: "AF-01",
      state: "enforced",
    }),
  );
  const late = await collect(["src/reviewed.tsx"]);
  expect(late.operational).toBe(true);
  expect(late.outcomes).toContainEqual(
    expect.objectContaining({ ruleId: "AF-01", state: "enforced" }),
  );
});
