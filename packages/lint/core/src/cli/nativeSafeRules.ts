import { execFile } from "node:child_process";
import {
  existsSync,
  lstatSync,
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
import { dirname, join, relative, resolve, sep } from "node:path";
// oxlint-disable-next-line import/extensions -- Node needs source extensions.
import { getNativePluginContext } from "./getNativePluginContext.ts";
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
  "AF-06",
  "AF-07",
  "AF-08",
  "AF-09",
  "AF-10",
  "AF-11",
  "AF-12",
  "AF-13",
  "AF-14",
  "AF-15",
  "AF-16",
  "AF-17",
];
const JS_RULE_IDS: readonly string[] = [
  "AF-01",
  "AF-06",
  "AF-07",
  "AF-08",
  "AF-09",
  "AF-10",
  "AF-13",
  "AF-14",
  "AF-15",
  "AF-16",
  "AF-17",
];
const JS_SEED = '\nif (Boolean(1)) console.log("coverage");';
const BODY_COMMENT_SEED = `
function _avandarBodyCommentSeed() {
  /** Keep this ordinary. */
  console.log(1);
}
`;
const SHORT_COMMENT_SEED = `
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
const TOP_FUNCTION_SEED = `
const _avandarTopDeclarationSeed = () => { console.log(1); return 1; };
_avandarTopDeclarationSeed();
`;
const NESTED_FUNCTION_SEED = `
function _avandarNestedDeclarationSeed() {
  function nestedSeed() { return 1; }
  return nestedSeed();
}
_avandarNestedDeclarationSeed();
`;
const PRIVATE_FUNCTION_SEED = `
function avandarPrivateHelperSeed() { return 1; }
export function _avandarPrivateCallerSeed() {
  return avandarPrivateHelperSeed();
}
`;
const LOCAL_ACRONYM_SEED = `
const _avandarE2ECount = 1;
console.log(_avandarE2ECount);
`;
const PROPS_ALIAS_SEED = "\ntype AvandarSeedCardProps = { count: number };\n";
const PROPS_COMPONENT_SEED = `
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
  [
    "literal-property-map",
    `
[{ _avandarId: 1 }].map(function(row) { return row._avandarId; });
`,
  ],
  [
    "literal-property-equality",
    `
[{ _avandarId: 1 }].filter(function(row) { return row._avandarId === 1; });
`,
  ],
  [
    "fresh-data-object",
    `
function _avandarObjectSeed() {
  const result = { count: 0 };
  result.count = 1;
  return result;
}
`,
  ],
  [
    "optional-parameter-candidates",
    `
function _avandarCandidatesSeed(candidate: number | undefined) {
  const result: number[] = [];
  if (candidate !== undefined) {
    result.push(candidate);
  }
  return result;
}
`,
  ],
] as const;
const TYPE_IMPORT_SEED =
  '\nimport { Stats as _AvandarSeedStats } from "node:fs";\nlet _avandarSeedStats: _AvandarSeedStats;\n';
const TYPE_EXPORT_SEED =
  "\ntype _AvandarSeedShape = { name: string };\nexport { _AvandarSeedShape };\n";
const LITERAL_SEED =
  '\nconst _avandarSeedLiteral = "coverage" as "coverage";\nconst _avandarSeedNumber: number = 1;\nconst _avandarSeedCopy = _avandarSeedNumber as number;\n';
const NATIVE_CODES: Record<string, string> = {
  curly: "eslint(curly)",
  "consistent-type-imports": "typescript(consistent-type-imports)",
  "consistent-type-exports": "typescript(consistent-type-exports)",
  "prefer-as-const": "typescript(prefer-as-const)",
};
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
  filename?: string;
  labels?: Array<{ span?: { offset?: number; length?: number } }>;
};
type EngineResult = {
  stdout: string;
  stderr: string;
  status: number | null;
  error: boolean;
};
type Listing = { paths: Set<string>; operational: boolean };
type Invocation = { binary: string; args: string[] };
type PluginContext = ReturnType<typeof getNativePluginContext>;
type Proof = {
  hasProvenPluginContext?: boolean;
  evidence: CoverageEvidence;
  diagnostics: Diagnostic[];
  directory?: string;
  mirrorPath?: string;
  capabilityRanges: Record<string, { start: number; end: number }>;
};

