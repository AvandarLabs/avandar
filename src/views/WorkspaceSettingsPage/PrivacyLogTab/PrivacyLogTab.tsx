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
import { notifySuccess } from "@ui";
import { useEffect, useMemo, useState } from "react";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import {
  clearConsentLog,
  consentLogToCsv,
  listConsentLog,
  type ConsentAuditEntry,
} from "@/lib/privacy/consentAuditLog";

type FilterValue = "all" | ConsentAuditEntry["decision"];

const DECISION_LABEL: Record<ConsentAuditEntry["decision"], string> = {
  approved: "Approved",
  used_suggestion: "Used suggestion",
  cancelled: "Cancelled",
  edited: "Edited",
};

const DECISION_COLOR: Record<ConsentAuditEntry["decision"], string> = {
  approved: "green",
  used_suggestion: "blue",
  cancelled: "gray",
  edited: "yellow",
};

const CONTEXT_LABEL: Record<ConsentAuditEntry["context"], string> = {
  user_message_text: "Chat message",
  clarification_answer: "Clarification answer",
  discovery_clarification: "Discovery clarification",
  plan_step_input: "Plan step input",
};

/**
 * "Privacy log" tab in workspace settings. Renders the last 90 days of
 * consent decisions for the current workspace from the local Dexie
 * audit log. Per the spec: own-workspace only, no admin / org views.
 */
export function PrivacyLogTab(): JSX.Element {
  const workspace = useCurrentWorkspace();
  const [entries, setEntries] = useState<ConsentAuditEntry[] | null>(null);
  const [filter, setFilter] = useState<FilterValue>("all");

  const load = async (): Promise<void> => {
    const rows = await listConsentLog({ workspaceId: workspace.id });
    setEntries(rows);
  };

  useEffect(() => {
    void load();
  }, [workspace.id]);

  const filtered = useMemo(() => {
    if (!entries) {
      return null;
    }
    if (filter === "all") {
      return entries;
    }
    return entries.filter((e) => {
      return e.decision === filter;
    });
  }, [entries, filter]);

  const downloadCsv = (): void => {
    if (!entries || entries.length === 0) {
      return;
    }
    const csv = consentLogToCsv(entries);
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
      title: "Clear privacy log",
      children: (
        <Text size="sm">
          Permanently delete all consent decisions on this device? This action
          cannot be undone, and the log on other devices is not affected.
        </Text>
      ),
      labels: { confirm: "Clear log", cancel: "Cancel" },
      confirmProps: { color: "red" },
      onConfirm: async () => {
        await clearConsentLog();
        await load();
        notifySuccess("Privacy log cleared.");
      },
    });
  };

  if (entries === null) {
    return (
      <Group justify="center" py="xl">
        <Loader />
      </Group>
    );
  }

  return (
    <Stack gap="md">
      <Stack gap={4}>
        <Title order={4}>Privacy log</Title>
        <Text size="sm" c="dimmed">
          A local record of every time you approved (or cancelled) sending
          data to an AI provider in this workspace. Last 90 days, stored on
          this device only.
        </Text>
      </Stack>

      <Group justify="space-between">
        <Select
          label="Decision"
          data={[
            { value: "all", label: "All decisions" },
            { value: "approved", label: "Approved" },
            { value: "used_suggestion", label: "Used suggestion" },
            { value: "cancelled", label: "Cancelled" },
            { value: "edited", label: "Edited" },
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
            Export CSV
          </Button>
          <Button
            variant="outline"
            color="red"
            leftSection={<IconTrash size={16} />}
            disabled={entries.length === 0}
            onClick={confirmClear}
            size="sm"
          >
            Clear log
          </Button>
        </Group>
      </Group>

      {filtered && filtered.length === 0 ?
        <Card withBorder>
          <Text size="sm" c="dimmed" ta="center">
            No entries yet. The log fills in as the chat panel asks for
            consent.
          </Text>
        </Card>
      : <Table striped withTableBorder>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>When</Table.Th>
              <Table.Th>Context</Table.Th>
              <Table.Th>Decision</Table.Th>
              <Table.Th>Detected</Table.Th>
              <Table.Th>Source column</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {(filtered ?? []).map((entry) => {
              return (
                <Table.Tr key={entry.id}>
                  <Table.Td>
                    <Text size="xs">
                      {new Date(entry.timestamp).toLocaleString()}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm">{CONTEXT_LABEL[entry.context]}</Text>
                  </Table.Td>
                  <Table.Td>
                    <Badge
                      color={DECISION_COLOR[entry.decision]}
                      size="sm"
                      variant="light"
                    >
                      {DECISION_LABEL[entry.decision]}
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
                      entry.detectedBias.length === 0 ?
                        <Text size="xs" c="dimmed">
                          (clean)
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
