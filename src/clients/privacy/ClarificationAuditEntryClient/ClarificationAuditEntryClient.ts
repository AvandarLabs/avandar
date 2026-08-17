import { uuid } from "$/lib/uuid";
import { createDexieCrudClient } from "@/clients/dexie/createDexieCrudClient/createDexieCrudClient";
import { AvaDexie } from "@/db/dexie/AvaDexie";
import { ClarificationAuditEntryParsers } from "@/models/privacy/ClarificationAuditEntry/ClarificationAuditEntryParsers";
import { createUsableServiceClient } from "@/utils/createUsableServiceClient";
import type { ClarificationAuditEntry } from "@/models/privacy/ClarificationAuditEntry/ClarificationAuditEntry";
import type { ChatClarifyRequest } from "$/types/chat.types";

type PendingClarification = {
  id: ClarificationAuditEntry.Id;
  askedAtMs: number;
};

const PENDING = new Map<ClarificationAuditEntry.Id, PendingClarification>();

function _responseShape(
  request: ChatClarifyRequest,
): ClarificationAuditEntry.T["responseShape"] {
  if (request.responseShape.kind === "free_text") {
    return "free_text";
  }
  if (request.responseShape.kind === "discovery") {
    return request.responseShape.multi ? "discovery_multi" : "discovery_single";
  }
  return request.responseShape.multi ?
      "fixed_options_multi"
    : "fixed_options_single";
}

const clarificationAuditEntryClient = createDexieCrudClient({
  db: AvaDexie.DB,
  modelName: "ClarificationAuditEntry",
  parsers: ClarificationAuditEntryParsers,
  queries: ({ dbTable }) => {
    return {
      /** Lists clarification audit entries for one workspace, newest first. */
      listClarificationLog: async (
        workspaceId: string,
      ): Promise<ClarificationAuditEntry.T[]> => {
        const rows = await dbTable
          .where("workspaceId")
          .equals(workspaceId)
          .toArray();
        return rows
          .map((row) => {
            return ClarificationAuditEntryParsers.fromDBReadToModelRead(row);
          })
          .sort((firstEntry, secondEntry) => {
            return secondEntry.timestamp - firstEntry.timestamp;
          });
      },
    };
  },
  mutations: ({ dbTable }) => {
    return {
      /** Records that a clarification was shown without blocking on failure. */
      recordShown: async (options: {
        workspaceId: string;
        threadId?: string;
        request: ChatClarifyRequest;
      }): Promise<ClarificationAuditEntry.Id> => {
        const id = uuid() as ClarificationAuditEntry.Id;
        const askedAtMs = Date.now();
        const optionsCount =
          options.request.responseShape.kind === "fixed_options" ?
            options.request.responseShape.options.length
          : null;
        PENDING.set(id, { id, askedAtMs });
        try {
          const entry: ClarificationAuditEntry.T = {
            id,
            workspaceId: options.workspaceId,
            threadId: options.threadId ?? null,
            timestamp: askedAtMs,
            turnNumber: options.request.turnNumber,
            responseShape: _responseShape(options.request),
            questionLengthChars: options.request.question.length,
            rationaleProvided: Boolean(options.request.rationale),
            optionsCount,
            outcome: "answered",
            biasReprompts: 0,
            timeToAnswerMs: null,
            ledToSuccessfulSql: null,
            patternLocale: "en",
          };
          await dbTable.add(
            ClarificationAuditEntryParsers.fromModelInsertToDBInsert(entry),
          );
        } catch (error) {
          console.warn("[privacy] clarification audit write failed:", error);
        }
        return id;
      },
      /** Records a clarification outcome without blocking on failure. */
      recordOutcome: async (options: {
        id: ClarificationAuditEntry.Id;
        outcome: ClarificationAuditEntry.T["outcome"];
      }): Promise<void> => {
        const pending = PENDING.get(options.id);
        PENDING.delete(options.id);
        try {
          const update: ClarificationAuditEntry.T<"Update"> = {
            outcome: options.outcome,
            timeToAnswerMs: pending ? Date.now() - pending.askedAtMs : null,
          };
          await dbTable.update(
            options.id,
            ClarificationAuditEntryParsers.fromModelUpdateToDBUpdate(update),
          );
        } catch (error) {
          console.warn(
            "[privacy] clarification audit outcome write failed:",
            error,
          );
        }
      },
    };
  },
});

/** Hook-enabled client for browser-local clarification audit records. */
export const ClarificationAuditEntryClient = createUsableServiceClient(
  clarificationAuditEntryClient,
  {
    queryFns: ["listClarificationLog"],
    mutationFns: ["recordShown", "recordOutcome"],
  },
);
