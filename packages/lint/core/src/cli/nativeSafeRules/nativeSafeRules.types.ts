import type { CoverageEvidence } from "../coverage.ts";
import type { getNativePluginContext } from "../getNativePluginContext.ts";

export type Diagnostic = {
  code?: string;
  message?: string;
  severity?: string;
  filename?: string;
  labels?: Array<{ span?: { offset?: number; length?: number } }>;
};
export type EngineResult = {
  stdout: string;
  stderr: string;
  status: number | null;
  error: boolean;
};
export type Listing = { paths: Set<string>; operational: boolean };
export type Invocation = { binary: string; args: string[] };
export type PluginContext = ReturnType<typeof getNativePluginContext>;
export type Proof = {
  suppressedRuleNames?: string[];
  hasProvenPluginContext?: boolean;
  evidence: CoverageEvidence;
  diagnostics: Diagnostic[];
  directory?: string;
  mirrorPath?: string;
  capabilityRanges: Record<string, { start: number; end: number }>;
};
