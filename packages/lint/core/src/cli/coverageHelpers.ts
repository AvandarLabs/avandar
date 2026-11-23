import { readdir, stat } from "node:fs/promises";
import { extname, join, resolve } from "node:path";
import type { CatalogRule, RuleCatalog } from "../catalog/RuleCatalog.types.ts";

/** Inputs consumed by _probeOutcome. */
type ProbeOutcomeOptions = {
  base: Readonly<CoverageOutcome>;
  probe: Readonly<CoverageProbe>;
  cwd: string;
  rule: CatalogRule;
};

/** Inputs consumed by _getOutcomes. */
type GetOutcomesOptions = {
  path: string;
  catalog: Readonly<RuleCatalog>;
  probes: readonly CoverageProbe[];
  cwd: string;
};

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
    options: Readonly<{ path: string; cwd: string; rule: CatalogRule }>,
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
const EXCLUDED_DIRECTORIES: Set<string> = new Set([
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

async function _expandPath({
  path,
  isExplicit = false,
}: Readonly<{ path: string; isExplicit?: boolean }>): Promise<string[]> {
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
        return _expandPath({ path: join(path, entry.name) });
      }),
  );
  return descendants.flat();
}

function _getRecovery({
  evidence,
  ruleId,
}: Readonly<{ evidence: Readonly<CoverageEvidence>; ruleId: string }>):
  | string
  | undefined {
  return !evidence.operational
    ? (evidence.recovery ??
        "Run the repository lint command, repair its operational error, then retry coverage.")
    : evidence.recovery
      ? evidence.recovery
      : !evidence.available
        ? "Install the required lint engine and plugin, then retry coverage."
        : !evidence.included
          ? "Include this path in the repository lint command, then retry coverage."
          : !evidence.enabled
            ? `Enable ${ruleId} in the repository lint configuration, then retry coverage.`
            : evidence.exitCode === 0 ||
                !evidence.diagnosticRuleIds.includes(ruleId)
              ? "Verify the seeded violation reports the canonical rule ID with nonzero status."
              : undefined;
}

async function _probeOutcome({
  base,
  probe,
  cwd,
  rule,
}: Readonly<ProbeOutcomeOptions>): Promise<CoverageOutcome> {
  try {
    const evidence = await probe.prove({ path: base.path, cwd, rule });
    const recovery = _getRecovery({ evidence: evidence, ruleId: rule.id });
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

async function _getOutcomes({
  path,
  catalog,
  probes,
  cwd,
}: Readonly<GetOutcomesOptions>): Promise<CoverageOutcome[]> {
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
            return _probeOutcome({
              base: base,
              probe: probe,
              cwd: cwd,
              rule: rule,
            });
          }),
        );
      }),
  );
  return outcomes.flat();
}

/**
 * Summarizes coverage by rule and language, retaining fallback paths and
 * capabilities.
 * Use it, for example, to report whether any file needs fallback review.
 */
export function createCoverageSummariesFromOutcomes(
  outcomes: readonly CoverageOutcome[],
): CoverageSummary[] {
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

/** Inputs used to collect exact per-file lint coverage. */
export type CoverageOptions = {
  catalog: RuleCatalog;
  paths: readonly string[];
  cwd?: string;
  probes?: readonly CoverageProbe[];
};

/**
 * Aggregate coverage state and uncovered capabilities for one rule and
 * language.
 */
export type CoverageSummary = {
  ruleId: string;
  language: string;
  state: CoverageOutcome["state"];
  uncovered: Array<{ path: string; capability: string }>;
};

/** Exact per-file evidence and aggregate coverage status. */
export type CoverageReport = {
  operational: boolean;
  outcomes: CoverageOutcome[];
  summaries: CoverageSummary[];
};

/**
 * Collects per-file coverage outcomes, operational status, and rule-language
 * summaries.
 * Use it, for example, to determine which paths need fallback review.
 */
export async function collectCoverage(
  options: Readonly<CoverageOptions>,
): Promise<CoverageReport> {
  const cwd = options.cwd ?? process.cwd();
  const files = [
    ...new Set(
      (
        await Promise.all(
          options.paths.map((path) => {
            return _expandPath({ path: resolve(cwd, path), isExplicit: true });
          }),
        )
      ).flat(),
    ),
  ].sort();
  const outcomes = (
    await Promise.all(
      files.map((path) => {
        return _getOutcomes({
          path: path,
          catalog: options.catalog,
          probes: options.probes ?? [],
          cwd: cwd,
        });
      }),
    )
  ).flat();
  return {
    operational: outcomes.every((outcome) => {
      return outcome.operational;
    }),
    outcomes,
    summaries: createCoverageSummariesFromOutcomes(outcomes),
  };
}
