import { modals } from "@mantine/modals";
import { ConsentModal } from "@/components/Privacy/ConsentModal/ConsentModal";
import { detectBias } from "@/lib/privacy/biasDetector";
import { recordConsentDecision } from "@/lib/privacy/consentAuditLog";
import { registerAck } from "@/lib/privacy/pendingAcks";
import { detectPii } from "@/lib/privacy/piiDetector";
import { hashTextPayload, issueAckToken } from "@/lib/privacy/sessionSecret";
import type {
  ConsentDecision,
  ConsentModalMode,
} from "@/components/Privacy/ConsentModal/ConsentModal";
import type { BiasHit } from "@/lib/privacy/biasDetector";
import type { PiiDetectionResult } from "@/lib/privacy/piiDetector";
import type { Workspace } from "$/models/Workspace/Workspace";

/**
 * Privacy chokepoint for anything that leaves the browser for the LLM.
 *
 * **What "crossBoundary" means:** Avandar keeps row-level data in DuckDB on
 * the client. The "boundary" is browser → model/API. `crossBoundary()` is
 * the only supported way to move user-typed text or concrete cell values
 * across that boundary. Call it before appending chat text, sending
 * clarification answers, applying generated SQL with assumed filters, etc.
 *
 * **What it does:**
 *   1. Run local PII + bias detectors (no LLM).
 *   2. If needed, open `ConsentModal` so the user explicitly approves.
 *   3. On approval, mint an HMAC `ackToken` and queue it in `pendingAcks.ts`.
 *   4. `useAvandarChatRuntime` attaches matching acks on the next
 *      `chat/.../messages` POST; the edge function verifies them or returns
 *      `UNAPPROVED_DATA_TRANSFER`.
 *
 * **Call sites (grep `crossBoundary(`):** chat user messages, clarification
 * answers, discovery dropdown picks, assumed SQL literals after the
 * clarification cap (`generated_sql_assumptions`).
 *
 * **Design doc:** `docs/superpowers/specs/2026-05-19-chat-interactive-
 * workflows-design.md`
 * (section "`crossBoundary` API"). Audit UI: Settings → Privacy log.
 *
 * v1 scope:
 *   - PII detection (column-name + content layers, English-only)
 *   - Bias detection (English-only patterns)
 *   - Consent modal modes A–E (`ConsentModal.tsx`)
 *   - Dexie audit via `consentAuditLog.ts` and `clarificationAuditLog.ts`
 *
 * Deferred (see `docs/ict4d-demo/CHECKPOINTS.md`):
 *   - Spanish / French pattern files
 *   - Server-issued nonce registry for ack replay protection
 */

export type CrossBoundaryContext =
  | "discovery_clarification"
  | "generated_sql_assumptions"
  | "user_message_text"
  | "clarification_answer";

export type CrossBoundaryRequest = {
  /**
   * For value-shaped requests, the actual values being sent. Required
   * for `discovery_clarification` and `clarification_answer`.
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
  /**
   * When true, show the consent modal even if detectors are clean — used
   * for assumed SQL filter values after the clarification cap.
   */
  explicitConsentRequired?: boolean;
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
 * Run detectors, surface the consent modal when required, and return an
 * approved payload (with `ackToken`) for the caller to send onward.
 *
 * @see Module comment above for architecture and design-doc link.
 *
 * Resolves with `{ approved: false, reason: "cancelled" }` if the user
 * dismisses the modal — callers should abort that send (no error toast).
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

  let mode = _chooseMode({ pii, biasHits });

  const hasPayload =
    (typeof req.text === "string" && req.text.trim().length > 0) ||
    (req.values !== undefined && req.values.length > 0);

  if (mode === null && req.explicitConsentRequired && hasPayload) {
    mode = "clean";
  }

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
      typedConfirmationCorrect: mode === "medical_strict" ? false : null,
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
    typedConfirmationCorrect: mode === "medical_strict" ? true : null,
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
