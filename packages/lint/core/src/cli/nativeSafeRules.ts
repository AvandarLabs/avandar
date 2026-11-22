import { execFile } from "node:child_process";
import {
  existsSync,
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, relative, resolve, sep } from "node:path";
import type { CoverageEvidence, CoverageProbe } from "./coverage.ts";

const CAPABILITIES = [
  ["AF-01", "if-body", "curly"],
  ["AF-02", "string-concatenation", "prefer-template"],
  ["AF-03", "type-imports", "consistent-type-imports"],
  ["AF-03", "type-exports", "consistent-type-exports"],
  ["AF-04", "literal-assertions", "prefer-as-const"],
] as const;
const JS_SEED =
  '\nif (Boolean(1)) console.log("coverage");\nconst _avandarSeedMessage = "coverage " + String(1);\n';
const TS_SEED =
  '\nimport { Stats as _AvandarSeedStats } from "node:fs";\nlet _avandarSeedStats: _AvandarSeedStats;\ntype _AvandarSeedShape = { name: string };\nexport { _AvandarSeedShape };\nconst _avandarSeedLiteral = "coverage" as "coverage";\nconst _avandarSeedNumber: number = 1;\nconst _avandarSeedCopy = _avandarSeedNumber as number;\n';
const UNPROVEN: CoverageEvidence = {
  available: false,
  enabled: false,
  included: false,
  operational: true,
  exitCode: 0,
  diagnosticRuleIds: [],
};
type Diagnostic = {
  code?: string;
  labels?: Array<{ span?: { offset?: number } }>;
};
type Proof = {
  evidence: CoverageEvidence;
  diagnostics: Diagnostic[];
  seedOffset: number;
};

function _getInvocation(
  cwd: string,
): { binary: string; args: string[] } | undefined {
  const path = join(cwd, "package.json");
  if (!existsSync(path)) {
    return undefined;
  }
  const command = JSON.parse(readFileSync(path, "utf8"))
    .scripts?.lint?.split("&&")[0]
    ?.trim();
  if (
    !command ||
    !/^oxlint(?:\s+(?:--report-unused-disable-directives-severity=error|\.))+$/.test(
      command,
    )
  ) {
    return undefined;
  }
  return {
    binary: join(cwd, "node_modules/.bin/oxlint"),
    args: command.split(/\s+/).slice(1),
  };
}

function _mirrorDirectory(
  source: string,
  destination: string,
  segments: string[],
): void {
  mkdirSync(destination, { recursive: true });
  readdirSync(source, { withFileTypes: true }).forEach((entry) => {
    const origin = join(source, entry.name);
    const target = join(destination, entry.name);
    if (entry.name === segments[0]) {
      if (segments.length > 1) {
        _mirrorDirectory(origin, target, segments.slice(1));
      }
    } else if (
      entry.isFile() &&
      /^(?:\.oxlintrc|tsconfig).*\.jsonc?$/.test(entry.name)
    ) {
      copyFileSync(origin, target);
    } else {
      symlinkSync(origin, target);
    }
  });
}

function _getDiagnostics(stdout: string): Diagnostic[] | undefined {
  try {
    const result = JSON.parse(stdout);
    return Array.isArray(result.diagnostics) ? result.diagnostics : undefined;
  } catch {
    return undefined;
  }
}

async function _provePath(path: string, cwd: string): Promise<Proof> {
  const invocation = _getInvocation(cwd);
  const unproven = { evidence: UNPROVEN, diagnostics: [], seedOffset: 0 };
  if (!invocation || !existsSync(invocation.binary)) {
    return unproven;
  }
  const localPath = relative(cwd, path);
  if (localPath.startsWith(`..${sep}`) || localPath === "..") {
    return unproven;
  }
  const listing = await _runEngine(
    invocation.binary,
    [...invocation.args, "--debug", "files"],
    cwd,
  );
  if (listing.error || listing.status !== 0) {
    return {
      ...unproven,
      evidence: {
        ...UNPROVEN,
        available: true,
        operational: false,
      },
    };
  }
  const included =
    listing.status === 0 &&
    listing.stdout.split(/\r?\n/).some((entry) => {
      return resolve(cwd, entry) === path;
    });
  if (!included) {
    return { ...unproven, evidence: { ...UNPROVEN, available: true } };
  }
  return _proveSeed(path, cwd, localPath, invocation);
}

