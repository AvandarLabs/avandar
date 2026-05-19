import { modals } from "@mantine/modals";
import { uuid } from "$/lib/uuid";
import { ConsentModal } from "@/components/Privacy/ConsentModal/ConsentModal";
import { detectBias } from "@/lib/privacy/biasDetector";
import { detectPii } from "@/lib/privacy/piiDetector";
import type {
  ConsentDecision,
  ConsentModalMode,
} from "@/components/Privacy/ConsentModal/ConsentModal";
import type { BiasHit } from "@/lib/privacy/biasDetector";
import type { PiiDetectionResult } from "@/lib/privacy/piiDetector";

/**
 * `crossBoundary` is the single chokepoint for sending values or text to
 * the LLM. Every code path that crosses the data → LLM boundary should
 * route through it.
 *
 * v0 scope (what ships in this branch):
 *   - PII detection (column-name + content layers)
 *   - Bias detection (English-only patterns)
 *   - Consent modal Modes A / B / C
 *   - In-memory ack-token (no HMAC) — backend trust is **not** enforced
 *     in v0; this is a demo placeholder so we have the right shape on
 *     the client. The HMAC sign-and-verify pipeline is Phase 0 follow-up.
 *
 * Deferred (logged in CHECKPOINTS.md):
 *   - HMAC + session secret on the ack token
 *   - Backend `UNAPPROVED_DATA_TRANSFER` rejection
 *   - Dexie-persisted audit log + `/settings/privacy/log` page
 *   - Medical-strict typed-confirmation tier
 *   - Composite modal (PII + bias together)
 *   - Spanish / French pattern files
 */

export type CrossBoundaryContext =
  | "discovery_clarification"
  | "plan_step_input"
  | "user_message_text"
  | "clarification_answer";

export type CrossBoundaryRequest = {
  /**
   * For value-shaped requests, the actual values being sent. Required
   * for `discovery_clarification`, `plan_step_input`, and
   * `clarification_answer`.
   */
  values?: readonly unknown[];

  /**
   * For text-shaped requests (the user's typed message), the raw text.
   * Required for `user_message_text` and `clarification_answer`.
   */
  text?: string;

  /** Optional source column name to inform PII detection. */
  sourceColumn?: string;

  /** The DuckDB SQL that produced `values`, if applicable. */
  sourceQuery?: string;

  context: CrossBoundaryContext;
  workspaceId: string;
  threadId?: string;
};

export type ApprovedPayload = {
  ackToken: string;
  /** Final values after any user edits. */
  values: readonly unknown[];
  /** Final text after any "use suggestion" rewrite. */
  text?: string;
  context: CrossBoundaryContext;
  detected: { pii: string[]; bias: string[] };
  acknowledgedAt: number;
};

export type CrossBoundaryResult =
  | { approved: true; payload: ApprovedPayload }
  | { approved: false; reason: "cancelled" | "edited_to_empty" };

/**
 * Run detectors, surface the appropriate consent modal, and on approval
 * return a payload that downstream code can attach to its LLM request.
 *
 * Resolves with `{ approved: false, reason: "cancelled" }` if the user
 * cancels the modal — callers should drop the request silently in that
 * case (no error toast; cancel is a normal flow).
 */
export async function crossBoundary(
  req: CrossBoundaryRequest,
): Promise<CrossBoundaryResult> {
  const pii: PiiDetectionResult = detectPii({
    columnName: req.sourceColumn,
    values: req.values,
  });

  const biasInput =
    typeof req.text === "string" && req.text.trim().length > 0 ?
      req.text
    : null;
  const biasHits: BiasHit[] = biasInput ? detectBias(biasInput).hits : [];

  const mode = _chooseMode({ pii, biasHits });

  // Clean send when there is nothing to flag for value-only requests.
  if (mode === null) {
    return {
      approved: true,
      payload: {
        ackToken: _issueAckToken(req.workspaceId),
        values: req.values ?? [],
        text: req.text,
        context: req.context,
        detected: { pii: [], bias: [] },
        acknowledgedAt: Date.now(),
      },
    };
  }

  const decision = await _openModal({
    mode,
    pii,
    biasHits,
    userText: req.text,
    sampleValues: req.values,
    totalCount: req.values?.length,
    columnName: req.sourceColumn,
  });

  if (decision.action === "cancel") {
    return { approved: false, reason: "cancelled" };
  }

  // When the user picked "Use suggestion" on a bias nudge, the caller is
  // responsible for swapping the user-visible text. We attach the
  // suggestion to the payload so the caller can swap in the right place.
  const finalText =
    decision.useSuggestion && biasHits[0]?.suggestion ?
      biasHits[0].suggestion
    : req.text;

  return {
    approved: true,
    payload: {
      ackToken: _issueAckToken(req.workspaceId),
      values: req.values ?? [],
      text: finalText,
      context: req.context,
      detected: {
        pii: pii.hits.map((h) => {
          return h.label;
        }),
        bias: biasHits.map((h) => {
          return h.label;
        }),
      },
      acknowledgedAt: Date.now(),
    },
  };
}

function _chooseMode(args: {
  pii: PiiDetectionResult;
  biasHits: BiasHit[];
}): ConsentModalMode | null {
  const hasPii = args.pii.severity !== "clean";
  const hasBias = args.biasHits.length > 0;

  // v0: when both fire, surface the PII warning since it is the higher-
  // stakes signal. The composite modal (Mode D) lives in CHECKPOINTS as
  // a deferred item.
  if (hasPii) {
    return "pii_warning";
  }
  if (hasBias) {
    return "bias_nudge";
  }
  return null;
}

function _openModal(args: {
  mode: ConsentModalMode;
  pii: PiiDetectionResult;
  biasHits: BiasHit[];
  userText: string | undefined;
  sampleValues: readonly unknown[] | undefined;
  totalCount: number | undefined;
  columnName: string | undefined;
}): Promise<ConsentDecision> {
  return new Promise((resolve) => {
    const title =
      args.mode === "clean" ? "Send to AI?"
      : args.mode === "pii_warning" ? "Personal data detected"
      : "Consider rephrasing";

    let settled = false;
    const settle = (decision: ConsentDecision) => {
      if (settled) {
        return;
      }
      settled = true;
      modals.close(modalId);
      resolve(decision);
    };

    const modalId = modals.open({
      title,
      size: "md",
      onClose: () => {
        settle({ action: "cancel" });
      },
      children: (
        <ConsentModal
          mode={args.mode}
          title={title}
          pii={args.pii}
          bias={args.biasHits}
          userText={args.userText}
          sampleValues={args.sampleValues}
          totalCount={args.totalCount}
          columnName={args.columnName}
          onClose={settle}
        />
      ),
    });
  });
}

function _issueAckToken(workspaceId: string): string {
  // v0 token: just a UUID. The HMAC + session-secret pipeline lands in
  // Phase 0 follow-up; backend currently does not verify these tokens.
  return `v0.${workspaceId}.${uuid()}.${Date.now()}`;
}
