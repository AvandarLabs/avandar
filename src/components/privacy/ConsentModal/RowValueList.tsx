import { Trans } from "@lingui/react/macro";
import { Code, Stack, Text } from "@mantine/core";

type Props = {
  /** The row values to preview. Rendered verbatim as stringified code. */
  values: readonly unknown[];
};

/**
 * Renders the "Preview:" list of the raw values that will leave the browser.
 * Values can legitimately repeat, so the list key is stable-by-content
 * (`value` first) with the index only as a tiebreaker.
 */
export function RowValueList({ values }: Props): React.ReactNode {
  if (values.length === 0) {
    return null;
  }
  return (
    <Stack gap={4}>
      <Text size="xs" c="dimmed">
        <Trans>Preview:</Trans>
      </Text>
      <Stack gap={2} pl="sm">
        {values.map((value, i) => {
          return (
            <Code key={`${String(value)}-${i}`} block>
              {String(value)}
            </Code>
          );
        })}
      </Stack>
    </Stack>
  );
}
