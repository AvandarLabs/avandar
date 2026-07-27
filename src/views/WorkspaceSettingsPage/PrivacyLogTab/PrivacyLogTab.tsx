import { Trans, useLingui } from "@lingui/react/macro";
import {
  Badge,
  Button,
  Card,
  Group,
  Loader,
  Select,
  Stack,
  Table,
  Tabs,
  Text,
  Title,
} from "@mantine/core";
import { modals } from "@mantine/modals";
import { IconDownload, IconTrash } from "@tabler/icons-react";
import { notifySuccess } from "@ui";
import { useMemo, useState } from "react";
import { buildConsentAuditCsv } from "@/clients/privacy/buildConsentAuditCsv/buildConsentAuditCsv";
import { ClarificationAuditEntryClient } from "@/clients/privacy/ClarificationAuditEntryClient/ClarificationAuditEntryClient";
import { ConsentAuditEntryClient } from "@/clients/privacy/ConsentAuditEntryClient/ConsentAuditEntryClient";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import type { ClarificationAuditEntry } from "@/models/privacy/ClarificationAuditEntry/ClarificationAuditEntry";
import type { ConsentAuditEntry } from "@/models/privacy/ConsentAuditEntry/ConsentAuditEntry";

type FilterValue = "all" | ConsentAuditEntry.T["decision"];
type ClarificationOutcome = ClarificationAuditEntry.T["outcome"];

/** Returns localized labels for consent decisions. */
function useDecisionLabels(): Record<ConsentAuditEntry.T["decision"], string> {
  const { t } = useLingui();
  return {
    approved: t`Approved`,
    used_suggestion: t`Used suggestion`,
    cancelled: t`Cancelled`,
    edited: t`Edited`,
  };
}

const DECISION_COLOR: Record<ConsentAuditEntry.T["decision"], string> = {
  approved: "green",
  used_suggestion: "blue",
  cancelled: "gray",
  edited: "yellow",
};

/** Returns localized labels for consent contexts. */
function useContextLabels(): Record<ConsentAuditEntry.T["context"], string> {
  const { t } = useLingui();
  return {
    user_message_text: t`Chat message`,
    clarification_answer: t`Clarification answer`,
    discovery_clarification: t`Discovery clarification`,
    plan_step_input: t`Plan step input`,
    generated_sql_assumptions: t`Generated SQL assumptions`,
  };
}

/**
 * Renders the workspace settings privacy log.
 * Returns tabbed panels for consent decisions and clarification audits.
 */
export function PrivacyLogTab(): React.ReactNode {
  return (
    <Tabs defaultValue="consent">
      <Tabs.List>
        <Tabs.Tab value="consent">
          <Trans>Consent</Trans>
        </Tabs.Tab>
        <Tabs.Tab value="clarifications">
          <Trans>Clarifications</Trans>
        </Tabs.Tab>
      </Tabs.List>
      <Tabs.Panel value="consent" pt="md">
        <ConsentLogPanel />
      </Tabs.Panel>
      <Tabs.Panel value="clarifications" pt="md">
        <ClarificationLogPanel />
      </Tabs.Panel>
    </Tabs>
  );
}

