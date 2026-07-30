import { Trans } from "@lingui/react/macro";
import { Button, Group } from "@mantine/core";

type Props = {
  canSubmit: boolean;
  onConfirm: () => void;
  noneOfAboveLabel?: string;
  isNoneOfAboveDisabled?: boolean;
  onNoneOfAbove?: () => void;
};

/** Renders clarification confirmation and optional rejection controls. */
export function ClarificationAnswerActions({
  canSubmit,
  onConfirm,
  noneOfAboveLabel,
  isNoneOfAboveDisabled,
  onNoneOfAbove,
}: Readonly<Props>): React.ReactNode {
  return (
    <Group justify="flex-end" gap="xs">
      {noneOfAboveLabel && onNoneOfAbove ?
        <Button
          variant="subtle"
          color="neutral"
          size="xs"
          onClick={onNoneOfAbove}
          disabled={isNoneOfAboveDisabled}
        >
          {noneOfAboveLabel}
        </Button>
      : null}
      <Button size="xs" onClick={onConfirm} disabled={!canSubmit}>
        <Trans>Confirm</Trans>
      </Button>
    </Group>
  );
}
