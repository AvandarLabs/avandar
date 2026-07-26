import { Trans } from "@lingui/react/macro";
import { Code, Text } from "@mantine/core";

type Props = {
  /** Source column the values came from. Nothing renders when absent. */
  columnName?: string;
};

/**
 * The dimmed "From column: <name>" caption shared by every consent panel
 * that knows which source column the values came from.
 */
export function ColumnNameHint({ columnName }: Props): React.ReactNode {
  if (!columnName) {
    return null;
  }
  return (
    <Text size="xs" c="dimmed">
      <Trans>
        From column: <Code>{columnName}</Code>
      </Trans>
    </Text>
  );
}
