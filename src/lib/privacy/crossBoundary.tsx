import { modals } from "@mantine/modals";
import { ConsentModal } from "@/components/Privacy/ConsentModal/ConsentModal";
import { detectBias } from "@/lib/privacy/biasDetector";
import { recordConsentDecision } from "@/lib/privacy/consentAuditLog";
import { detectPii } from "@/lib/privacy/piiDetector";
import { registerAck } from "@/lib/privacy/pendingAcks";
import {
  hashTextPayload,
  issueAckToken,
} from "@/lib/privacy/sessionSecret";
import type {
  ConsentDecision,
  ConsentModalMode,
} from "@/components/Privacy/ConsentModal/ConsentModal";
import type { BiasHit } from "@/lib/privacy/biasDetector";
import type { PiiDetectionResult } from "@/lib/privacy/piiDetector";
import type { Workspace } from "$/models/Workspace/Workspace";

/**
 * `crossBoundary` is the single chokepoint for sending values or text to
 * the LLM. Every code path that crosses the data → LLM boundary should
 * route through it.
 *
 * v1 scope (what ships in this branch):
 *   - PII detection (column-name + content layers, English-only)
 *   - Bias detection (English-only patterns)
 *   - Consent modal Modes A / B / C / D / E
 *   - HMAC-signed ack tokens via `sessionSecret.ts`; backend rejects
 *     unverified consent acks with `UNAPPROVED_DATA_TRANSFER` (400)
 *   - Dexie-persisted audit log; viewable at `/settings/privacy/log`
 *
 * Deferred (logged in CHECKPOINTS.md):
 *   - Spanish / French pattern files (UX copy stubbed; patterns to follow
 *     after a social-sector-advisor review per spec)
 *   - Server-issued nonce registry (v2 of the ack-token design — for now
 *     replay protection is best-effort in-memory on the edge worker)
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
  workspaceId: Workspace.Id;
  userId: string;
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

  // Clean send when there is nothing to flag.
  if (mode === null) {
    const ackToken = await _mintAckFor(req, req.text ?? "");
    await recordConsentDecision({
      workspaceId: req.workspaceId,
      userId: req.userId,
      context: req.context,
      decision: "approved",
      mode: "clean",
      detectedPii: [],
      detectedBias: [],
      sourceColumn: req.sourceColumn,
      isMedical: false,
      typedConfirmationCorrect: null,
    });
    return {
      approved: true,
      payload: {
        ackToken,
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
    await recordConsentDecision({
      workspaceId: req.workspaceId,
      userId: req.userId,
      context: req.context,
      decision: "cancelled",
      mode,
      detectedPii: pii.hits.map((h) => {
        return h.label;
      }),
      detectedBias: biasHits.map((h) => {
        return h.label;
      }),
      sourceColumn: req.sourceColumn,
      isMedical: pii.isMedical,
      typedConfirmationCorrect:
        mode === "medical_strict" ? false : null,
    });
    return { approved: false, reason: "cancelled" };
  }

  // When the user picked "Use suggestion" on a bias nudge, swap the
  // suggestion into the outgoing text. The ack token must cover the
  // FINAL text the model will see, so we hash post-swap.
  const finalText =
    decision.useSuggestion && biasHits[0]?.suggestion ?
      biasHits[0].suggestion
    : req.text;

  const ackToken = await _mintAckFor(req, finalText ?? "");

  await recordConsentDecision({
    workspaceId: req.workspaceId,
    userId: req.userId,
    context: req.context,
    decision: decision.useSuggestion ? "used_suggestion" : "approved",
    mode,
    detectedPii: pii.hits.map((h) => {
      return h.label;
    }),
    detectedBias: biasHits.map((h) => {
      return h.label;
    }),
    sourceColumn: req.sourceColumn,
    isMedical: pii.isMedical,
    typedConfirmationCorrect:
      mode === "medical_strict" ? true : null,
  });

  return {
    approved: true,
    payload: {
      ackToken,
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

/**
 * Mint an HMAC-signed ack token covering `text`, and register it in the
 * pending-acks queue so the next outgoing chat request picks it up.
 * Value-shaped (row data) consent will follow the same pattern once
 * Phase 2 lands; for v1 only text payloads ride this rail.
 */
async function _mintAckFor(
  req: CrossBoundaryRequest,
  text: string,
): Promise<string> {
  const payloadHash = await hashTextPayload(text);
  const ackToken = await issueAckToken({
    workspaceId: req.workspaceId,
    userId: req.userId,
    payloadHash,
  });
  if (text) {
    await registerAck({ text, ackToken });
  }
  return ackToken;
}

function _chooseMode(args: {
  pii: PiiDetectionResult;
  biasHits: BiasHit[];
}): ConsentModalMode | null {
  const hasPii = args.pii.severity !== "clean";
  const hasBias = args.biasHits.length > 0;

  // Medical-strict tier wins regardless of other detections — the
  // typed-confirmation gate is the highest-friction modal we ship.
  if (args.pii.isMedical) {
    return "medical_strict";
  }
  // Composite: both PII and bias fired. The composite modal lets the
  // user satisfy both gates in one step (ack PII + decide on bias
  // suggestion or send-as-is).
  if (hasPii && hasBias) {
    return "composite";
  }
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
      : args.mode === "medical_strict" ? "Health information detected"
      : args.mode === "composite" ? "Review before sending"
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

