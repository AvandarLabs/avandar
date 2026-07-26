import { createModule } from "@modules";
import { isDefined } from "@utils";
import { uuid } from "$/lib/uuid";
import Dexie from "dexie";
import type { ConsentModalMode } from "@/components/Privacy/ConsentModal/ConsentModal";
import type { CrossBoundaryContext } from "@/lib/privacy/crossBoundary";
import type { Table } from "dexie";

/**
 * Dexie-backed audit log of every consent decision the user made.
 * Local-only, never synced. The "/settings/privacy/log" page renders
 * it back to the user — workspace owner / org-wide views are
 * deliberately out of scope.
 *
 * Crucially: we never store the *values* that were approved. The audit
 * log records consent metadata only. Anything more turns this table
 * into a PII honeypot.
 *
 * Kept in its own database (`AvandarConsentAuditDB`) rather than
 * inside the main `AvandarDB` so adding the table doesn't require
 * bumping the main Dexie version — those migrations are heavy and
 * risk blocking the rest of the app on a privacy-feature ship.
 */

export type ConsentDecisionKind =
  | "approved"
  | "used_suggestion"
  | "cancelled"
  | "edited";

export type ConsentAuditEntry = {
  id: string;
  workspaceId: string;
  userId: string;
  threadId: string | null;
  timestamp: number;

  decision: ConsentDecisionKind;
  context: CrossBoundaryContext;
  mode: ConsentModalMode;

  detectedPii: string[];
  detectedBias: string[];

  sourceColumn: string | null;
  valueCount: number;
  contentLengthChars: number | null;

  warningShown: Array<"pii" | "bias" | "medical">;
  warningDismissed: Array<"pii" | "bias" | "medical">;
  suggestionUsed: boolean | null;

  patternLocale: string;
  detectorVersion: string;

  medicalTierTriggeredBy: "column" | "content" | "workspace_flag" | null;
  typedConfirmationCorrect: boolean | null;

  ackTokenNonce: string | null;
};

class AvandarConsentAuditDB extends Dexie {
  consent!: Table<ConsentAuditEntry, string>;

  constructor() {
    super("AvandarConsentAuditDB");
    this.version(1).stores({
      consent: "id, workspaceId, userId, timestamp, context, decision",
    });
  }
}

const db = new AvandarConsentAuditDB();

const DETECTOR_VERSION = "1.0.0";
const PATTERN_LOCALE = "en";

const RETENTION_DAYS = 90;

export type RecordConsentDecisionInput = {
  workspaceId: string;
  userId: string;
  threadId?: string;
  context: CrossBoundaryContext;
  decision: ConsentDecisionKind;
  mode: ConsentModalMode;
  detectedPii: string[];
  detectedBias: string[];
  sourceColumn?: string;
  valueCount?: number;
  contentLengthChars?: number;
  isMedical: boolean;
  typedConfirmationCorrect: boolean | null;
  ackTokenNonce?: string;
};

export type ConsentLogQueryOptions = {
  workspaceId?: string;
  /** Lower-bound timestamp (ms). Defaults to the retention window. */
  sinceTimestamp?: number;
  /** Filter to one context shape. */
  context?: CrossBoundaryContext;
  /** Filter to one decision. */
  decision?: ConsentDecisionKind;
};

export const ConsentAuditLog = createModule("ConsentAuditLog", {
  builder: () => {
    return {
      recordConsentDecision: async (
        input: RecordConsentDecisionInput,
      ): Promise<void> => {
        const warningShown: ConsentAuditEntry["warningShown"] = [
          input.detectedPii.length > 0 ? ("pii" as const) : undefined,
          input.detectedBias.length > 0 ? ("bias" as const) : undefined,
          input.isMedical ? ("medical" as const) : undefined,
        ].filter(isDefined);

        const entry: ConsentAuditEntry = {
          id: uuid(),
          workspaceId: input.workspaceId,
          userId: input.userId,
          threadId: input.threadId ?? null,
          timestamp: Date.now(),
          decision: input.decision,
          context: input.context,
          mode: input.mode,
          detectedPii: input.detectedPii,
          detectedBias: input.detectedBias,
          sourceColumn: input.sourceColumn ?? null,
          valueCount: input.valueCount ?? 0,
          contentLengthChars: input.contentLengthChars ?? null,
          warningShown,
          warningDismissed: input.decision === "cancelled" ? warningShown : [],
          suggestionUsed:
            input.decision === "used_suggestion" ? true
            : warningShown.includes("bias") ? false
            : null,
          patternLocale: PATTERN_LOCALE,
          detectorVersion: DETECTOR_VERSION,
          medicalTierTriggeredBy: input.isMedical ? "column" : null,
          typedConfirmationCorrect: input.typedConfirmationCorrect,
          ackTokenNonce: input.ackTokenNonce ?? null,
        };

        try {
          await db.consent.add(entry);
        } catch (e) {
          // Never block a consent decision on audit-log failure. The user's
          // approval still takes effect; we just lose the entry.

          console.warn("[privacy] consent audit write failed:", e);
        }
      },

      listConsentLog: async (
        options: ConsentLogQueryOptions = {},
      ): Promise<ConsentAuditEntry[]> => {
        const since =
          options.sinceTimestamp ??
          Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000;

        const query = db.consent.where("timestamp").above(since);

        const rows = await query.reverse().sortBy("timestamp");
        return rows.filter((entry) => {
          if (
            options.workspaceId &&
            entry.workspaceId !== options.workspaceId
          ) {
            return false;
          }
          if (options.context && entry.context !== options.context) {
            return false;
          }
          if (options.decision && entry.decision !== options.decision) {
            return false;
          }
          return true;
        });
      },

      /**
       * Drop everything from the audit log. Triggered from the privacy log
       * page so the user can purge their own history.
       */
      clearConsentLog: async (): Promise<void> => {
        await db.consent.clear();
      },

      /**
       * Render the audit log as a CSV string for download.
       */
      consentLogToCsv: (entries: ConsentAuditEntry[]): string => {
        const header = [
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
        ];
        const escape = (v: unknown): string => {
          if (v === null || v === undefined) {
            return "";
          }
          if (Array.isArray(v)) {
            return `"${v.join("|").replace(/"/g, '""')}"`;
          }
          const s = String(v);
          if (/[",\n]/.test(s)) {
            return `"${s.replace(/"/g, '""')}"`;
          }
          return s;
        };

        const lines = [
          header.join(","),
          ...entries.map((entry) => {
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
              .map(escape)
              .join(",");
          }),
        ];
        return lines.join("\n");
      },
    };
  },
});