function _getInvocation(cwd: string): Invocation | undefined {
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

class UnsupportedProofContext extends Error {}

function _rebasePlugins(
  plugins: unknown,
  origin: string,
): unknown[] | undefined {
  if (plugins === undefined) {
    return undefined;
  }
  if (!Array.isArray(plugins)) {
    throw new UnsupportedProofContext(
      "Coverage cannot safely relocate this plugin configuration.",
    );
  }
  return plugins.map((plugin: unknown) => {
    const specifier =
      typeof plugin === "string"
        ? plugin
        : _isRecord(plugin)
          ? plugin.specifier
          : undefined;
    if (typeof specifier !== "string") {
      throw new UnsupportedProofContext(
        "Coverage cannot safely relocate this plugin configuration.",
      );
    }
    const original = specifier.startsWith(".")
      ? resolve(dirname(origin), specifier)
      : specifier;
    return typeof plugin === "string"
      ? original
      : { ...(plugin as Record<string, unknown>), specifier: original };
  });
}

function _rebaseInheritedPaths(
  inherited: unknown,
  origin: string,
): string[] | undefined {
  if (inherited === undefined) {
    return undefined;
  }
  if (
    !Array.isArray(inherited) ||
    inherited.some((entry) => {
      return typeof entry !== "string" || !/\.jsonc?$/.test(entry);
    })
  ) {
    throw new UnsupportedProofContext(
      "Coverage cannot safely relocate this inherited configuration.",
    );
  }
  return inherited.map((entry: string) => {
    return resolve(dirname(origin), entry);
  });
}

function _rebaseConfig(config: unknown, origin: string): unknown {
  if (!_isRecord(config)) {
    throw new UnsupportedProofContext(
      "Coverage requires a supported JSON object configuration.",
    );
  }
  const plugins = _rebasePlugins(config.jsPlugins, origin);
  const inherited = _rebaseInheritedPaths(config.extends, origin);
  const overrides = config.overrides;
  if (overrides !== undefined && !Array.isArray(overrides)) {
    throw new UnsupportedProofContext(
      "Coverage cannot safely relocate these overrides.",
    );
  }
  return {
    ...config,
    ...(plugins ? { jsPlugins: plugins } : {}),
    ...(inherited ? { extends: inherited } : {}),
    ...(overrides
      ? {
          overrides: overrides.map((override) => {
            return _rebaseConfig(override, origin);
          }),
        }
      : {}),
  };
}

function _copyConfig(origin: string, target: string): PluginContext {
  let config: unknown;
  try {
    config = JSON.parse(readFileSync(origin, "utf8"));
  } catch {
    throw new UnsupportedProofContext(
      "Coverage requires strict JSON when relocating local plugin configuration.",
    );
  }
  writeFileSync(target, JSON.stringify(_rebaseConfig(config, origin)));
  return getNativePluginContext(config, origin);
}

function _mirrorDirectory(
  source: string,
  destination: string,
  segments: string[],
): PluginContext {
  const contexts: PluginContext[] = [];
  mkdirSync(destination, { recursive: true });
  readdirSync(source, { withFileTypes: true }).forEach((entry) => {
    const origin = join(source, entry.name);
    const target = join(destination, entry.name);
    if (
      /^(?:oxlint\.config\.[cm]?[jt]s|\.oxlintrc\.[cm]?[jt]s)$/.test(
        entry.name,
      ) ||
      (entry.isSymbolicLink() && /^\.oxlintrc(?:\..+)?$/.test(entry.name))
    ) {
      throw new UnsupportedProofContext(
        "Coverage cannot safely mirror dynamic or symlinked lint configuration.",
      );
    }
    if (entry.name === segments[0]) {
      if (segments.length > 1) {
        contexts.push(_mirrorDirectory(origin, target, segments.slice(1)));
      }
    } else if (
      entry.isFile() &&
      /^(?:\.oxlintrc|tsconfig).*\.jsonc?$/.test(entry.name)
    ) {
      if (/^\.oxlintrc/.test(entry.name)) {
        contexts.push(_copyConfig(origin, target));
      } else {
        copyFileSync(origin, target);
      }
    } else {
      symlinkSync(origin, target);
    }
  });
  return {
    isSupported: contexts.every((context) => {
      return context.isSupported;
    }),
    hasOfficialRegistration: contexts.some((context) => {
      return context.hasOfficialRegistration;
    }),
  };
}

function _isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function _isDiagnostic(value: unknown): value is Diagnostic {
  return (
    _isRecord(value) &&
    typeof value.code === "string" &&
    /^[^()]+\([^()]+\)$/.test(value.code) &&
    !/tsconfig-error|parse|configuration|plugin-error|runtime-error|internal-error/.test(
      value.code,
    ) &&
    typeof value.message === "string" &&
    ["error", "warning"].includes(String(value.severity)) &&
    typeof value.filename === "string" &&
    value.filename.length > 0 &&
    Array.isArray(value.labels) &&
    value.labels.every((label: unknown) => {
      return (
        _isRecord(label) &&
        _isRecord(label.span) &&
        Number.isSafeInteger(label.span.offset) &&
        Number(label.span.offset) >= 0 &&
        Number.isSafeInteger(label.span.length) &&
        Number(label.span.length) >= 0
      );
    })
  );
}

function _getDiagnostics(stdout: string): Diagnostic[] | undefined {
  try {
    const result: unknown = JSON.parse(stdout);
    const keys = [
      "diagnostics",
      "number_of_files",
      "number_of_rules",
      "threads_count",
      "start_time",
    ];
    return _isRecord(result) &&
      Object.keys(result).every((key) => {
        return keys.includes(key);
      }) &&
      result.number_of_files === 1 &&
      (result.number_of_rules === null ||
        (Number.isSafeInteger(result.number_of_rules) &&
          Number(result.number_of_rules) >= 0)) &&
      Number.isSafeInteger(result.threads_count) &&
      Number(result.threads_count) > 0 &&
      typeof result.start_time === "number" &&
      Number.isFinite(result.start_time) &&
      result.start_time >= 0 &&
      Array.isArray(result.diagnostics) &&
      result.diagnostics.every(_isDiagnostic)
      ? result.diagnostics
      : undefined;
  } catch {
    return undefined;
  }
}

async function _listPaths(
  cwd: string,
  invocation: Invocation,
): Promise<Listing> {
  const result = await _runEngine(
    invocation.binary,
    [...invocation.args, "--debug", "files"],
    cwd,
  );
  const paths = new Set(
    result.stdout
      .split(/\r?\n/)
      .filter(Boolean)
      .map((entry) => {
        return resolve(cwd, entry);
      }),
  );
  return {
    paths,
    operational: !result.error && result.status === 0 && !result.stderr.trim(),
  };
}

function _createUnproven(
  evidence: Readonly<Partial<CoverageEvidence>> = {},
): Proof {
  return {
    evidence: { ...UNPROVEN, ...evidence },
    diagnostics: [],
    capabilityRanges: {},
  };
}

function _getSourceRecovery(
  path: string,
  cwd: string,
  localPath: string,
): string | undefined {
  let ancestor = cwd;
  const isSymlink = localPath.split(sep).some((segment) => {
    ancestor = join(ancestor, segment);
    return lstatSync(ancestor).isSymbolicLink();
  });
  if (
    lstatSync(path).size > 1024 * 1024 ||
    Buffer.byteLength(localPath) > 16 * 1024
  ) {
    return "Run fallback review for this path. Coverage exceeds its 1 MiB source-byte bound or 16 KiB argument bound.";
  }
  if (isSymlink || !lstatSync(path).isFile()) {
    return "Run fallback review for symlinked or nonregular source paths. Exact mirrored configuration identity is unproven.";
  }
  return undefined;
}

async function _provePath(
  path: string,
  cwd: string,
  listings: Map<string, Promise<Listing>>,
): Promise<Proof> {
  const invocation = _getInvocation(cwd);
  if (!invocation || !existsSync(invocation.binary)) {
    return _createUnproven();
  }
  const localPath = relative(cwd, path);
  if (localPath.startsWith(`..${sep}`) || localPath === "..") {
    return _createUnproven();
  }
  const key = JSON.stringify([cwd, invocation]);
  if (!listings.has(key)) {
    listings.set(key, _listPaths(cwd, invocation));
  }
  const listing = await listings.get(key)!;
  if (!listing.operational) {
    return _createUnproven({ available: true, operational: false });
  }
  if (!listing.paths.has(path)) {
    return _createUnproven({ available: true });
  }
  const recovery = _getSourceRecovery(path, cwd, localPath);
  return recovery
    ? _createUnproven({ available: true, included: true, recovery })
    : _proveSeed(path, cwd, localPath, invocation);
}

function _getSeedSections(path: string): Array<readonly [string, string]> {
  // Keep the witness first. Only original AST module markers qualify.
  return [
    ["local-primitive-bindings", LOCAL_ACRONYM_SEED],
    ...(/\.tsx$/.test(path)
      ? ([
          ["single-component-props", PROPS_ALIAS_SEED],
          ["boolean-jsx-children", PROPS_COMPONENT_SEED],
        ] as const)
      : []),
    ...UTILITY_SEEDS.filter(([capability]) => {
      return (
        capability !== "optional-parameter-candidates" || /\.tsx?$/.test(path)
      );
    }),
    ["if-body", JS_SEED],
    ["standalone-body-prose", BODY_COMMENT_SEED],
    ["short-prose-jsdoc", SHORT_COMMENT_SEED],
    ["direct-top-level-calls", TOP_FUNCTION_SEED],
    ["direct-nested-calls", NESTED_FUNCTION_SEED],
    ["private-direct-calls", PRIVATE_FUNCTION_SEED],
    ...(/\.[cm]?tsx?$/.test(path)
      ? ([
          ["type-imports", TYPE_IMPORT_SEED],
          ["type-exports", TYPE_EXPORT_SEED],
          ["literal-assertions", LITERAL_SEED],
          ["one-to-one-module-key", MODULE_COMMENT_SEED],
        ] as const)
      : []),
    ...(/\.jsx$/.test(path)
      ? ([["boolean-jsx-children", JSX_SEED]] as const)
      : []),
  ];
}

function _createSeed(
  path: string,
  source: string,
): {
  seed: string;
  capabilityRanges: Proof["capabilityRanges"];
} {
  let markerIndex = 0;
  while (
    source.includes(`avandarCoverage${markerIndex}`) ||
    source.includes(`AvandarCoverage${markerIndex}`)
  ) {
    markerIndex += 1;
  }
  let offset = Buffer.byteLength(source);
  const capabilityRanges: Proof["capabilityRanges"] = {};
  const seed = _getSeedSections(path)
    .map(([capability, originalText]) => {
      const text = originalText
        .replaceAll("avandar", `avandarCoverage${markerIndex}`)
        .replaceAll("Avandar", `AvandarCoverage${markerIndex}`);
      const start = offset;
      offset += Buffer.byteLength(text);
      capabilityRanges[capability] = { start, end: offset };
      return text;
    })
    .join("");
  return { seed, capabilityRanges };
}

function _createProofFromEngine(
  result: Readonly<EngineResult>,
  directory: string,
  localPath: string,
  capabilityRanges: Proof["capabilityRanges"],
  context: PluginContext,
): Proof {
  const diagnostics = _getDiagnostics(result.stdout);
  const operational =
    !result.error &&
    !result.stderr.trim() &&
    (result.status === 0 || result.status === 1) &&
    diagnostics !== undefined &&
    (result.status === 1) ===
      diagnostics.some((diagnostic) => {
        return diagnostic.severity === "error";
      });
  return {
    hasProvenPluginContext:
      context.isSupported && context.hasOfficialRegistration,
    diagnostics: diagnostics ?? [],
    capabilityRanges,
    directory,
    mirrorPath: join(directory, localPath),
    evidence: {
      available: true,
      enabled: true,
      included: true,
      operational,
      exitCode: result.status ?? 0,
      diagnosticRuleIds: [],
    },
  };
}

async function _proveSeed(
  path: string,
  cwd: string,
  localPath: string,
  invocation: Invocation,
): Promise<Proof> {
  const directory = mkdtempSync(join(tmpdir(), "avandar-native-proof-"));
  try {
    const context = _mirrorDirectory(cwd, directory, localPath.split(sep));
    const source = readFileSync(path, "utf8");
    const { seed, capabilityRanges } = _createSeed(path, source);
    writeFileSync(join(directory, localPath), source + seed);
    const result = await _runSeed(directory, localPath, invocation);
    return _createProofFromEngine(
      result,
      directory,
      localPath,
      capabilityRanges,
      context,
    );
  } catch (error) {
    if (!(error instanceof UnsupportedProofContext)) {
      throw error;
    }
    return _createUnproven({
      available: true,
      included: true,
      recovery: `${error.message} Run fallback review for this unsupported context.`,
    });
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

function _runSeed(
  directory: string,
  localPath: string,
  invocation: Invocation,
) {
  return _runEngine(
    invocation.binary,
    [
      ...invocation.args.filter((argument) => {
        return argument !== ".";
      }),
      "--format",
      "json",
      `./${localPath}`,
    ],
    directory,
  );
}

function _runEngine(
  binary: string,
  args: string[],
  cwd: string,
): Promise<EngineResult> {
  return new Promise((resolveResult) => {
    execFile(
      binary,
      args,
      { cwd, encoding: "utf8", timeout: 30000, maxBuffer: 8 * 1024 * 1024 },
      (error, stdout, stderr) => {
        resolveResult({
          stdout,
          stderr,
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

function _hasDiagnostic(
  proof: Readonly<Proof>,
  capability: string,
  code: string,
  prefix?: string,
): boolean {
  const range = proof.capabilityRanges[capability];
  if (
    !range ||
    !proof.directory ||
    !proof.mirrorPath ||
    proof.evidence.exitCode !== 1 ||
    !proof.evidence.operational
  ) {
    return false;
  }
  return proof.diagnostics.some((diagnostic) => {
    return (
      diagnostic.severity === "error" &&
      diagnostic.code === code &&
      (!prefix || diagnostic.message?.startsWith(prefix)) &&
      typeof diagnostic.filename === "string" &&
      diagnostic.filename.length > 0 &&
      resolve(proof.directory!, diagnostic.filename) === proof.mirrorPath &&
      diagnostic.labels?.some(({ span }) => {
        const offset = span?.offset;
        const length = span?.length;
        return (
          Number.isSafeInteger(offset) &&
          Number.isSafeInteger(length) &&
          offset! >= range.start &&
          length! > 0 &&
          offset! + length! <= range.end
        );
      }) === true
    );
  });
}

function _hasOriginalModule(proof: Readonly<Proof>): boolean {
  return (
    proof.hasProvenPluginContext === true &&
    _hasDiagnostic(
      proof,
      "local-primitive-bindings",
      "avandar(local-e2e-casing)",
      "AF-13:",
    )
  );
}

function _hasProvenRuleContext(
  proof: Readonly<Proof>,
  ruleId: string,
  path: string,
): boolean {
  if (!CUSTOM_RULE_IDS.includes(ruleId)) {
    return true;
  }
  const isUtility = ["AF-15", "AF-17"].includes(ruleId);
  const isExcludedUtility =
    /\/(?:packages\/shared\/utils|node_modules\/@avandar\/utils)\//.test(
      path.replaceAll("\\", "/"),
    );
  return (
    proof.hasProvenPluginContext === true && (!isUtility || !isExcludedUtility)
  );
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
      const hasOriginalModule = _hasOriginalModule(proof);
      const requiresOriginalModule = ["AF-08", "AF-09", "AF-10"].includes(
        ruleId,
      );
      const code = CUSTOM_RULE_IDS.includes(ruleId)
        ? `avandar(${nativeRule})`
        : NATIVE_CODES[nativeRule]!;
      const hasProvenContext = _hasProvenRuleContext(proof, ruleId, path);
      const diagnosed =
        hasProvenContext &&
        (!requiresOriginalModule || hasOriginalModule) &&
        _hasDiagnostic(
          proof,
          capability,
          code,
          CUSTOM_RULE_IDS.includes(ruleId) ? `${ruleId}:` : undefined,
        );
      const recovery =
        !hasProvenContext && proof.mirrorPath && proof.evidence.operational
          ? "Run fallback review for this plugin runtime context. Only the matching installed official Avandar implementation with supported registrations and original filename boundaries has proven mirrored applicability."
          : requiresOriginalModule &&
              !hasOriginalModule &&
              proof.mirrorPath &&
              proof.evidence.operational
            ? "Run fallback review. Exact early AF-13 error evidence could not establish original module context. Enable the context witness at error severity and preserve an original AST import/export marker before retrying."
            : proof.evidence.recovery;
      return {
        ...proof.evidence,
        recovery,
        enabled: diagnosed,
        diagnosticRuleIds: diagnosed ? [ruleId] : [],
      };
    },
  };
}

function _createProofLoader(): (path: string, cwd: string) => Promise<Proof> {
  const cache = new Map<string, Promise<Proof>>();
  const listings = new Map<string, Promise<Listing>>();
  let preceding: Promise<unknown> = Promise.resolve();
  return (path, cwd) => {
    const key = JSON.stringify([cwd, path]);
    if (!cache.has(key)) {
      const proof = preceding.then(() => {
        return _provePath(path, cwd, listings);
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
    const languages = JS_RULE_IDS.includes(capability[0])
      ? ["typescript", "javascript"]
      : ["typescript"];
    return languages.flatMap((language) => {
      const probe = _createProbe(capability, language, getProof);
      if (!CUSTOM_RULE_IDS.includes(capability[0])) {
        return [probe];
      }
      return [
        probe,
        {
          ruleId: capability[0],
          language,
          capability: "unsupported-shapes",
          prove: async () => {
            return {
              ...UNPROVEN,
              recovery:
                "Run fallback review for unsupported syntax shapes. No exact syntax classifier is installed.",
            };
          },
        },
      ];
    });
  });
}
