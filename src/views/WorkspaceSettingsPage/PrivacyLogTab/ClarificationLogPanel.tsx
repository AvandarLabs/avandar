import { Trans, useLingui } from "@lingui/react/macro";
import {
  Badge,
  Card,
  Group,
  Loader,
  Stack,
  Table,
  Text,
  Title,
} from "@mantine/core";
import { ClarificationAuditEntryClient } from "@/clients/privacy/ClarificationAuditEntryClient/ClarificationAuditEntryClient";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import type { ClarificationAuditEntry } from "@/models/privacy/ClarificationAuditEntry/ClarificationAuditEntry";

type ClarificationOutcome = ClarificationAuditEntry.T["outcome"];

/** Returns localized labels for clarification outcomes. */
function useOutcomeLabels(): Record<ClarificationOutcome, string> {
  const { t } = useLingui();
  return {
    answered: t`Answered`,
    cancelled: t`Cancelled`,
    cap_reached: t`Cap reached`,
    neutral_failure: t`Neutral failure`,
  };
}

const OUTCOME_COLOR: Record<ClarificationOutcome, string> = {
  answered: "green",
  cancelled: "gray",
  cap_reached: "yellow",
  neutral_failure: "red",
};

/** Legacy rows written before "Let AI decide" was removed. */
function useLegacyOutcomeLabels(): Record<string, string> {
  const { t } = useLingui();
  return {
    let_ai_decide: t`Let AI decide (legacy)`,
  };
}

const LEGACY_OUTCOME_COLOR: Record<string, string> = {
  let_ai_decide: "blue",
};

/** Renders clarification metadata recorded on the current device. */
export function ClarificationLogPanel(): React.ReactNode {
  const workspace = useCurrentWorkspace();
  const outcomeLabels = useOutcomeLabels();
  const legacyOutcomeLabels = useLegacyOutcomeLabels();
  const [entries = [], isLoading] =
    ClarificationAuditEntryClient.useListClarificationLog({
      arg: workspace.id,
    });

  if (isLoading) {
    return (
      <Group justify="center" py="xl">
        <Loader />
      </Group>
    );
  }

  return (
    <Stack gap="md">
      <Stack gap={4}>
        <Title order={4}>
          <Trans>Clarifications</Trans>
        </Title>
        <Text size="sm" c="dimmed">
          <Trans>
            A local record of every clarifying question the AI has asked in this
            workspace. Only metadata is stored — never the question text or your
            answer.
          </Trans>
        </Text>
      </Stack>

      {entries.length === 0 ? (
        <Card withBorder>
          <Text size="sm" c="dimmed" ta="center">
            <Trans>
              No clarifications yet. The log fills in as the chat asks
              clarifying questions.
            </Trans>
          </Text>
        </Card>
      ) : (
        <Table striped withTableBorder>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>
                <Trans>When</Trans>
              </Table.Th>
              <Table.Th>
                <Trans>Turn</Trans>
              </Table.Th>
              <Table.Th>
                <Trans>Shape</Trans>
              </Table.Th>
              <Table.Th>
                <Trans>Outcome</Trans>
              </Table.Th>
              <Table.Th>
                <Trans>Time to answer</Trans>
              </Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {entries.map((entry) => {
              return (
                <Table.Tr key={entry.id}>
                  <Table.Td>
                    <Text size="xs">
                      {new Date(entry.timestamp).toLocaleString()}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm">
                      <Trans>{entry.turnNumber} / 3</Trans>
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Text size="xs" ff="monospace">
                      {entry.responseShape}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Badge
                      color={
                        OUTCOME_COLOR[entry.outcome as ClarificationOutcome] ??
                        LEGACY_OUTCOME_COLOR[entry.outcome] ??
                        "gray"
                      }
                      size="sm"
                      variant="light"
                    >
                      {outcomeLabels[entry.outcome as ClarificationOutcome] ??
                        legacyOutcomeLabels[entry.outcome] ??
                        entry.outcome}
                    </Badge>
                  </Table.Td>
                  <Table.Td>
                    {entry.timeToAnswerMs !== null ? (
                      <Text size="xs">
                        <Trans>
                          {Math.round(entry.timeToAnswerMs / 100) / 10}s
                        </Trans>
                      </Text>
                    ) : (
                      <Text size="xs" c="dimmed">
                        —
                      </Text>
                    )}
                  </Table.Td>
                </Table.Tr>
              );
            })}
          </Table.Tbody>
        </Table>
      )}
    </Stack>
  );
}
