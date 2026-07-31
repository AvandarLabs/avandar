import { isDefined } from "@utils";
import { uuid } from "$/lib/uuid";
import { createDexieCrudClient } from "@/clients/dexie/createDexieCrudClient";
import { AvaDexie } from "@/db/dexie/AvaDexie";
import { ConsentAuditEntryParsers } from "@/models/privacy/ConsentAuditEntry/ConsentAuditEntryParsers";
import { createUsableServiceClient } from "@/utils/createUsableServiceClient";
import type { ConsentAuditEntry } from "@/models/privacy/ConsentAuditEntry/ConsentAuditEntry";

const RETENTION_DAYS = 90;
const DAY_IN_MILLISECONDS = 24 * 60 * 60 * 1000;

/** Inputs used to record a browser-local consent decision. */
export type RecordConsentDecisionInput = {
  workspaceId: string;
  userId: string;
  threadId?: string;
  context: ConsentAuditEntry.T["context"];
  decision: ConsentAuditEntry.T["decision"];
  mode: ConsentAuditEntry.T["mode"];
  detectedPii: readonly string[];
  detectedBias: readonly string[];
  sourceColumn?: string;
  valueCount?: number;
  contentLengthChars?: number;
  isMedical: boolean;
  typedConfirmationCorrect?: boolean;
  ackTokenNonce?: string;
};

/** Filters for browser-local consent audit entries. */
export type ConsentLogQueryOptions = {
  workspaceId?: string;
  sinceTimestamp?: number;
  context?: ConsentAuditEntry.T["context"];
  decision?: ConsentAuditEntry.T["decision"];
};

const consentAuditEntryClient = createDexieCrudClient({
  db: AvaDexie.DB,
  modelName: "ConsentAuditEntry",
  parsers: ConsentAuditEntryParsers,
  queries: ({ dbTable }) => {
    return {
      /** Lists retained consent audit entries matching the supplied filters. */
      listConsentLog: async (
        options: ConsentLogQueryOptions = {},
      ): Promise<ConsentAuditEntry.T[]> => {
        const sinceTimestamp =
          options.sinceTimestamp ??
          Date.now() - RETENTION_DAYS * DAY_IN_MILLISECONDS;
        const rows = await dbTable
          .where("timestamp")
          .above(sinceTimestamp)
          .reverse()
          .sortBy("timestamp");

        return rows
          .map((row) => {
            return ConsentAuditEntryParsers.fromDBReadToModelRead(row);
          })
          .filter((entry) => {
            return (
              (!options.workspaceId ||
                entry.workspaceId === options.workspaceId) &&
              (!options.context || entry.context === options.context) &&
              (!options.decision || entry.decision === options.decision)
            );
          });
      },
    };
  },
  mutations: ({ dbTable }) => {
    return {
      /**
       * Records one consent decision without blocking the caller on failure.
       */
      recordConsentDecision: async (
        input: RecordConsentDecisionInput,
      ): Promise<void> => {
        const warningShown: ConsentAuditEntry.T["warningShown"] = [
          input.detectedPii.length > 0 ? ("pii" as const) : undefined,
          input.detectedBias.length > 0 ? ("bias" as const) : undefined,
          input.isMedical ? ("medical" as const) : undefined,
        ].filter(isDefined);

        try {
          const entry: ConsentAuditEntry.T = {
            id: uuid() as ConsentAuditEntry.Id,
            workspaceId: input.workspaceId,
            userId: input.userId,
            threadId: input.threadId ?? null,
            timestamp: Date.now(),
            decision: input.decision,
            context: input.context,
            mode: input.mode,
            detectedPii: [...input.detectedPii],
            detectedBias: [...input.detectedBias],
            sourceColumn: input.sourceColumn ?? null,
            valueCount: input.valueCount ?? 0,
            contentLengthChars: input.contentLengthChars ?? null,
            warningShown,
            warningDismissed:
              input.decision === "cancelled" ? warningShown : [],
            suggestionUsed:
              input.decision === "used_suggestion" ? true
              : warningShown.includes("bias") ? false
              : null,
            patternLocale: "en",
            detectorVersion: "1.0.0",
            medicalTierTriggeredBy: input.isMedical ? "column" : null,
            typedConfirmationCorrect: input.typedConfirmationCorrect ?? null,
            ackTokenNonce: input.ackTokenNonce ?? null,
          };
          await dbTable.add(
            ConsentAuditEntryParsers.fromModelInsertToDBInsert(entry),
          );
        } catch (error) {
          console.warn("[privacy] consent audit write failed:", error);
        }
      },
      /** Deletes every browser-local consent audit entry. */
      clearConsentLog: async (): Promise<void> => {
        await dbTable.clear();
      },
    };
  },
});

/** Hook-enabled client for browser-local consent audit records. */
export const ConsentAuditEntryClient = createUsableServiceClient(
  consentAuditEntryClient,
  {
    queryFns: ["listConsentLog"],
    mutationFns: ["recordConsentDecision", "clearConsentLog"],
  },
);
