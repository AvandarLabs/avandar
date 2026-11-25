import { Trans } from "@lingui/react/macro";
import { Text } from "@mantine/core";

type Props = Readonly<{
  /** Text from the host, such as an error message, that is not translated. */
  detail: string;
}>;

/**
 * A line of untranslated host text, such as an error message from the
 * database, kept apart from the translated sentence it explains. It is
 * marked as English, so a screen reader pronounces it correctly in any
 * language. Renders nothing for an empty detail.
 */
export function UntranslatedDetail({ detail }: Props): JSX.Element | null {
  if (detail === "") {
    return null;
  }
  return (
    <Text size="xs" c="dimmed">
      <Trans>Details:</Trans> <span lang="en">{detail}</span>
    </Text>
  );
}
