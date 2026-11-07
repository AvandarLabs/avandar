import { Trans } from "@lingui/react/macro";
import { Alert, Anchor, Code, Stack, Text } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconAlertCircle } from "@tabler/icons-react";
import { QueryErrorKind } from "@/lib/sql/QueryErrorKind/QueryErrorKind";
import { useQueryErrorExplanation } from "@/views/DataExplorerApp/useQueryErrorExplanation/useQueryErrorExplanation";
import { DiscoveryCustomFallback } from "./DiscoveryCustomFallback";
import { DiscoveryRecoveryActions } from "./DiscoveryRecoveryActions";
import type { ClarificationSubmitAnswer } from "../ClarificationAnswerModule/ClarificationAnswer";

type Props = {
  column: string;
  error?: string;
  queryPreview: string;
  onRetry?: () => void;
  onRequestDifferentDiscovery?: () => void;
  onSubmit: (answer: ClarificationSubmitAnswer) => void;
};

/**
 * Renders a fallback when discovery errors or returns no values. A failed
 * lookup is explained in plain language, with the technical message and the
 * lookup's SQL behind "Show details".
 */
export function DiscoveryUnavailableBody({
  column,
  error,
  queryPreview,
  onRetry,
  onRequestDifferentDiscovery,
  onSubmit,
}: Readonly<Props>): React.ReactNode {
  const [isDetailsOpen, { toggle: toggleDetails }] = useDisclosure(false);
  const explanation = useQueryErrorExplanation(error);
  return (
    <Stack gap="xs">
      {error ? (
        <Alert
          icon={<IconAlertCircle size={14} />}
          color="red"
          variant="light"
          radius="sm"
          p="xs"
        >
          <Text size="xs">{explanation}</Text>
          <Anchor
            component="button"
            type="button"
            size="xs"
            aria-expanded={isDetailsOpen}
            onClick={toggleDetails}
          >
            {isDetailsOpen ? (
              <Trans>Hide details</Trans>
            ) : (
              <Trans>Show details</Trans>
            )}
          </Anchor>
          {isDetailsOpen ? (
            <Stack gap={4} mt={4}>
              <Code block fz="xs">
                {QueryErrorKind.toTechnicalDetails(error)}
              </Code>
              <Code block fz="xs">
                {queryPreview}
              </Code>
            </Stack>
          ) : null}
        </Alert>
      ) : (
        <Text size="xs" c="dimmed">
          <Trans>
            No values were returned from {column}. Describe what you need
            instead.
          </Trans>
        </Text>
      )}
      {error && (onRetry || onRequestDifferentDiscovery) ? (
        <DiscoveryRecoveryActions
          onRetry={onRetry}
          onRequestDifferentDiscovery={onRequestDifferentDiscovery}
        />
      ) : null}
      <DiscoveryCustomFallback onSubmit={onSubmit} />
    </Stack>
  );
}
