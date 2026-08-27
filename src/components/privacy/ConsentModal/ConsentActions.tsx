import { Trans } from "@lingui/react/macro";
import { Button, Group } from "@mantine/core";
import type { ConsentDecision, ConsentModalMode } from "./ConsentModal";
import type { BiasHit } from "@/components/privacy/privacy-helpers/detectBias/detectBias";

type Props = {
  /** Active consent mode, which drives button colors and gating. */
  mode: ConsentModalMode;
  /** Bias findings, used to decide whether "Use suggestion" is offered. */
  bias?: BiasHit[];
  /** Whether the PII acknowledgement has been checked. */
  piiAcknowledged: boolean;
  /** Whether the primary Send button is disabled for the current mode. */
  sendDisabled: boolean;
  /** Pre-translated label for the primary button (Send / Continue as-is). */
  sendButtonLabel: string;
  /** Resolves the modal with the user's decision. */
  onClose: (decision: ConsentDecision) => void;
};

/**
 * Renders the consent modal footer actions.
 * Returns cancel, optional suggestion, and primary send controls.
 */
export function ConsentActions({
  mode,
  bias,
  piiAcknowledged,
  sendDisabled,
  sendButtonLabel,
  onClose,
}: Props): React.ReactNode {
  return (
    <Group justify="flex-end" gap="xs">
      <Button
        variant="subtle"
        color="neutral"
        onClick={() => {
          return onClose({ action: "cancel" });
        }}
      >
        <Trans>Cancel</Trans>
      </Button>

      {(mode === "bias_nudge" || mode === "composite") &&
      bias &&
      bias.length > 0 &&
      bias[0]?.suggestion ? (
        <Button
          variant="outline"
          color="blue"
          disabled={mode === "composite" && !piiAcknowledged}
          onClick={() => {
            return onClose({ action: "send", useSuggestion: true });
          }}
        >
          <Trans>Use suggestion</Trans>
        </Button>
      ) : null}

      <Button
        color={
          mode === "medical_strict"
            ? "red"
            : mode === "pii_warning" || mode === "composite"
              ? "red"
              : "primary"
        }
        disabled={sendDisabled}
        onClick={() => {
          return onClose({ action: "send" });
        }}
        data-autofocus={mode === "clean" || mode === "bias_nudge"}
      >
        {sendButtonLabel}
      </Button>
    </Group>
  );
}
