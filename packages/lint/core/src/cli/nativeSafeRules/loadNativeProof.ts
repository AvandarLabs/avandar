/* oxlint-disable import/extensions -- Node needs source extensions. */
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
import { getSuppressedRuleNamesFromSource } from "../getSuppressedRuleNamesFromSource.ts";
import { createNativeSeedFromSource } from "./createNativeSeedFromSource.ts";
import { getNativeDiagnosticsFromOutput } from "./getNativeDiagnosticsFromOutput.ts";
import { mirrorNativeDirectory } from "./mirrorNativeDirectory.ts";
import { UNPROVEN } from "./nativeSafeRules.constants.ts";
import { UnsupportedProofContextError } from "./UnsupportedProofContextError.ts";
import type { CoverageEvidence } from "../coverageHelpers.ts";
import type {
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

function _buildEngineFailure(result: Readonly<EngineResult>): string {
  const status =
    result.status === undefined ? "no exit status" : `exit ${result.status}`;
  const details = [
    result.signal ? `signal ${result.signal}` : undefined,
    result.failure,
    result.stderr.trim() || "Expected usable native engine output",
  ]
    .filter(Boolean)
    .join("; ")
    .slice(0, 8192);
  return `Native lint engine failed (${status}): ${details}. Run the repository lint command, repair the engine error, and retry coverage.`;
}

async function _listPaths({
  cwd,
  invocation,
}: Readonly<{ cwd: string; invocation: Invocation }>): Promise<Listing> {
  const result = await _runEngine({
    binary: invocation.binary,
    args: [...invocation.args, "--debug", "files"],
    cwd: cwd,
  });
  const paths = new Set(
    result.stdout
      .split(/\r?\n/)
      .filter(Boolean)
      .map((entry) => {
        return resolve(cwd, entry);
      }),
  );
  const operational =
    !result.error && result.status === 0 && !result.stderr.trim();
  return {
    paths,
    operational,
    recovery: operational ? undefined : _buildEngineFailure(result),
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

function _getSourceRecovery({
  path,
  cwd,
  localPath,
}: Readonly<{ path: string; cwd: string; localPath: string }>):
  | string
  | undefined {
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

async function _provePath({
  path,
  cwd,
  listings,
}: Readonly<{
  path: string;
  cwd: string;
  listings: Map<string, Promise<Listing>>;
}>): Promise<Proof> {
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
    listings.set(key, _listPaths({ cwd: cwd, invocation: invocation }));
  }
  const listing = await listings.get(key)!;
  if (!listing.operational) {
    return _createUnproven({
      available: true,
      operational: false,
      recovery: listing.recovery,
    });
  }
  if (!listing.paths.has(path)) {
    return _createUnproven({ available: true });
  }
  const recovery = _getSourceRecovery({
    path: path,
    cwd: cwd,
    localPath: localPath,
  });
  return recovery
    ? _createUnproven({ available: true, included: true, recovery })
    : _proveSeed({
        path: path,
        cwd: cwd,
        localPath: localPath,
        invocation: invocation,
      });
}

function _createProofFromEngine({
  result,
  directory,
  localPath,
  capabilityRanges,
  context,
  suppressedRuleNames,
}: Readonly<{
  result: Readonly<EngineResult>;
  directory: string;
  localPath: string;
  capabilityRanges: Proof["capabilityRanges"];
  context: PluginContext;
  suppressedRuleNames: string[];
}>): Proof {
  const diagnostics = getNativeDiagnosticsFromOutput(result.stdout);
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
      recovery: operational ? undefined : _buildEngineFailure(result),
      exitCode: result.status ?? 0,
      diagnosticRuleIds: [],
    },
  };
}

async function _proveSeed({
  path,
  cwd,
  localPath,
  invocation,
}: Readonly<{
  path: string;
  cwd: string;
  localPath: string;
  invocation: Invocation;
}>): Promise<Proof> {
  const directory = mkdtempSync(join(tmpdir(), "avandar-native-proof-"));
  try {
    const context = mirrorNativeDirectory({
      source: cwd,
      destination: directory,
      segments: localPath.split(sep),
    });
    const source = readFileSync(path, "utf8");
    const { seed, capabilityRanges } = createNativeSeedFromSource({
      path: path,
      source: source,
    });
    writeFileSync(join(directory, localPath), `${source}${seed}`);
    const result = await _runSeed({
      directory: directory,
      localPath: localPath,
      invocation: invocation,
    });
    return _createProofFromEngine({
      result: result,
      directory: directory,
      localPath: localPath,
      capabilityRanges: capabilityRanges,
      context: context,
      suppressedRuleNames: getSuppressedRuleNamesFromSource({
        source: source,
        engine: "native",
      }),
    });
  } catch (error) {
    if (!(error instanceof UnsupportedProofContextError)) {
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

function _runSeed({
  directory,
  localPath,
  invocation,
}: Readonly<{
  directory: string;
  localPath: string;
  invocation: Invocation;
}>): Promise<EngineResult> {
  return _runEngine({
    binary: invocation.binary,
    args: [
      ...invocation.args.filter((argument) => {
        return argument !== ".";
      }),
      "--format",
      "json",
      `./${localPath}`,
    ],
    cwd: directory,
  });
}

function _runEngine({
  binary,
  args,
  cwd,
}: Readonly<{
  binary: string;
  args: string[];
  cwd: string;
}>): Promise<EngineResult> {
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
          failure:
            error && typeof error.code !== "number" ? error.message : undefined,
          signal: error?.signal ?? undefined,
          status: error
            ? typeof error.code === "number"
              ? error.code
              : undefined
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
  options: Readonly<{ path: string; cwd: string }>,
) => Promise<Proof> {
  const cache = new Map<string, Promise<Proof>>();
  const listings = new Map<string, Promise<Listing>>();
  let preceding: Promise<unknown> = Promise.resolve();
  return ({ path, cwd }) => {
    const key = JSON.stringify([cwd, path]);
    if (!cache.has(key)) {
      const proof = preceding.then(() => {
        return _provePath({ path: path, cwd: cwd, listings: listings });
      });
      preceding = proof.catch(() => {});
      cache.set(key, proof);
    }
    return cache.get(key)!;
  };
}