function ConsentLogPanel(): React.ReactNode {
  const { t } = useLingui();
  const workspace = useCurrentWorkspace();
  const [entries = [], isLoading] = ConsentAuditEntryClient.useListConsentLog({
    workspaceId: workspace.id,
  });
  const [clearConsentLog] = ConsentAuditEntryClient.useClearConsentLog({
    queryToInvalidate: ConsentAuditEntryClient.QueryKeys.listConsentLog({
      workspaceId: workspace.id,
    }),
  });
  const [filter, setFilter] = useState<FilterValue>("all");
  const decisionLabels = useDecisionLabels();
  const contextLabels = useContextLabels();

  const filtered = useMemo(() => {
    if (filter === "all") {
      return entries;
    }
    return entries.filter((e) => {
      return e.decision === filter;
    });
  }, [entries, filter]);

  const downloadCsv = (): void => {
    if (entries.length === 0) {
      return;
    }
    const csv = buildConsentAuditCsv(entries);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `avandar-privacy-log-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const confirmClear = (): void => {
    modals.openConfirmModal({
      title: t`Clear privacy log`,
      children: (
        <Text size="sm">
          <Trans>
            Permanently delete all consent decisions on this device? This action
            cannot be undone, and the log on other devices is not affected.
          </Trans>
        </Text>
      ),
      labels: { confirm: t`Clear log`, cancel: t`Cancel` },
      confirmProps: { color: "red" },
      onConfirm: async () => {
        await clearConsentLog.async(undefined);
        notifySuccess(t`Privacy log cleared.`);
      },
    });
  };

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
          <Trans>Privacy log</Trans>
        </Title>
        <Text size="sm" c="dimmed">
          <Trans>
            A local record of every time you approved (or cancelled) sending
            data to an AI provider in this workspace. Last 90 days, stored on
            this device only.
          </Trans>
        </Text>
      </Stack>

      <Group justify="space-between">
        <Select
          label={t`Decision`}
          data={[
            { value: "all", label: t`All decisions` },
            { value: "approved", label: t`Approved` },
            { value: "used_suggestion", label: t`Used suggestion` },
            { value: "cancelled", label: t`Cancelled` },
            { value: "edited", label: t`Edited` },
          ]}
          value={filter}
          onChange={(v) => {
            return setFilter((v as FilterValue) ?? "all");
          }}
          w={260}
        />

        <Group gap="xs">
          <Button
            variant="outline"
            color="neutral"
            leftSection={<IconDownload size={16} />}
            disabled={entries.length === 0}
            onClick={downloadCsv}
            size="sm"
          >
            <Trans>Export CSV</Trans>
          </Button>
          <Button
            variant="outline"
            color="red"
            leftSection={<IconTrash size={16} />}
            disabled={entries.length === 0}
            onClick={confirmClear}
            size="sm"
          >
            <Trans>Clear log</Trans>
          </Button>
        </Group>
      </Group>

      {filtered.length === 0 ?
        <Card withBorder>
          <Text size="sm" c="dimmed" ta="center">
            <Trans>
              No entries yet. The log fills in as the chat panel asks for
              consent.
            </Trans>
          </Text>
        </Card>
      : <Table striped withTableBorder>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>
                <Trans>When</Trans>
              </Table.Th>
              <Table.Th>
                <Trans>Context</Trans>
              </Table.Th>
              <Table.Th>
                <Trans>Decision</Trans>
              </Table.Th>
              <Table.Th>
                <Trans>Detected</Trans>
              </Table.Th>
              <Table.Th>
                <Trans>Source column</Trans>
              </Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {filtered.map((entry) => {
              return (
                <Table.Tr key={entry.id}>
                  <Table.Td>
                    <Text size="xs">
                      {new Date(entry.timestamp).toLocaleString()}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm">{contextLabels[entry.context]}</Text>
                  </Table.Td>
                  <Table.Td>
                    <Badge
                      color={DECISION_COLOR[entry.decision]}
                      size="sm"
                      variant="light"
                    >
                      {decisionLabels[entry.decision]}
                    </Badge>
                  </Table.Td>
                  <Table.Td>
                    <Group gap={4} wrap="wrap">
                      {entry.detectedPii.map((label) => {
                        return (
                          <Badge
                            key={`pii-${label}`}
                            size="xs"
                            color="red"
                            variant="light"
                          >
                            {label}
                          </Badge>
                        );
                      })}
                      {entry.detectedBias.map((label) => {
                        return (
                          <Badge
                            key={`bias-${label}`}
                            size="xs"
                            color="blue"
                            variant="light"
                          >
                            {label}
                          </Badge>
                        );
                      })}
                      {(
                        entry.detectedPii.length === 0 &&
                        entry.detectedBias.length === 0
                      ) ?
                        <Text size="xs" c="dimmed">
                          <Trans>(clean)</Trans>
                        </Text>
                      : null}
                    </Group>
                  </Table.Td>
                  <Table.Td>
                    {entry.sourceColumn ?
                      <Text size="xs" ff="monospace">
                        {entry.sourceColumn}
                      </Text>
                    : <Text size="xs" c="dimmed">
                        —
                      </Text>
                    }
                  </Table.Td>
                </Table.Tr>
              );
            })}
          </Table.Tbody>
        </Table>
      }
    </Stack>
  );
}

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

function ClarificationLogPanel(): React.ReactNode {
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

      {entries.length === 0 ?
        <Card withBorder>
          <Text size="sm" c="dimmed" ta="center">
            <Trans>
              No clarifications yet. The log fills in as the chat asks
              clarifying questions.
            </Trans>
          </Text>
        </Card>
      : <Table striped withTableBorder>
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
                    {entry.timeToAnswerMs !== null ?
                      <Text size="xs">
                        <Trans>
                          {Math.round(entry.timeToAnswerMs / 100) / 10}s
                        </Trans>
                      </Text>
                    : <Text size="xs" c="dimmed">
                        —
                      </Text>
                    }
                  </Table.Td>
                </Table.Tr>
              );
            })}
          </Table.Tbody>
        </Table>
      }
    </Stack>
  );
}
