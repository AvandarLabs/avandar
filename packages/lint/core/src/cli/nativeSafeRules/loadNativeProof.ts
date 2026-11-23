import { execFile } from "node:child_process";
import {
  existsSync,
  lstatSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, relative, resolve, sep } from "node:path";
// oxlint-disable-next-line import/extensions -- Node needs source extensions.
import { getSuppressedRuleNames } from "../getSuppressedRuleNames.ts";
// oxlint-disable-next-line import/extensions -- Node needs source extensions.
import { createNativeSeed } from "./createNativeSeed.ts";
// oxlint-disable-next-line import/extensions -- Node needs source extensions.
import {
  mirrorNativeDirectory,
  UnsupportedProofContext,
} from "./mirrorNativeDirectory.ts";
// oxlint-disable-next-line import/extensions -- Node needs source extensions.
import { UNPROVEN } from "./nativeSafeRules.constants.ts";
import type { CoverageEvidence } from "../coverage.ts";
import type {
  Diagnostic,
  EngineResult,
  Invocation,
  Listing,
  PluginContext,
  Proof,
} from "./nativeSafeRules.types.ts";

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

function _createProofFromEngine(
  result: Readonly<EngineResult>,
  directory: string,
  localPath: string,
  capabilityRanges: Proof["capabilityRanges"],
  context: PluginContext,
  suppressedRuleNames: string[],
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
    suppressedRuleNames,
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
    const context = mirrorNativeDirectory(cwd, directory, localPath.split(sep));
    const source = readFileSync(path, "utf8");
    const { seed, capabilityRanges } = createNativeSeed(path, source);
    writeFileSync(join(directory, localPath), source + seed);
    const result = await _runSeed(directory, localPath, invocation);
    return _createProofFromEngine(
      result,
      directory,
      localPath,
      capabilityRanges,
      context,
      getSuppressedRuleNames(source, "native"),
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

/**
 * Caches isolated exact-path engine evidence for createNativeCoverageProbes.
 */
export function loadNativeProof(): (
  path: string,
  cwd: string,
) => Promise<Proof> {
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
