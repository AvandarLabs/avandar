import { execFile } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join, relative, sep } from "node:path";
import { pathToFileURL } from "node:url";
import type { CoverageEvidence, CoverageProbe } from "./coverage.ts";

const UNPROVEN: CoverageEvidence = {
  available: false,
  enabled: false,
  included: false,
  operational: true,
  exitCode: 0,
  diagnosticRuleIds: [],
};
// Keep dynamic config imports in the original repository.
const PROOF_SCRIPT = `
import { readFileSync } from 'node:fs';
const { engine, files, path, cwd } = JSON.parse(process.argv[1]);
const { default: stylelint } = await import(engine);
const ruleName = 'avandar/canonical-block-comments';
const result = { available: true, enabled: false, included: false,
  operational: true, exitCode: 0, diagnosticRuleIds: [] };
function hasErrors(entries) {
  return entries.some((entry) => entry.parseErrors.length ||
    entry.invalidOptionWarnings.length || entry.warnings.some((warning) =>
      warning.rule === 'CssSyntaxError' || warning.text.startsWith('Unknown rule ')));
}
try {
  const listing = await stylelint.lint({ files, cwd, fix: false, allowEmptyInput: true });
  result.operational = !hasErrors(listing.results);
  result.included = listing.results.some((entry) => entry.source === path && !entry.ignored);
  if (result.included && result.operational) {
    const config = await stylelint.resolveConfig(path, { cwd });
    const source = readFileSync(path, 'utf8');
    const seed = '\\n/* Avandar coverage first sentence.\\n   Avandar coverage second sentence. */\\n';
    const seeded = await stylelint.lint({ code: source + seed, codeFilename: path, cwd, fix: false });
    result.operational = !hasErrors(seeded.results);
    const seedLine = source.split('\\n').length + 1;
    result.enabled = !config?.customSyntax && !config?.rules?.[ruleName]?.[1]?.disableFix &&
      seeded.results.some((entry) => entry.warnings.some((warning) =>
        warning.rule === ruleName && warning.severity === 'error' &&
        warning.text.startsWith('AF-20:') && warning.line === seedLine));
    result.exitCode = seeded.errored ? 2 : 0;
    result.diagnosticRuleIds = result.enabled ? ['AF-20'] : [];
  }
} catch {
  result.operational = false;
  result.exitCode = 1;
}
process.stdout.write(JSON.stringify(result));
process.exitCode = result.exitCode;
`;

function _getFiles(cwd: string): string[] | undefined {
  const manifestPath = join(cwd, "package.json");
  if (!existsSync(manifestPath)) {
    return undefined;
  }
  const scripts = JSON.parse(readFileSync(manifestPath, "utf8")).scripts;
  const command = scripts?.["lint:css"];
  if (
    typeof command !== "string" ||
    !/^stylelint(?: "[a-zA-Z0-9_./*{}!-]+\.css")+$/.test(command) ||
    !scripts?.lint?.split("&&").some((segment: string) => {
      return segment.trim() === command;
    })
  ) {
    return undefined;
  }
  return command
    .slice("stylelint ".length)
    .split(" ")
    .map((argument) => {
      return argument.slice(1, -1);
    });
}

function _runProof(
  input: Readonly<{
    engine: string;
    files: string[];
    path: string;
    cwd: string;
  }>,
): Promise<CoverageEvidence> {
  return new Promise((resolveResult) => {
    execFile(
      process.execPath,
      ["--input-type=module", "-e", PROOF_SCRIPT, JSON.stringify(input)],
      {
        cwd: input.cwd,
        encoding: "utf8",
        timeout: 30000,
        maxBuffer: 1024 * 1024,
      },
      (error, stdout) => {
        try {
          const evidence = JSON.parse(stdout) as CoverageEvidence;
          const status = error ? error.code : 0;
          resolveResult({
            ...evidence,
            operational:
              evidence.operational &&
              typeof status === "number" &&
              status === evidence.exitCode,
          });
        } catch {
          resolveResult({ ...UNPROVEN, available: true, operational: false });
        }
      },
    );
  });
}

async function _provePath(
  path: string,
  cwd: string,
): Promise<CoverageEvidence> {
  const localPath = relative(cwd, path);
  const files = _getFiles(cwd);
  if (!files || localPath === ".." || localPath.startsWith(`..${sep}`)) {
    return UNPROVEN;
  }
  let engine: string;
  try {
    engine = pathToFileURL(
      createRequire(join(cwd, "package.json")).resolve("stylelint"),
    ).href;
  } catch {
    return UNPROVEN;
  }
  return _runProof({ engine, files, path, cwd });
}

/**
 * Proves safe CSS marker repairs against the actual repository selection and
 * original filename. Serializes children during eager file collection.
 * Unsupported shapes deliberately keep AF-20 in fallback.
 */
export function createCssCoverageProbes(): CoverageProbe[] {
  const cache = new Map<string, Promise<CoverageEvidence>>();
  let preceding: Promise<unknown> = Promise.resolve();
  return [
    {
      ruleId: "AF-20",
      language: "css",
      capability: "standalone-prose-comments",
      prove: ({ path, cwd }) => {
        const key = `${cwd}:${path}`;
        if (!cache.has(key)) {
          const proof = preceding.then(() => {
            return _provePath(path, cwd);
          });
          preceding = proof.catch(() => {});
          cache.set(key, proof);
        }
        return cache.get(key)!;
      },
    },
    {
      ruleId: "AF-20",
      language: "css",
      capability: "unsupported-shapes",
      prove: async () => {
        return {
          ...UNPROVEN,
          recovery:
            "Run fallback review for unsupported CSS comments, directives, documentation and syntax. No exact syntax classifier is installed.",
        };
      },
    },
  ];
}
