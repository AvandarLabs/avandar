import { Trans, useLingui } from "@lingui/react/macro";
import { Button, Group, SegmentedControl, Stack, Text } from "@mantine/core";
import {
  IconArrowsMaximize,
  IconArrowsMinimize,
  IconRefresh,
  IconX,
} from "@tabler/icons-react";
import { PlanStateManager } from "@/components/ChatPanel/PlanStateManager/PlanStateManager";
import type {
  PlanApprovalStatus,
  PlanCanvasView,
  PlanRunMode,
} from "@/components/ChatPanel/PlanStateManager/PlanStateManager";

type Props = {
  rootMessage: string;
  runMode: PlanRunMode;
  canvasView: PlanCanvasView;
  approvalStatus: PlanApprovalStatus;
  dispatch: ReturnType<typeof PlanStateManager.useDispatch>;
  onReRun: () => void | Promise<void>;
  onClose: () => void | Promise<void>;
};

/**
 * Header row for the plan canvas: the plan title + root message on the
 * left, and the run-mode toggle, Re-run, Zoom in/out, and Close
 * controls on the right. Purely presentational; every control forwards
 * straight to the dispatch/callbacks supplied by `PlanFlowCanvas`.
 */
export function PlanFlowHeader({
  rootMessage,
  runMode,
  canvasView,
  approvalStatus,
  dispatch,
  onReRun,
  onClose,
}: Props): React.ReactNode {
  const { t } = useLingui();
  return (
    <Group justify="space-between" wrap="nowrap" align="flex-start">
      <Stack gap={2} style={{ flex: 1, minWidth: 0 }}>
        <Text fw={600} size="sm">
          <Trans>Analytic plan</Trans>
        </Text>
        <Text size="xs" c="dimmed" lineClamp={2}>
          {rootMessage}
        </Text>
      </Stack>
      <Group gap="xs" wrap="nowrap">
        <SegmentedControl
          size="xs"
          value={runMode}
          data={[
            { label: t`Auto`, value: "auto" },
            { label: t`Step`, value: "step" },
          ]}
          onChange={(v) => {
            dispatch.setRunMode(v === "step" ? "step" : "auto");
          }}
        />
        <Button
          size="xs"
          variant="light"
          leftSection={<IconRefresh size={14} />}
          disabled={approvalStatus !== "approved"}
          onClick={() => {
            return onReRun();
          }}
        >
          <Trans>Re-run</Trans>
        </Button>
        <Button
          size="xs"
          variant="subtle"
          color="neutral"
          leftSection={
            canvasView === "focused" ?
              <IconArrowsMaximize size={14} />
            : <IconArrowsMinimize size={14} />
          }
          onClick={() => {
            dispatch.setCanvasView(
              canvasView === "focused" ? "overview" : "focused",
            );
          }}
        >
          {canvasView === "focused" ?
            <Trans>Zoom out</Trans>
          : <Trans>Zoom in</Trans>}
        </Button>
        <Button
          size="xs"
          variant="subtle"
          color="red"
          leftSection={<IconX size={14} />}
          onClick={() => {
            return onClose();
          }}
        >
          <Trans>Close</Trans>
        </Button>
      </Group>
    </Group>
  );
}
