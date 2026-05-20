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

/** Returns localized labels for consent decisions. */
function _useDecisionLabels(): Record<ConsentAuditEntry["decision"], string> {
  const { t } = useLingui();
  return {
    approved: t`Approved`,
    used_suggestion: t`Used suggestion`,
    cancelled: t`Cancelled`,
    edited: t`Edited`,
  };
}

const DECISION_COLOR: Record<ConsentAuditEntry["decision"], string> = {
  approved: "green",
  used_suggestion: "blue",
  cancelled: "gray",
  edited: "yellow",
};

/** Returns localized labels for consent contexts. */
function _useContextLabels(): Record<ConsentAuditEntry["context"], string> {
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

function ConsentLogPanel(): JSX.Element {
  const { t } = useLingui();
  const workspace = useCurrentWorkspace();
  const [entries, setEntries] = useState<ConsentAuditEntry[] | null>(null);
  const [filter, setFilter] = useState<FilterValue>("all");
  const decisionLabels = _useDecisionLabels();
  const contextLabels = _useContextLabels();

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
        await clearConsentLog();
        await load();
        notifySuccess(t`Privacy log cleared.`);
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

      {filtered && filtered.length === 0 ?
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
            {(filtered ?? []).map((entry) => {
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
function _useOutcomeLabels(): Record<ClarificationOutcome, string> {
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
function _useLegacyOutcomeLabels(): Record<string, string> {
  const { t } = useLingui();
  return {
    let_ai_decide: t`Let AI decide (legacy)`,
  };
}

const LEGACY_OUTCOME_COLOR: Record<string, string> = {
  let_ai_decide: "blue",
};

function ClarificationLogPanel(): JSX.Element {
  const workspace = useCurrentWorkspace();
  const outcomeLabels = _useOutcomeLabels();
  const legacyOutcomeLabels = _useLegacyOutcomeLabels();
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
        <Title order={4}>
          <Trans>Clarifications</Trans>
        </Title>
        <Text size="sm" c="dimmed">
          <Trans>
            A local record of every clarifying question the AI has asked in
            this workspace. Only metadata is stored — never the question text
            or your answer.
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
