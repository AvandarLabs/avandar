import { msg } from "@lingui/core/macro";
import { Trans, useLingui } from "@lingui/react/macro";
import { ActionIcon, Group, Text, Title } from "@mantine/core";
import { modals } from "@mantine/modals";
import { IconX } from "@tabler/icons-react";
import { dismissNuxChecklistPanel } from "@/components/Nux/NuxChecklistPanel/dismissNuxChecklistPanel/dismissNuxChecklistPanel";
import { NuxStateManager } from "@/components/Nux/NuxStateManager/NuxStateManager";
import { MODAL_ABOVE_NUX_TOUR_Z_INDEX } from "@/config/Theme";
import type { ReactNode } from "react";

type Props = {
  completedCount: number;
  totalMilestoneCount: number;
};

/**
 * Title, progress count, and hide-tutorial control for the Get started card.
 */
export function NuxChecklistExpandedHeader({
  completedCount,
  totalMilestoneCount,
}: Readonly<Props>): ReactNode {
  const { i18n, t } = useLingui();
  const [state, dispatch] = NuxStateManager.useContext();
  return (
    <Group justify="space-between" wrap="nowrap">
      <Title order={4} size="h6">
        <Trans>Get started</Trans>
      </Title>
      <Group gap={4} wrap="nowrap">
        <Text size="xs" c="dimmed" data-testid="nux-checklist-progress">
          {completedCount} / {totalMilestoneCount}
        </Text>
        <ActionIcon
          variant="subtle"
          color="neutral"
          size="sm"
          aria-label={i18n._(msg`Hide the tutorial`)}
          onClick={() => {
            dismissNuxChecklistPanel({
              completedMilestones: state.completedMilestones,
              dismiss: dispatch.dismiss,
              confirm: (onConfirm) => {
                modals.openConfirmModal({
                  title: t`Hide the tutorial?`,
                  children: t`You can restart it anytime from Profile.`,
                  labels: {
                    confirm: t`Hide tutorial`,
                    cancel: t`Cancel`,
                  },
                  zIndex: MODAL_ABOVE_NUX_TOUR_Z_INDEX,
                  onConfirm,
                });
              },
            });
          }}
        >
          <IconX size={14} />
        </ActionIcon>
      </Group>
    </Group>
  );
}
