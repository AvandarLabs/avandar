import type { ConsentAuditEntry } from "@/models/privacy/ConsentAuditEntry/ConsentAuditEntry";

const CSV_HEADER = [
  "id",
  "timestamp",
  "workspaceId",
  "userId",
  "threadId",
  "context",
  "decision",
  "mode",
  "detectedPii",
  "detectedBias",
  "sourceColumn",
  "valueCount",
  "contentLengthChars",
  "warningShown",
  "warningDismissed",
  "suggestionUsed",
  "patternLocale",
  "detectorVersion",
  "medicalTierTriggeredBy",
  "typedConfirmationCorrect",
  "ackTokenNonce",
] as const;

/** Escapes a value using the legacy consent-audit CSV representation. */
function _escapeCsvValue(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }
  if (Array.isArray(value)) {
    return `"${value.join("|").replace(/"/g, '""')}"`;
  }
  const stringValue = String(value);
  if (/[",\n]/.test(stringValue)) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  return stringValue;
}

/** Builds a CSV download payload for browser-local consent audit records. */
export function buildConsentAuditCsv(
  entries: readonly ConsentAuditEntry.T[],
): string {
  const rows = entries.map((entry) => {
    return [
      entry.id,
      new Date(entry.timestamp).toISOString(),
      entry.workspaceId,
      entry.userId,
      entry.threadId,
      entry.context,
      entry.decision,
      entry.mode,
      entry.detectedPii,
      entry.detectedBias,
      entry.sourceColumn,
      entry.valueCount,
      entry.contentLengthChars,
      entry.warningShown,
      entry.warningDismissed,
      entry.suggestionUsed,
      entry.patternLocale,
      entry.detectorVersion,
      entry.medicalTierTriggeredBy,
      entry.typedConfirmationCorrect,
      entry.ackTokenNonce,
    ]
      .map(_escapeCsvValue)
      .join(",");
  });

  return [CSV_HEADER.join(","), ...rows].join("\n");
}
