import type { BiasHit } from "@/components/privacy/privacy-helpers/detectBias/detectBias";
import type { PiiDetectionResult } from "@/components/privacy/privacy-helpers/detectPii/detectPii";

import { Trans } from "@lingui/react/macro";
import { Alert, Checkbox, Stack, Text } from "@mantine/core";
import { IconAlertTriangle } from "@tabler/icons-react";

import { BiasHitBadges } from "./BiasHitBadges";
import { ColumnNameHint } from "./ColumnNameHint";
import { PiiHitBadges } from "./PiiHitBadges";
import { RowValueList } from "./RowValueList";

type Props = {
  /** PII findings driving the warning. */
  pii: PiiDetectionResult;
  /** Bias findings driving the nudge. Non-empty when this panel renders. */
  bias: BiasHit[];
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
 * Renders the consent modal content for combined PII and bias findings.
 * Returns the composite review panel with details and acknowledgement controls.
 */
export function CompositePanel({
  pii,
  bias,
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
            We detected both potential personal information and language that
            may bias the AI&apos;s answer. Review both below.
          </Trans>
        </Text>
      </Alert>

      <ColumnNameHint columnName={columnName} />

      <PiiHitBadges
        label={<Trans>PII detected:</Trans>}
        hits={pii.hits}
        color={pii.severity === "critical" ? "red" : "yellow"}
      />

      <BiasHitBadges label={<Trans>Bias detected:</Trans>} hits={bias} />

      <RowValueList values={previewValues} />

      {bias[0]?.suggestion ? (
        <Stack gap={4}>
          <Text size="xs" c="dimmed">
            <Trans>Suggested rewrite:</Trans>
          </Text>
          <Text size="sm">{bias[0].suggestion}</Text>
        </Stack>
      ) : null}

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
