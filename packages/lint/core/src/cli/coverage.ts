import { readdir, stat } from "node:fs/promises";
import { extname, join, resolve } from "node:path";
import type { CatalogRule, RuleCatalog } from "../catalog/RuleCatalog.types.ts";

/** Exact engine evidence required before a review detector can be skipped. */
export type CoverageEvidence = {
  available: boolean;
  enabled: boolean;
  included: boolean;
  operational: boolean;
  exitCode: number;
  diagnosticRuleIds: string[];
  recovery?: string;
};

/** A proven engine integration for one independently testable capability. */
export type CoverageProbe = {
  ruleId: string;
  language: string;
  capability: string;
  prove: (
    input: Readonly<{ path: string; cwd: string; rule: CatalogRule }>,
  ) => Promise<CoverageEvidence>;
};

/**
 * Per-file result consumed by review tools. Fallback always needs detection.
 */
export type CoverageOutcome = {
  ruleId: string;
  language: string;
  path: string;
  capability: string;
  state: "enforced" | "not-applicable" | "fallback";
  recovery?: string;
  operational: boolean;
};

const LANGUAGES: Record<string, string> = {
  ts: "typescript",
  tsx: "typescript",
  mts: "typescript",
  cts: "typescript",
  js: "javascript",
  jsx: "javascript",
  mjs: "javascript",
  cjs: "javascript",
  py: "python",
  rs: "rust",
  go: "go",
  rb: "ruby",
  java: "java",
  kt: "kotlin",
  kts: "kotlin",
  swift: "swift",
  c: "c",
  h: "c",
  cpp: "cpp",
  cc: "cpp",
  hpp: "cpp",
  cs: "csharp",
  sql: "sql",
  css: "css",
  sh: "shell",
  bash: "shell",
  yaml: "yaml",
  yml: "yaml",
  jsonc: "jsonc",
  json: "json",
};
const EXCLUDED_DIRECTORIES = new Set([
  "node_modules",
  "dist",
  "build",
  ".git",
  ".temp",
  ".superpowers",
  ".agents",
  ".claude",
  ".videos",
  "coverage",
]);

async function _expandPath(
  path: string,
  isExplicit = false,
): Promise<string[]> {
  const info = await stat(path);
  if (!info.isDirectory()) {
    return !isExplicit && /\.(md|po|map)$/.test(path) ? [] : [path];
  }
  const entries = await readdir(path, { withFileTypes: true });
  const descendants = await Promise.all(
    entries
      .filter((entry) => {
        return !entry.isSymbolicLink() && !EXCLUDED_DIRECTORIES.has(entry.name);
      })
      .map((entry) => {
        return _expandPath(join(path, entry.name));
      }),
  );
  return descendants.flat();
}

function _getRecovery(
  evidence: Readonly<CoverageEvidence>,
  ruleId: string,
): string | undefined {
  if (!evidence.operational) {
    return "Run the repository lint command, repair its operational error, then retry coverage.";
  }
  if (evidence.recovery) {
    return evidence.recovery;
  }
  if (!evidence.available) {
    return "Install the required lint engine and plugin, then retry coverage.";
  }
  if (!evidence.included) {
    return "Include this path in the repository lint command, then retry coverage.";
  }
  if (!evidence.enabled) {
    return `Enable ${ruleId} in the repository lint configuration, then retry coverage.`;
  }
  if (evidence.exitCode === 0 || !evidence.diagnosticRuleIds.includes(ruleId)) {
    return "Verify the seeded violation reports the canonical rule ID with nonzero status.";
  }
  return undefined;
}

async function _probeOutcome(
  base: Readonly<CoverageOutcome>,
  probe: Readonly<CoverageProbe>,
  cwd: string,
  rule: CatalogRule,
): Promise<CoverageOutcome> {
  try {
    const evidence = await probe.prove({ path: base.path, cwd, rule });
    const recovery = _getRecovery(evidence, rule.id);
    return {
      ...base,
      capability: probe.capability,
      state: recovery ? "fallback" : "enforced",
      recovery,
      operational: evidence.operational,
    };
  } catch {
    return {
      ...base,
      capability: probe.capability,
      operational: false,
      recovery:
        "Run the repository lint command and repair the engine error, then retry coverage.",
    };
  }
}

async function _getOutcomes(
  path: string,
  catalog: Readonly<RuleCatalog>,
  probes: readonly CoverageProbe[],
  cwd: string,
): Promise<CoverageOutcome[]> {
  const language = LANGUAGES[extname(path).slice(1)] ?? "unknown";
  const outcomes = await Promise.all(
    catalog.rules
      .filter((rule) => {
        return rule.class !== "JR";
      })
      .map(async (rule) => {
        const base: CoverageOutcome = {
          ruleId: rule.id,
          language,
          path,
          capability: "all",
          state: "fallback",
          operational: true,
        };
        if (language !== "unknown" && !rule.applicability.includes(language)) {
          return [{ ...base, state: "not-applicable" as const }];
        }
        const matching = probes.filter((probe) => {
          return probe.ruleId === rule.id && probe.language === language;
        });
        if (!matching.length) {
          return [
            {
              ...base,
              recovery:
                "Install and enable an integration-tested engine for this rule, language, and capability. Run fallback review meanwhile.",
            },
          ];
        }
        return Promise.all(
          matching.map((probe) => {
            return _probeOutcome(base, probe, cwd, rule);
          }),
        );
      }),
  );
  return outcomes.flat();
}

/**
 * Aggregates conservatively so an uncovered file cannot hide in its language.
 */
export function summarizeCoverage(outcomes: readonly CoverageOutcome[]): Array<{
  ruleId: string;
  language: string;
  state: CoverageOutcome["state"];
  uncovered: Array<{ path: string; capability: string }>;
}> {
  const keys = [
    ...new Set(
      outcomes.map((outcome) => {
        return `${outcome.ruleId}:${outcome.language}`;
      }),
    ),
  ];
  return keys.map((key) => {
    const group = outcomes.filter((outcome) => {
      return `${outcome.ruleId}:${outcome.language}` === key;
    });
    const first = group[0]!;
    const fallback = group.filter((outcome) => {
      return outcome.state === "fallback";
    });
    return {
      ruleId: first.ruleId,
      language: first.language,
      state: fallback.length
        ? "fallback"
        : group.some((outcome) => {
              return outcome.state === "enforced";
            })
          ? "enforced"
          : "not-applicable",
      uncovered: fallback.map(({ path, capability }) => {
        return { path, capability };
      }),
    };
  });
}

/**
 * Checks exact paths against engine proofs. No registration implies fallback.
 */
export async function collectCoverage(
  input: Readonly<{
    catalog: RuleCatalog;
    paths: readonly string[];
    cwd?: string;
    probes?: readonly CoverageProbe[];
  }>,
): Promise<{
  operational: boolean;
  outcomes: CoverageOutcome[];
  summaries: ReturnType<typeof summarizeCoverage>;
}> {
  const cwd = input.cwd ?? process.cwd();
  const files = [
    ...new Set(
      (
        await Promise.all(
          input.paths.map((path) => {
            return _expandPath(resolve(cwd, path), true);
          }),
        )
      ).flat(),
    ),
  ].sort();
  const outcomes = (
    await Promise.all(
      files.map((path) => {
        return _getOutcomes(path, input.catalog, input.probes ?? [], cwd);
      }),
    )
  ).flat();
  return {
    operational: outcomes.every((outcome) => {
      return outcome.operational;
    }),
    outcomes,
    summaries: summarizeCoverage(outcomes),
  };
}
