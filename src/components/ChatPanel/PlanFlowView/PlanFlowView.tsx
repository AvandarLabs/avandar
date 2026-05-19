import {
  Alert,
  Badge,
  Button,
  Card,
  Code,
  Collapse,
  Group,
  ScrollArea,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import {
  IconAlertTriangle,
  IconChevronDown,
  IconChevronRight,
  IconCircleCheck,
  IconLoader2,
  IconPlayerPlay,
  IconPlayerSkipForward,
  IconRefresh,
} from "@tabler/icons-react";
import { useCallback, useEffect, useRef } from "react";
import {
  dropPlanTempViews,
  executePlan,
  executePlanStep,
} from "@/components/ChatPanel/PlanStateManager/planExecutor";
import { PlanStateManager } from "@/components/ChatPanel/PlanStateManager/PlanStateManager";
import { DataExplorerStateManager } from "@/views/DataExplorerApp/DataExplorerStateManager/DataExplorerStateManager";
import type {
  PlanNode,
  PlanStepStatus,
} from "@/components/ChatPanel/PlanStateManager/PlanStateManager";

const STATUS_COLOR: Record<PlanStepStatus, string> = {
  pending: "gray",
  running: "blue",
  succeeded: "green",
  failed: "red",
  skipped: "yellow",
};

const STATUS_LABEL: Record<PlanStepStatus, string> = {
  pending: "Pending",
  running: "Running…",
  succeeded: "Succeeded",
  failed: "Failed",
  skipped: "Skipped",
};

function StatusIcon({ status }: { status: PlanStepStatus }): JSX.Element {
  switch (status) {
    case "succeeded":
      return <IconCircleCheck size={16} color="var(--mantine-color-green-6)" />;
    case "failed":
      return <IconAlertTriangle size={16} color="var(--mantine-color-red-6)" />;
    case "running":
      return (
        <IconLoader2
          size={16}
          color="var(--mantine-color-blue-6)"
          style={{ animation: "spin 1s linear infinite" }}
        />
      );
    case "skipped":
      return (
        <IconPlayerSkipForward
          size={16}
          color="var(--mantine-color-yellow-7)"
        />
      );
    default:
      return <IconPlayerPlay size={16} color="var(--mantine-color-gray-6)" />;
  }
}

/**
 * Phase 3 v1 — list-based DAG view.
 *
 * Each plan step renders as a card with status, code preview, and (on
 * success) schema + row count. Clicking "Open on canvas" pushes the
 * step's SQL into the Data Explorer canvas so the user can inspect the
 * result with the existing visualisation tooling.
 *
 * The visual DAG (xyflow) is deferred — this implementation gets us a
 * usable plan surface with the same state model so we can swap in
 * `@xyflow/react` later without changing the data shape.
 */
export function PlanFlowView(): JSX.Element | null {
  const state = PlanStateManager.useState();
  const dispatch = PlanStateManager.useDispatch();
  const dataExplorerDispatch = DataExplorerStateManager.useDispatch();
  const runOnceRef = useRef<string | null>(null);

  const runAll = useCallback(async (): Promise<void> => {
    await executePlan({ nodes: state.nodes, dispatch });
  }, [state.nodes, dispatch]);

  // Auto-run on first load when runMode === 'auto'. We key off the
  // first node's id so a brand-new plan triggers exactly one run.
  useEffect(() => {
    if (state.nodes.length === 0 || !state.isVisible) {
      return;
    }
    if (state.runMode !== "auto") {
      return;
    }
    const allPending = state.nodes.every((n) => {
      return n.status === "pending";
    });
    const firstId = state.nodes[0]!.id;
    if (allPending && runOnceRef.current !== firstId) {
      runOnceRef.current = firstId;
      void runAll();
    }
  }, [state.nodes, state.isVisible, state.runMode, runAll]);

  if (!state.isVisible || state.nodes.length === 0) {
    return null;
  }

  const runSingle = async (node: PlanNode): Promise<void> => {
    await executePlanStep({ step: node, dispatch });
  };

  const openOnCanvas = (node: PlanNode): void => {
    if (node.status !== "succeeded" || !node.viewName) {
      return;
    }
    dataExplorerDispatch.setRawSql(`SELECT * FROM "${node.viewName}"`);
    dataExplorerDispatch.setNlPrompt(node.description);
    dispatch.setFocusedStep(node.id);
  };

  const close = async (): Promise<void> => {
    await dropPlanTempViews({ nodes: state.nodes });
    dispatch.clear();
    runOnceRef.current = null;
  };

  const allSucceeded = state.nodes.every((n) => {
    return n.status === "succeeded";
  });
  const anyFailed = state.nodes.some((n) => {
    return n.status === "failed";
  });

  return (
    <Card withBorder shadow="sm" p="md" radius="md">
      <Stack gap="sm">
        <Group justify="space-between" wrap="nowrap">
          <Stack gap={2}>
            <Title order={5}>Analytic plan</Title>
            <Text size="xs" c="dimmed">
              {state.rootMessage}
            </Text>
          </Stack>
          <Group gap="xs">
            <Button
              size="xs"
              variant="light"
              leftSection={<IconRefresh size={14} />}
              onClick={() => {
                return runAll();
              }}
            >
              Re-run all
            </Button>
            <Button
              size="xs"
              variant="subtle"
              color="neutral"
              onClick={() => {
                return close();
              }}
            >
              Close plan
            </Button>
          </Group>
        </Group>

        {anyFailed ?
          <Alert color="red" variant="light" radius="sm" p="xs">
            <Text size="xs">
              A step failed. Re-run after the model regenerates, or fix the SQL
              manually below.
            </Text>
          </Alert>
        : null}

        {allSucceeded ?
          <Alert color="green" variant="light" radius="sm" p="xs">
            <Text size="xs">
              All steps succeeded. Click any step to open it on the canvas.
            </Text>
          </Alert>
        : null}

        <ScrollArea.Autosize mah={400}>
          <Stack gap="xs">
            {state.nodes.map((node, idx) => {
              return (
                <PlanStepCard
                  key={node.id}
                  index={idx}
                  node={node}
                  isFocused={state.focusedStepId === node.id}
                  onRun={() => {
                    return runSingle(node);
                  }}
                  onOpen={() => {
                    return openOnCanvas(node);
                  }}
                />
              );
            })}
          </Stack>
        </ScrollArea.Autosize>
      </Stack>
    </Card>
  );
}

function PlanStepCard({
  index,
  node,
  isFocused,
  onRun,
  onOpen,
}: {
  index: number;
  node: PlanNode;
  isFocused: boolean;
  onRun: () => void | Promise<void>;
  onOpen: () => void;
}): JSX.Element {
  const [opened, { toggle }] = useDisclosure(isFocused);

  return (
    <Card
      withBorder
      radius="sm"
      p="xs"
      style={{
        borderColor: isFocused ? "var(--mantine-color-blue-4)" : undefined,
      }}
    >
      <Stack gap="xs">
        <Group justify="space-between" wrap="nowrap">
          <Group gap="xs" wrap="nowrap">
            <Text size="xs" c="dimmed">
              #{index + 1}
            </Text>
            <StatusIcon status={node.status} />
            <Text size="sm" fw={500} lineClamp={2}>
              {node.description}
            </Text>
          </Group>
          <Group gap={4}>
            <Badge size="xs" variant="light" color={STATUS_COLOR[node.status]}>
              {STATUS_LABEL[node.status]}
            </Badge>
            <Button
              size="xs"
              variant="subtle"
              color="neutral"
              px={4}
              onClick={toggle}
              leftSection={
                opened ?
                  <IconChevronDown size={12} />
                : <IconChevronRight size={12} />
              }
            >
              {opened ? "Hide" : "Show"} SQL
            </Button>
          </Group>
        </Group>

        <Collapse expanded={opened}>
          <Stack gap={4}>
            <Code block fz="xs">
              {node.code}
            </Code>
            {node.inputs.length > 0 ?
              <Text size="xs" c="dimmed">
                Depends on: {node.inputs.join(", ")}
              </Text>
            : null}
            {node.error ?
              <Alert color="red" variant="light" radius="sm" p="xs">
                <Text size="xs" ff="monospace">
                  {node.error}
                </Text>
              </Alert>
            : null}
            {node.status === "succeeded" ?
              <Group gap="xs">
                <Text size="xs" c="dimmed">
                  {node.rowCount ?? 0} rows
                </Text>
                {node.actualSchema && node.actualSchema.length > 0 ?
                  <Text size="xs" c="dimmed">
                    Columns:{" "}
                    {node.actualSchema
                      .map((c) => {
                        return c.name;
                      })
                      .join(", ")}
                  </Text>
                : null}
              </Group>
            : null}
            <Group gap="xs">
              {node.status === "failed" || node.status === "pending" ?
                <Button
                  size="xs"
                  variant="light"
                  onClick={() => {
                    return onRun();
                  }}
                >
                  Run step
                </Button>
              : null}
              {node.status === "succeeded" ?
                <Button size="xs" variant="light" onClick={onOpen}>
                  Open on canvas
                </Button>
              : null}
            </Group>
          </Stack>
        </Collapse>
      </Stack>
    </Card>
  );
}
