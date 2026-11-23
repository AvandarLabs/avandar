import { resolve } from "node:path";
// oxlint-disable-next-line import/extensions -- Node needs source extensions.
import { loadNativeProof } from "./loadNativeProof.ts";
// oxlint-disable-next-line import/extensions -- Node needs source extensions.
import {
  CAPABILITIES,
  CUSTOM_RULE_IDS,
  JS_RULE_IDS,
  NATIVE_CODES,
  UNPROVEN,
} from "./nativeSafeRules.constants.ts";
import type { CoverageProbe } from "../coverage.ts";
import type { Proof } from "./nativeSafeRules.types.ts";

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
      const hasSuppression =
        proof.suppressedRuleNames?.some((name) => {
          return name === "*" || name === nativeRule;
        }) === true;
      const diagnosed =
        !hasSuppression &&
        hasProvenContext &&
        (!requiresOriginalModule || hasOriginalModule) &&
        _hasDiagnostic(
          proof,
          capability,
          code,
          CUSTOM_RULE_IDS.includes(ruleId) ? `${ruleId}:` : undefined,
        );
      const recovery = hasSuppression
        ? "Run fallback review for original suppression contexts. A tail seed cannot prove enforcement in disabled regions or lines, even after re-enable."
        : !hasProvenContext && proof.mirrorPath && proof.evidence.operational
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

/**
 * Gives `runCli` real engine proofs for independently seeded safe fixes.
 * Exact reviewed paths retain root and nested config, ignore and project rules.
 */
export function createNativeCoverageProbes(): CoverageProbe[] {
  const getProof = loadNativeProof();
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
