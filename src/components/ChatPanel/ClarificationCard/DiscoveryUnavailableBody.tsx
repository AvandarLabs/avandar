import { Trans } from "@lingui/react/macro";
import { Alert, Code, Stack, Text } from "@mantine/core";
import { IconAlertCircle } from "@tabler/icons-react";
import { DiscoveryCustomFallback } from "./DiscoveryCustomFallback";
import type { ClarificationSubmitAnswer } from "./ClarificationAnswerModule/ClarificationAnswer";

type Props = {
  column: string;
  error?: string;
  queryPreview: string;
  onSubmit: (answer: ClarificationSubmitAnswer) => void;
};

/** Renders a fallback when discovery errors or returns no values. */
export function DiscoveryUnavailableBody({
  column,
  error,
  queryPreview,
  onSubmit,
}: Readonly<Props>): React.ReactNode {
  return (
    <Stack gap="xs">
      {error ?
        <Alert
          icon={<IconAlertCircle size={14} />}
          color="red"
          variant="light"
          radius="sm"
          p="xs"
        >
          <Text size="xs">{error}</Text>
          <Code block fz="xs" mt={4}>
            {queryPreview}
          </Code>
        </Alert>
      : <Text size="xs" c="dimmed">
          <Trans>
            No values were returned from {column}. Describe what you need
            instead.
          </Trans>
        </Text>
      }
      <DiscoveryCustomFallback onSubmit={onSubmit} />
    </Stack>
  );
}
