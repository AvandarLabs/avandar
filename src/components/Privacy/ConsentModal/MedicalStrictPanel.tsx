import { Trans } from "@lingui/react/macro";
import { Alert, Checkbox, Code, Stack, Text, TextInput } from "@mantine/core";
import { IconHeartbeat } from "@tabler/icons-react";
import { ColumnNameHint } from "./ColumnNameHint";
import { PiiHitBadges } from "./PiiHitBadges";
import { RowValueList } from "./RowValueList";
import type { PiiDetectionResult } from "@/components/Privacy/privacy-helpers/piiDetector/piiDetector";

type Props = {
  /** PII findings driving the health-data warning. */
  pii: PiiDetectionResult;
  /** Source column name, if relevant. */
  columnName?: string;
  /** Capped preview slice of the values to show. */
  previewValues: readonly unknown[];
  /** The exact phrase the user must type to enable Send. */
  confirmationTarget: string;
  /** Current value of the confirmation-phrase input. */
  confirmationPhrase: string;
  /** Called when the confirmation-phrase input changes. */
  onConfirmationPhraseChange: (value: string) => void;
  /** Whether the acknowledgement checkbox is checked. */
  piiAcknowledged: boolean;
  /** Called when the acknowledgement checkbox toggles. */
  onPiiAcknowledgedChange: (checked: boolean) => void;
  /** Pre-translated Alert title. */
  alertTitle: string;
  /** Pre-translated aria-label for the confirmation input. */
  phraseAriaLabel: string;
  /** Pre-translated acknowledgement checkbox label. */
  acknowledgeLabel: string;
};

/**
 * Mode E (`medical_strict`): the user must type the exact confirmation phrase
 * and check the acknowledgement before Send enables.
 */
export function MedicalStrictPanel({
  pii,
  columnName,
  previewValues,
  confirmationTarget,
  confirmationPhrase,
  onConfirmationPhraseChange,
  piiAcknowledged,
  onPiiAcknowledgedChange,
  alertTitle,
  phraseAriaLabel,
  acknowledgeLabel,
}: Props): React.ReactNode {
  return (
    <>
      <Alert color="red" icon={<IconHeartbeat size={18} />} title={alertTitle}>
        <Text size="sm">
          <Trans>
            This data appears to contain health or patient information. Sending
            it to an AI provider may have legal and ethical implications (HIPAA,
            GDPR, etc.).
          </Trans>
        </Text>
      </Alert>

      <ColumnNameHint columnName={columnName} />

      <PiiHitBadges
        label={<Trans>Detected:</Trans>}
        hits={pii.hits}
        color="red"
      />

      <RowValueList values={previewValues} />

      <Stack gap={4}>
        <Text size="sm" fw={500}>
          <Trans>
            To confirm, type <Code>{confirmationTarget}</Code> below:
          </Trans>
        </Text>
        <TextInput
          value={confirmationPhrase}
          onChange={(e) => {
            return onConfirmationPhraseChange(e.currentTarget.value);
          }}
          placeholder={confirmationTarget}
          autoComplete="off"
          aria-label={phraseAriaLabel}
        />
      </Stack>

      <Checkbox
        label={acknowledgeLabel}
        checked={piiAcknowledged}
        onChange={(e) => {
          return onPiiAcknowledgedChange(e.currentTarget.checked);
        }}
      />
    </>
  );
}
