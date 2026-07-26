import { useLingui } from "@lingui/react/macro";
import { Badge, Box, Group, Stack, Text } from "@mantine/core";
import {
  IconAlertTriangle,
  IconCircleCheck,
  IconLoader2,
  IconPlayerPlay,
  IconPlayerSkipForward,
} from "@tabler/icons-react";
import { matchLiteral, prop } from "@utils";
import { Handle, Position } from "@xyflow/react";
import type {
  PlanNode,
  PlanStepStatus,
} from "@/components/ChatPanel/PlanStateManager/PlanStateManager";
import type { NodeProps } from "@xyflow/react";
import type { ReactNode } from "react";

const STATUS_COLOR: Record<PlanStepStatus, string> = {
  pending: "gray",
  running: "blue",
  succeeded: "green",
  failed: "red",
  skipped: "yellow",
};

/**
 * Returns the localized label shown on a plan step's status badge.
 */
function useStatusLabel(status: PlanStepStatus): string {
  const { t } = useLingui();
  return matchLiteral(status, {
    pending: t`Pending`,
    running: t`Running…`,
    succeeded: t`Ready`,
    failed: t`Failed`,
    skipped: t`Skipped`,
  });
}

// A Record keyed by PlanStepStatus is exhaustiveness-checked: adding a new
// status is a compile error here until an icon is provided. Declared at module
// scope so the elements are created once rather than on every render.
const STATUS_ICON: Record<PlanStepStatus, ReactNode> = {
  pending: <IconPlayerPlay size={16} color="var(--mantine-color-gray-6)" />,
  running: (
    <IconLoader2
      size={16}
      color="var(--mantine-color-blue-6)"
      style={{ animation: "spin 1s linear infinite" }}
    />
  ),
  succeeded: <IconCircleCheck size={16} color="var(--mantine-color-green-6)" />,
  failed: <IconAlertTriangle size={16} color="var(--mantine-color-red-6)" />,
  skipped: (
    <IconPlayerSkipForward size={16} color="var(--mantine-color-yellow-7)" />
  ),
};

function StatusIcon({ status }: { status: PlanStepStatus }): ReactNode {
  return STATUS_ICON[status];
}

/**
 * Data attached to each xyflow node so the renderer can inspect status,
 * schema, and preview rows without round-tripping through PlanStateManager.
 */
export type PlanStepNodeData = {
  step: PlanNode;
  index: number;
  isFocused: boolean;
};

/**
 * Custom xyflow node that renders a single plan step as a card on the
 * canvas. Shows status, description, row-count, and (if available) a
 * mini schema preview so the user can read the DAG at a glance without
 * zooming into any step.
 *
 * Drag handle is the whole card; xyflow handles pan/zoom for us. The
 * `nodrag` class is applied to inner controls so they remain
 * clickable.
 */
export function PlanStepNode(props: NodeProps): React.ReactNode {
  const data = props.data as PlanStepNodeData;
  const { step, index, isFocused } = data;
  const { t } = useLingui();
  const statusLabel = useStatusLabel(step.status);
  const colCountSuffix =
    step.actualSchema && step.actualSchema.length > 0 ?
      t` · ${step.actualSchema.length} cols`
    : "";
  return (
    <Box
      style={{
        background: "white",
        border: `${isFocused ? 2 : 1.5}px solid ${
          isFocused ?
            "var(--mantine-color-blue-6)"
          : "var(--mantine-color-gray-5)"
        }`,
        borderRadius: 14,
        boxShadow:
          isFocused ?
            "0 8px 24px rgba(28, 126, 214, 0.18)"
          : "0 2px 6px rgba(0,0,0,0.06)",
        width: 280,
        padding: 12,
        cursor: "pointer",
        fontFamily: 'Caveat, "Patrick Hand", "Comic Sans MS", system-ui',
      }}
    >
      <Handle
        type="target"
        position={Position.Left}
        style={{ background: "var(--mantine-color-gray-5)" }}
      />
      <Stack gap={6}>
        <Group justify="space-between" wrap="nowrap" gap="xs">
          <Group gap={6} wrap="nowrap">
            <Text size="xs" c="dimmed" ff="monospace">
              #{index + 1}
            </Text>
            <StatusIcon status={step.status} />
          </Group>
          <Badge size="xs" variant="light" color={STATUS_COLOR[step.status]}>
            {statusLabel}
          </Badge>
        </Group>

        <Text size="sm" fw={500} lineClamp={3} lh={1.25}>
          {step.description}
        </Text>

        {step.status === "succeeded" ?
          <Stack gap={2}>
            <Text size="xs" c="dimmed" ff="monospace">
              {t`${step.rowCount ?? 0} rows${colCountSuffix}`}
            </Text>
            {step.actualSchema && step.actualSchema.length > 0 ?
              <Text size="xs" c="dimmed" lineClamp={2} ff="monospace">
                {step.actualSchema.slice(0, 4).map(prop("name")).join(", ")}
                {step.actualSchema.length > 4 ? ", …" : ""}
              </Text>
            : null}
          </Stack>
        : null}

        {step.status === "failed" && step.error ?
          <Text size="xs" c="red" lineClamp={2} ff="monospace">
            {step.error}
          </Text>
        : null}
      </Stack>
      <Handle
        type="source"
        position={Position.Right}
        style={{ background: "var(--mantine-color-gray-5)" }}
      />
    </Box>
  );
}
