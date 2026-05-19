import { uuid } from "$/lib/uuid";
import Dexie from "dexie";
import type { ChatClarifyRequest } from "$/types/chat.types";
import type { Table } from "dexie";

/**
 * Per-clarification telemetry per the chat-interactive-workflows spec
 * (Phase 1). Records ONLY metadata about the clarification turn — not
 * the question text, not the user's answer. Lives in the same separate
 * Dexie database as the consent audit log so the two can share the
 * "Privacy log" page without a main-schema bump.
 */
export type ClarificationOutcome =
  | "answered"
  | "let_ai_decide"
  | "cancelled"
  | "cap_reached"
  | "neutral_failure";

export type ClarificationAuditEntry = {
  id: string;
  workspaceId: string;
  threadId: string | null;
  timestamp: number;
  turnNumber: 1 | 2 | 3;
  responseShape: "free_text" | "fixed_options_single" | "fixed_options_multi";
  questionLengthChars: number;
  rationaleProvided: boolean;
  optionsCount: number | null;
  outcome: ClarificationOutcome;
  biasReprompts: number;
  timeToAnswerMs: number | null;
  ledToSuccessfulSql: boolean | null;
  patternLocale: string;
};

class AvandarClarificationAuditDB extends Dexie {
  clarifications!: Table<ClarificationAuditEntry, string>;

  constructor() {
    super("AvandarClarificationAuditDB");
    this.version(1).stores({
      clarifications: "id, workspaceId, timestamp, outcome, turnNumber",
    });
  }
}

const db = new AvandarClarificationAuditDB();

const PATTERN_LOCALE = "en";

type AskedAt = { id: string; askedAtMs: number };

/** In-memory link between a clarification shown and the entry id used
 *  to record it. The frontend records the question on display and updates
 *  the row on outcome — Dexie .add() + .update() rather than insert-only
 *  so we can fill in `timeToAnswerMs` and `outcome` together.
 */
const PENDING = new Map<string, AskedAt>();

function _responseShape(
  request: ChatClarifyRequest,
): ClarificationAuditEntry["responseShape"] {
  if (request.responseShape.kind === "free_text") {
    return "free_text";
  }
  if (request.responseShape.multi) {
    return "fixed_options_multi";
  }
  return "fixed_options_single";
}

/**
 * Record the clarification at the moment it's shown to the user. Returns
 * the row id so the caller can settle it later with `recordOutcome`.
 */
export async function recordShown(args: {
  workspaceId: string;
  threadId?: string;
  request: ChatClarifyRequest;
}): Promise<string> {
  const id = uuid();
  const responseShape = _responseShape(args.request);
  const optionsCount =
    args.request.responseShape.kind === "fixed_options" ?
      args.request.responseShape.options.length
    : null;

  PENDING.set(id, { id, askedAtMs: Date.now() });

  try {
    await db.clarifications.add({
      id,
      workspaceId: args.workspaceId,
      threadId: args.threadId ?? null,
      timestamp: Date.now(),
      turnNumber: args.request.turnNumber,
      responseShape,
      questionLengthChars: args.request.question.length,
      rationaleProvided: Boolean(args.request.rationale),
      optionsCount,
      outcome: "answered", // tentative; updated by recordOutcome
      biasReprompts: 0,
      timeToAnswerMs: null,
      ledToSuccessfulSql: null,
      patternLocale: PATTERN_LOCALE,
    });
  } catch (e) {
     
    console.warn("[privacy] clarification audit write failed:", e);
  }
  return id;
}

export async function recordOutcome(args: {
  id: string;
  outcome: ClarificationOutcome;
}): Promise<void> {
  const pending = PENDING.get(args.id);
  const now = Date.now();
  const elapsed = pending ? now - pending.askedAtMs : null;
  PENDING.delete(args.id);
  try {
    await db.clarifications.update(args.id, {
      outcome: args.outcome,
      timeToAnswerMs: elapsed,
    });
  } catch (e) {
     
    console.warn("[privacy] clarification audit outcome write failed:", e);
  }
}

export async function listClarificationLog(
  workspaceId: string,
): Promise<ClarificationAuditEntry[]> {
  const rows = await db.clarifications.toArray();
  return rows
    .filter((r) => {
      return r.workspaceId === workspaceId;
    })
    .sort((a, b) => {
      return b.timestamp - a.timestamp;
    });
}