async function _proveSeed(
  path: string,
  cwd: string,
  localPath: string,
  invocation: { binary: string; args: string[] },
): Promise<Proof> {
  const directory = mkdtempSync(join(tmpdir(), "avandar-native-proof-"));
  try {
    _mirrorDirectory(cwd, directory, localPath.split(sep));
    const source = readFileSync(path, "utf8");
    const seed = JS_SEED + (/\.[cm]?tsx?$/.test(path) ? TS_SEED : "");
    writeFileSync(join(directory, localPath), source + seed);
    const result = await _runSeed(directory, localPath, invocation);
    const diagnostics = _getDiagnostics(result.stdout);
    return {
      diagnostics: diagnostics ?? [],
      seedOffset: Buffer.byteLength(source),
      evidence: {
        available: true,
        enabled: true,
        included: true,
        operational:
          !result.error &&
          diagnostics !== undefined &&
          !diagnostics.some((diagnostic) => {
            return /tsconfig-error|parse|configuration/.test(
              diagnostic.code ?? "",
            );
          }),
        exitCode: result.status ?? 0,
        diagnosticRuleIds: [],
      },
    };
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

function _runSeed(
  directory: string,
  localPath: string,
  invocation: { binary: string; args: string[] },
) {
  return _runEngine(
    invocation.binary,
    [
      ...invocation.args.filter((argument) => {
        return argument !== ".";
      }),
      "--format",
      "json",
      localPath,
    ],
    directory,
  );
}

function _runEngine(
  binary: string,
  args: string[],
  cwd: string,
): Promise<{
  stdout: string;
  status: number | null;
  error: boolean;
}> {
  return new Promise((resolveResult) => {
    execFile(
      binary,
      args,
      { cwd, encoding: "utf8", timeout: 30000, maxBuffer: 8 * 1024 * 1024 },
      (error, stdout) => {
        resolveResult({
          stdout,
          error: Boolean(error && typeof error.code !== "number"),
          status: error
            ? typeof error.code === "number"
              ? error.code
              : null
            : 0,
        });
      },
    );
  });
}

function _createProbe(
  [ruleId, capability, nativeRule]: (typeof CAPABILITIES)[number],
  language: string,
  getProof: (path: string, cwd: string) => Promise<Proof>,
): CoverageProbe {
  return {
    ruleId,
    language,
    capability,
    prove: async ({ path, cwd }) => {
      const proof = await getProof(path, cwd);
      const diagnosed = proof.diagnostics.some((diagnostic) => {
        return (
          diagnostic.code?.endsWith(`(${nativeRule})`) &&
          diagnostic.labels?.some((label) => {
            return (label.span?.offset ?? -1) >= proof.seedOffset;
          })
        );
      });
      return {
        ...proof.evidence,
        enabled: diagnosed,
        diagnosticRuleIds: diagnosed ? [ruleId] : [],
      };
    },
  };
}

function _createProofLoader(): (path: string, cwd: string) => Promise<Proof> {
  const cache = new Map<string, Promise<Proof>>();
  let preceding: Promise<unknown> = Promise.resolve();
  return (path, cwd) => {
    const key = `${cwd}:${path}`;
    if (!cache.has(key)) {
      const proof = preceding.then(() => {
        return _provePath(path, cwd);
      });
      preceding = proof.catch(() => {});
      cache.set(key, proof);
    }
    return cache.get(key)!;
  };
}

/**
 * Gives `runCli` real native engine proofs for independently seeded safe fixes.
 * Exact reviewed paths retain root and nested config, ignore and project rules.
 */
export function createNativeCoverageProbes(): CoverageProbe[] {
  const getProof = _createProofLoader();
  return CAPABILITIES.flatMap((capability) => {
    const languages =
      capability[0] === "AF-01" || capability[0] === "AF-02"
        ? ["typescript", "javascript"]
        : ["typescript"];
    return languages.map((language) => {
      return _createProbe(capability, language, getProof);
    });
  });
}
