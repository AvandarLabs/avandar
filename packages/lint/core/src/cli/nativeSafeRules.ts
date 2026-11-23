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
  ["AF-03", "type-imports", "consistent-type-imports"],
  ["AF-03", "type-exports", "consistent-type-exports"],
  ["AF-04", "literal-assertions", "prefer-as-const"],
  ["AF-06", "standalone-body-prose", "function-body-line-comments"],
  ["AF-07", "short-prose-jsdoc", "single-line-short-jsdoc"],
  ["AF-08", "direct-top-level-calls", "top-level-function-declarations"],
  ["AF-09", "direct-nested-calls", "nested-arrow-functions"],
  ["AF-10", "private-direct-calls", "private-helper-prefix"],
  ["AF-11", "one-to-one-module-key", "export-key-jsdoc"],
  ["AF-12", "single-component-props", "component-props-name"],
  ["AF-13", "local-primitive-bindings", "local-e2e-casing"],
  ["AF-14", "boolean-jsx-children", "jsx-conditional-ternary"],
  ["AF-15", "literal-property-map", "property-helper-callbacks"],
  ["AF-15", "literal-property-equality", "property-helper-callbacks"],
  ["AF-16", "fresh-data-object", "straight-line-object-construction"],
  ["AF-17", "optional-parameter-candidates", "optional-array-candidates"],
] as const;
const CUSTOM_RULE_IDS: readonly string[] = [
  "AF-06", "AF-07", "AF-08", "AF-09", "AF-10", "AF-11", "AF-12", "AF-13", "AF-14", "AF-15", "AF-16", "AF-17",
];
const JS_RULE_IDS: readonly string[] = [
  "AF-01", "AF-06", "AF-07", "AF-08", "AF-09", "AF-10", "AF-13", "AF-14", "AF-15", "AF-16", "AF-17",
];
const JS_SEED = '\nif (Boolean(1)) console.log("coverage");';
const COMMENT_SEED = `
function _avandarBodyCommentSeed() {
  /** Keep this ordinary. */
  console.log(1);
}
/**
 * Describe this seed.
 */
const _avandarShortCommentSeed = 1;
`;
const MODULE_COMMENT_SEED = `
/** Describe the module member seed. */
function _avandarModuleCommentSeed() {}
export const _AvandarSeedCommentModule = {
  read: _avandarModuleCommentSeed,
};
`;
const FUNCTION_SEED = `
const _avandarTopDeclarationSeed = () => { console.log(1); return 1; };
_avandarTopDeclarationSeed();
function _avandarNestedDeclarationSeed() {
  function nestedSeed() { return 1; }
  return nestedSeed();
}
_avandarNestedDeclarationSeed();
function avandarPrivateHelperSeed() { return 1; }
export function _avandarPrivateCallerSeed() {
  return avandarPrivateHelperSeed();
}
`;
const LOCAL_ACRONYM_SEED = `
const _avandarE2ECount = 1;
console.log(_avandarE2ECount);
`;
const PROPS_SEED = `
type AvandarSeedCardProps = { count: number };
function AvandarSeedCard(props: AvandarSeedCardProps) {
  return <div>{!_avandarReadySeed && <span />}</div>;
}
`;
const JSX_SEED = `
function _avandarJsxSeed() {
  return <>{!_avandarReadySeed && <span />}</>;
}
`;
const UTILITY_SEEDS = [
  ["literal-property-map", `
[{ _avandarId: 1 }].map(function(row) { return row._avandarId; });
`],
  ["literal-property-equality", `
[{ _avandarId: 1 }].filter(function(row) { return row._avandarId === 1; });
`],
  ["fresh-data-object", `
function _avandarObjectSeed() {
  const result = { count: 0 };
  result.count = 1;
  return result;
}
`],
  ["optional-parameter-candidates", `
function _avandarCandidatesSeed(candidate: number | undefined) {
  const result: number[] = [];
  if (candidate !== undefined) {
    result.push(candidate);
  }
  return result;
}
`],
] as const;
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
  message?: string;
  severity?: string;
  labels?: Array<{ span?: { offset?: number } }>;
};
type Proof = {
  evidence: CoverageEvidence;
  diagnostics: Diagnostic[];
  seedOffset: number;
  capabilityRanges?: Record<string, { start: number; end: number }>;
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

function _createUtilitySeed(
  path: string,
  sourceBytes: number,
): { seed: string; capabilityRanges: NonNullable<Proof["capabilityRanges"]> } {
  const utilitySeeds = UTILITY_SEEDS.filter(([capability]) => {
    return capability !== "optional-parameter-candidates" || /\.tsx?$/.test(path);
  });
  const utilitySeed = utilitySeeds.map(([, text]) => { return text; }).join("");
  let utilityOffset = sourceBytes;
  const capabilityRanges = Object.fromEntries(utilitySeeds.map(
    ([capability, text]) => {
      const start = utilityOffset;
      utilityOffset += Buffer.byteLength(text);
      return [capability, { start, end: utilityOffset }];
    },
  ));
  return { seed: utilitySeed, capabilityRanges };
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
    const { seed: utilitySeed, capabilityRanges } =
      _createUtilitySeed(path, Buffer.byteLength(source));
    const seed = utilitySeed +
      LOCAL_ACRONYM_SEED + (/\.tsx$/.test(path) ? PROPS_SEED : "") +
      JS_SEED + COMMENT_SEED + FUNCTION_SEED +
      (/\.[cm]?tsx?$/.test(path) ? TS_SEED + MODULE_COMMENT_SEED : "") +
      (/\.jsx$/.test(path) ? JSX_SEED : "");
    writeFileSync(join(directory, localPath), source + seed);
    const result = await _runSeed(directory, localPath, invocation);
    const diagnostics = _getDiagnostics(result.stdout);
    return {
      diagnostics: diagnostics ?? [],
      capabilityRanges,
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
          diagnostic.severity === "error" &&
          diagnostic.code?.endsWith(`(${nativeRule})`) &&
          (!CUSTOM_RULE_IDS.includes(ruleId) ||
            (diagnostic.code === `avandar(${nativeRule})` &&
              diagnostic.message?.startsWith(`${ruleId}:`))) &&
          diagnostic.labels?.some((label) => {
            const offset = label.span?.offset ?? -1;
            const range = proof.capabilityRanges?.[capability];
            return range ? offset >= range.start && offset < range.end
              : offset >= proof.seedOffset;
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
 * Gives `runCli` real engine proofs for independently seeded safe fixes.
 * Exact reviewed paths retain root and nested config, ignore and project rules.
 */
export function createNativeCoverageProbes(): CoverageProbe[] {
  const getProof = _createProofLoader();
  return CAPABILITIES.flatMap((capability) => {
    const languages =
      JS_RULE_IDS.includes(capability[0])
        ? ["typescript", "javascript"]
        : ["typescript"];
    return languages.flatMap((language) => {
      const probe = _createProbe(capability, language, getProof);
      if (!CUSTOM_RULE_IDS.includes(capability[0])) {
        return [probe];
      }
      return [probe, {
        ruleId: capability[0], language,
        capability: "unsupported-shapes",
        prove: async () => {
          return {
            ...UNPROVEN,
            recovery:
              "Run fallback review for unsupported syntax shapes. No exact syntax classifier is installed.",
          };
        },
      }];
    });
  });
}
