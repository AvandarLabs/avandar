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
import { useCallback, useEffect, useMemo, useState } from "react";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import { listClarificationLog } from "@/lib/privacy/clarificationAuditLog";
import {
  clearConsentLog,
  consentLogToCsv,
  listConsentLog,
} from "@/lib/privacy/consentAuditLog";
import type {
  ClarificationAuditEntry,
  ClarificationOutcome,
} from "@/lib/privacy/clarificationAuditLog";
import type { ConsentAuditEntry } from "@/lib/privacy/consentAuditLog";

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
 * "Privacy log" tab in workspace settings. Renders two sub-tabs:
 *
 *   - Consent: last 90 days of consent decisions from `consentAuditLog`.
 *   - Clarifications: clarification turn metadata from
 *     `clarificationAuditLog`.
 *
 * Both sources are local-only and stored on this device.
 */
export function PrivacyLogTab(): JSX.Element {
  return (
    <Tabs defaultValue="consent">
      <Tabs.List>
        <Tabs.Tab value="consent">Consent</Tabs.Tab>
        <Tabs.Tab value="clarifications">Clarifications</Tabs.Tab>
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

function ConsentLogPanel(): JSX.Element {
  const workspace = useCurrentWorkspace();
  const [entries, setEntries] = useState<ConsentAuditEntry[] | null>(null);
  const [filter, setFilter] = useState<FilterValue>("all");

  const load = useCallback(async (): Promise<void> => {
    const rows = await listConsentLog({ workspaceId: workspace.id });
    setEntries(rows);
  }, [workspace.id]);

  useEffect(() => {
    void load();
  }, [load]);

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
          A local record of every time you approved (or cancelled) sending data
          to an AI provider in this workspace. Last 90 days, stored on this
          device only.
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
            No entries yet. The log fills in as the chat panel asks for consent.
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
                      {(
                        entry.detectedPii.length === 0 &&
                        entry.detectedBias.length === 0
                      ) ?
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

const OUTCOME_LABEL: Record<ClarificationOutcome, string> = {
  answered: "Answered",
  cancelled: "Cancelled",
  cap_reached: "Cap reached",
  neutral_failure: "Neutral failure",
};

const OUTCOME_COLOR: Record<ClarificationOutcome, string> = {
  answered: "green",
  cancelled: "gray",
  cap_reached: "yellow",
  neutral_failure: "red",
};

/** Legacy rows written before "Let AI decide" was removed. */
const LEGACY_OUTCOME_LABEL: Record<string, string> = {
  let_ai_decide: "Let AI decide (legacy)",
};

const LEGACY_OUTCOME_COLOR: Record<string, string> = {
  let_ai_decide: "blue",
};

function ClarificationLogPanel(): JSX.Element {
  const workspace = useCurrentWorkspace();
  const [entries, setEntries] = useState<ClarificationAuditEntry[] | null>(
    null,
  );

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      const rows = await listClarificationLog(workspace.id);
      if (!cancelled) {
        setEntries(rows);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [workspace.id]);

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
        <Title order={4}>Clarifications</Title>
        <Text size="sm" c="dimmed">
          A local record of every clarifying question the AI has asked in this
          workspace. Only metadata is stored — never the question text or your
          answer.
        </Text>
      </Stack>

      {entries.length === 0 ?
        <Card withBorder>
          <Text size="sm" c="dimmed" ta="center">
            No clarifications yet. The log fills in as the chat asks clarifying
            questions.
          </Text>
        </Card>
      : <Table striped withTableBorder>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>When</Table.Th>
              <Table.Th>Turn</Table.Th>
              <Table.Th>Shape</Table.Th>
              <Table.Th>Outcome</Table.Th>
              <Table.Th>Time to answer</Table.Th>
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
                    <Text size="sm">{entry.turnNumber} / 3</Text>
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
                      {OUTCOME_LABEL[entry.outcome as ClarificationOutcome] ??
                        LEGACY_OUTCOME_LABEL[entry.outcome] ??
                        entry.outcome}
                    </Badge>
                  </Table.Td>
                  <Table.Td>
                    {entry.timeToAnswerMs !== null ?
                      <Text size="xs">
                        {Math.round(entry.timeToAnswerMs / 100) / 10}s
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
