import type { CoverageEvidence } from "../coverageHelpers.ts";
import type { createNativePluginContextFromConfig } from "../createNativePluginContextFromConfig.ts";

/**
 * Native diagnostic fields needed to match proof ranges and rule identities.
 */
export type Diagnostic = {
  code?: string;
  message?: string;
  severity?: string;
  filename?: string;
  labels?: Array<{ span?: { offset?: number; length?: number } }>;
};
/** Captured native process output and termination details. */
export type EngineResult = {
  stdout: string;
  stderr: string;
  status: number | undefined;
  error: boolean;
  failure?: string;
  signal?: string;
};
/** Paths selected by the engine and any operational failure. */
export type Listing = {
  paths: Set<string>;
  operational: boolean;
  recovery?: string;
};
/** Executable and arguments used to invoke the native engine. */
export type Invocation = { binary: string; args: string[] };
/** Resolved plugin identity and source configuration context. */
export type PluginContext = ReturnType<
  typeof createNativePluginContextFromConfig
>;
/** Native evidence and source ranges used to assess a reviewed path. */
export type Proof = {
  suppressedRuleNames?: string[];
  hasProvenPluginContext?: boolean;
  evidence: CoverageEvidence;
  diagnostics: Diagnostic[];
  directory?: string;
  mirrorPath?: string;
  capabilityRanges: Record<string, { start: number; end: number }>;
};
