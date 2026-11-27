/* oxlint-disable import/extensions -- Node needs source extensions. */
import { isRecord } from "../isRecord.ts";
import type { Diagnostic } from "./nativeSafeRules.types.ts";

function _isDiagnostic(value: unknown): value is Diagnostic {
  return (
    isRecord(value) &&
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
        isRecord(label) &&
        isRecord(label.span) &&
        Number.isSafeInteger(label.span.offset) &&
        Number(label.span.offset) >= 0 &&
        Number.isSafeInteger(label.span.length) &&
        Number(label.span.length) >= 0
      );
    })
  );
}

/** Parses native output into validated diagnostics, or rejects it. */
export function getNativeDiagnosticsFromOutput(
  stdout: string,
): Diagnostic[] | undefined {
  try {
    const result: unknown = JSON.parse(stdout);
    const keys = [
      "diagnostics",
      "number_of_files",
      "number_of_rules",
      "threads_count",
      "start_time",
    ];
    return isRecord(result) &&
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
