import { Trans } from "@lingui/react/macro";
import { Alert, Checkbox, Text } from "@mantine/core";
import { IconAlertTriangle } from "@tabler/icons-react";
import { ColumnNameHint } from "./ColumnNameHint";
import { PiiHitBadges } from "./PiiHitBadges";
import { RowValueList } from "./RowValueList";
import type { PiiDetectionResult } from "@/components/privacy/privacy-helpers/detectPii/detectPii";

type Props = {
  /** PII findings driving the warning. */
  pii: PiiDetectionResult;
  /** Source column name, if relevant. */
  columnName?: string;
  /** Capped preview slice of the values to show. */
  previewValues: readonly unknown[];
  /** Whether the acknowledgement checkbox is checked. */
  piiAcknowledged: boolean;
  /** Called when the acknowledgement checkbox toggles. */
  onPiiAcknowledgedChange: (checked: boolean) => void;
  /** Pre-translated Alert title. */
  alertTitle: string;
  /** Pre-translated acknowledgement checkbox label. */
  acknowledgeLabel: string;
};

/**
 * Renders the consent modal content for non-medical PII findings.
 * Returns the warning panel with details and acknowledgement controls.
 */
export function PiiWarningPanel({
  pii,
  columnName,
  previewValues,
  piiAcknowledged,
  onPiiAcknowledgedChange,
  alertTitle,
  acknowledgeLabel,
}: Props): React.ReactNode {
  return (
    <>
      <Alert
        color={pii.severity === "critical" ? "red" : "yellow"}
        icon={<IconAlertTriangle size={18} />}
        title={alertTitle}
      >
        <Text size="sm">
          <Trans>
            The values you selected may contain personal information. The AI
            provider will receive them and may log the request.
          </Trans>
        </Text>
      </Alert>

      <ColumnNameHint columnName={columnName} />

      <PiiHitBadges
        label={<Trans>Detected:</Trans>}
        hits={pii.hits}
        color={
          pii.severity === "critical" ? "red"
          : pii.severity === "warning" ?
            "yellow"
          : "gray"
        }
      />

      <RowValueList values={previewValues} />

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
