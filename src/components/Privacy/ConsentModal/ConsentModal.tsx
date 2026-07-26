import { useLingui } from "@lingui/react/macro";
import { Stack } from "@mantine/core";
import { useState } from "react";
import { BiasNudgePanel } from "./BiasNudgePanel";
import { CleanPanel } from "./CleanPanel";
import { CompositePanel } from "./CompositePanel";
import { ConsentActions } from "./ConsentActions";
import { MedicalStrictPanel } from "./MedicalStrictPanel";
import { PiiWarningPanel } from "./PiiWarningPanel";
import type { BiasHit } from "@/components/Privacy/privacy-helpers/biasDetector/biasDetector";
import type { PiiDetectionResult } from "@/components/Privacy/privacy-helpers/piiDetector/piiDetector";

/**
 * All five modes from the chat-interactive-workflows spec:
 *
 *   - `clean`: Mode A. Simple "Send N values" confirmation.
 *   - `pii_warning`: Mode B. Default-cancel; Send requires a checked ack.
 *   - `bias_nudge`: Mode C. Soft, non-blocking; "continue as-is" always
 *     available alongside "use suggestion".
 *   - `composite`: Mode D. Bias + PII fired together; both decisions
 *     required before submit (PII ack checkbox + bias decision).
 *   - `medical_strict`: Mode E. User must type the exact phrase
 *     `SEND HEALTH DATA` to enable the send button.
 */
export type ConsentModalMode =
  | "clean"
  | "pii_warning"
  | "bias_nudge"
  | "composite"
  | "medical_strict";

/** Phrase users must type to confirm health-data sends. */
export const MEDICAL_CONFIRMATION_PHRASE = "SEND HEALTH DATA";

export type ConsentDecision =
  | { action: "send"; useSuggestion?: boolean }
  | { action: "cancel" };

type Props = {
  mode: ConsentModalMode;
  /** Short title for the modal header. */
  title: string;
  /** PII findings, populated for `pii_warning` mode. */
  pii?: PiiDetectionResult;
  /** Bias findings, populated for `bias_nudge` mode. */
  bias?: BiasHit[];
  /** What the user wrote. Shown in bias-nudge mode. */
  userText?: string;
  /** Sample of the values that will leave the browser. Capped to ~6. */
  sampleValues?: readonly unknown[];
  /** Total count being sent (sampleValues may be a subset). */
  totalCount?: number;
  /** Source column name, if relevant. */
  columnName?: string;
  onClose: (decision: ConsentDecision) => void;
};

const MAX_PREVIEW_VALUES = 6;

/**
 * Consent gate shown before row-level data leaves the browser for the LLM.
 * This component owns all interaction state (PII acknowledgement, the
 * medical confirmation phrase) and the per-mode send gating, then delegates
 * each mode's presentation to a dedicated panel plus the shared action bar.
 */
export function ConsentModal({
  mode,
  pii,
  bias,
  userText,
  sampleValues,
  totalCount,
  columnName,
  onClose,
}: Props): React.ReactNode {
  const { t } = useLingui();
  const [piiAcknowledged, setPiiAcknowledged] = useState(false);
  const [confirmationPhrase, setConfirmationPhrase] = useState("");

  const previewValues =
    sampleValues ? sampleValues.slice(0, MAX_PREVIEW_VALUES) : [];

  const medicalPhraseOk =
    confirmationPhrase.trim().toUpperCase() === MEDICAL_CONFIRMATION_PHRASE;

  // Send button is disabled until all gates pass for the current mode.
  const sendDisabled =
    (mode === "pii_warning" && !piiAcknowledged) ||
    (mode === "composite" && !piiAcknowledged) ||
    (mode === "medical_strict" && (!piiAcknowledged || !medicalPhraseOk));

  return (
    <Stack gap="md">
      {mode === "clean" ?
        <CleanPanel
          totalCount={totalCount}
          sampleValues={sampleValues}
          columnName={columnName}
          previewValues={previewValues}
        />
      : null}

      {mode === "pii_warning" && pii ?
        <PiiWarningPanel
          pii={pii}
          columnName={columnName}
          previewValues={previewValues}
          piiAcknowledged={piiAcknowledged}
          onPiiAcknowledgedChange={setPiiAcknowledged}
          alertTitle={t`Personal data detected`}
          acknowledgeLabel={t`I understand this data will be sent to the AI provider`}
        />
      : null}

      {mode === "medical_strict" && pii ?
        <MedicalStrictPanel
          pii={pii}
          columnName={columnName}
          previewValues={previewValues}
          confirmationTarget={MEDICAL_CONFIRMATION_PHRASE}
          confirmationPhrase={confirmationPhrase}
          onConfirmationPhraseChange={setConfirmationPhrase}
          piiAcknowledged={piiAcknowledged}
          onPiiAcknowledgedChange={setPiiAcknowledged}
          alertTitle={t`Health information detected`}
          phraseAriaLabel={t`Type the confirmation phrase`}
          acknowledgeLabel={t`I have legal authority to share this data with the AI provider`}
        />
      : null}

      {mode === "composite" && pii && bias && bias.length > 0 ?
        <CompositePanel
          pii={pii}
          bias={bias}
          columnName={columnName}
          previewValues={previewValues}
          piiAcknowledged={piiAcknowledged}
          onPiiAcknowledgedChange={setPiiAcknowledged}
          alertTitle={t`Personal data + biased framing detected`}
          acknowledgeLabel={t`I understand this data will be sent to the AI provider`}
        />
      : null}

      {mode === "bias_nudge" && bias && bias.length > 0 ?
        <BiasNudgePanel
          bias={bias}
          userText={userText}
          alertTitle={t`Consider rephrasing`}
        />
      : null}

      <ConsentActions
        mode={mode}
        bias={bias}
        piiAcknowledged={piiAcknowledged}
        sendDisabled={sendDisabled}
        sendButtonLabel={mode === "bias_nudge" ? t`Continue as-is` : t`Send`}
        onClose={onClose}
      />
    </Stack>
  );
}
