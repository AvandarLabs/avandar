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
  Text,
  Title,
} from "@mantine/core";
import { modals } from "@mantine/modals";
import { IconDownload, IconTrash } from "@tabler/icons-react";
import { useMemo, useState } from "react";
import { buildConsentAuditCsv } from "@/clients/privacy/buildConsentAuditCsv/buildConsentAuditCsv";
import { ConsentAuditEntryClient } from "@/clients/privacy/ConsentAuditEntryClient/ConsentAuditEntryClient";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import { notifySuccess } from "@/utils/notifications/notify";
import type { ConsentAuditEntry } from "@/models/privacy/ConsentAuditEntry/ConsentAuditEntry";

type FilterValue = "all" | ConsentAuditEntry.T["decision"];

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
    generated_sql_assumptions: t`Generated SQL assumptions`,
  };
}

/** Renders consent decisions recorded on the current device. */
export function ConsentLogPanel(): React.ReactNode {
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
    return entries.filter((entry) => {
      return entry.decision === filter;
    });
  }, [entries, filter]);

  const downloadCsv = (): void => {
    if (entries.length === 0) {
      return;
    }
    const csv = buildConsentAuditCsv(entries);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `avandar-privacy-log-${new Date().toISOString().slice(0, 10)}.csv`;
    anchor.click();
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
          onChange={(value) => {
            return setFilter((value as FilterValue) ?? "all");
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

      {filtered.length === 0 ? (
        <Card withBorder>
          <Text size="sm" c="dimmed" ta="center">
            <Trans>
              No entries yet. The log fills in as the chat panel asks for
              consent.
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
                      {entry.detectedPii.length === 0 &&
                      entry.detectedBias.length === 0 ? (
                        <Text size="xs" c="dimmed">
                          <Trans>(clean)</Trans>
                        </Text>
                      ) : null}
                    </Group>
                  </Table.Td>
                  <Table.Td>
                    {entry.sourceColumn ? (
                      <Text size="xs" ff="monospace">
                        {entry.sourceColumn}
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
