import { Trans, useLingui } from "@lingui/react/macro";
import {
  ActionIcon,
  Badge,
  Box,
  Group,
  ScrollArea,
  Stack,
  Text,
  Tooltip,
} from "@mantine/core";
import { IconGitBranch, IconHome, IconX } from "@tabler/icons-react";
import { useMemo } from "react";
import { PlanBranchStateManager } from "@/components/ChatPanel/PlanStateManager/PlanBranchStateManager/PlanBranchStateManager";
import { PlanStateManager } from "@/components/ChatPanel/PlanStateManager/PlanStateManager";

/**
 * Branching sidebar.
 *
 * Lists every branch that has been opened off the current plan tree.
 * Clicking a branch makes it the active plan; clicking "home"
 * returns to the root plan. Closing a branch deletes the in-memory
 * record only: IndexedDB cleanup is fired separately so a closed
 * branch's parquet blobs can be garbage collected.
 */
export function PlanBranchSidebar({
  onSelectRoot,
  onSelectBranch,
  onCloseBranch,
}: {
  onSelectRoot: () => void;
  onSelectBranch: (branchId: string) => void;
  onCloseBranch: (branchId: string) => void;
}): React.ReactNode {
  const branchState = PlanBranchStateManager.useState();
  const planState = PlanStateManager.useState();
  const { t } = useLingui();

  const branchList = useMemo(() => {
    return Object.values(branchState.branches).sort((a, b) => {
      return a.createdAt - b.createdAt;
    });
  }, [branchState.branches]);

  if (branchList.length === 0) {
    return null;
  }

  return (
    <Box
      style={{
        width: 180,
        flexShrink: 0,
        background: "var(--mantine-color-gray-0)",
        borderRight: "1px solid var(--mantine-color-gray-3)",
        padding: 8,
        overflowY: "auto",
      }}
      aria-label={t`Plan branches`}
    >
      <Stack gap={6}>
        <Text size="xs" fw={700} c="dimmed">
          <Trans>Branches</Trans>
        </Text>
        <BranchRow
          icon={<IconHome size={14} />}
          label={t`Root plan`}
          subtitle={
            planState.rootMessage ?
              planState.rootMessage.slice(0, 60)
            : undefined
          }
          isActive={branchState.activeBranchId === undefined}
          onClick={onSelectRoot}
        />
        <ScrollArea.Autosize mah={240}>
          <Stack gap={4}>
            {branchList.map((b) => {
              return (
                <BranchRow
                  key={b.planId}
                  icon={<IconGitBranch size={14} />}
                  label={b.title || t`(untitled branch)`}
                  subtitle={t`from step ${b.parentStepId}`}
                  isActive={branchState.activeBranchId === b.planId}
                  onClick={() => {
                    onSelectBranch(b.planId);
                  }}
                  onClose={() => {
                    onCloseBranch(b.planId);
                  }}
                />
              );
            })}
          </Stack>
        </ScrollArea.Autosize>
      </Stack>
    </Box>
  );
}

function BranchRow({
  icon,
  label,
  subtitle,
  isActive,
  onClick,
  onClose,
}: {
  icon: React.ReactNode;
  label: string;
  subtitle?: string;
  isActive: boolean;
  onClick: () => void;
  onClose?: () => void;
}): React.ReactNode {
  const { t } = useLingui();
  return (
    <Box
      onClick={onClick}
      style={{
        padding: 6,
        borderRadius: 6,
        background: isActive ? "var(--mantine-color-blue-1)" : "transparent",
        cursor: "pointer",
        border:
          isActive ?
            "1px solid var(--mantine-color-blue-4)"
          : "1px solid transparent",
      }}
      role="button"
      aria-pressed={isActive}
    >
      <Group gap={4} wrap="nowrap" justify="space-between">
        <Group gap={4} wrap="nowrap" style={{ minWidth: 0, flex: 1 }}>
          {icon}
          <Stack gap={0} style={{ minWidth: 0, flex: 1 }}>
            <Text size="xs" fw={600} lineClamp={1}>
              {label}
            </Text>
            {subtitle ?
              <Text size="9px" c="dimmed" lineClamp={1}>
                {subtitle}
              </Text>
            : null}
          </Stack>
          {isActive ?
            <Badge size="xs" variant="filled" color="blue">
              <Trans>active</Trans>
            </Badge>
          : null}
        </Group>
        {onClose ?
          <Tooltip label={t`Close branch`}>
            <ActionIcon
              size="xs"
              variant="subtle"
              color="red"
              onClick={(e) => {
                e.stopPropagation();
                onClose();
              }}
              aria-label={t`Close branch`}
            >
              <IconX size={11} />
            </ActionIcon>
          </Tooltip>
        : null}
      </Group>
    </Box>
  );
}
