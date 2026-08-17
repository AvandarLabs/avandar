import { msg } from "@lingui/core/macro";
import { useLingui } from "@lingui/react";
import { Trans } from "@lingui/react/macro";
import {
  ActionIcon,
  Button,
  Card,
  Group,
  Stack,
  Text,
  ThemeIcon,
  Title,
  UnstyledButton,
} from "@mantine/core";
import { IconCheck, IconChevronRight, IconX } from "@tabler/icons-react";
import { NUX_MILESTONE_KEYS } from "$/models/Nux/NuxProgress.constants";
import { areAllMilestonesComplete } from "@/components/Nux/NuxStateManager/nuxSelectors";
import { NuxStateManager } from "@/components/Nux/NuxStateManager/NuxStateManager";
import { FIRST_DASHBOARD_MILESTONES } from "@/components/Nux/tutorials/firstDashboard";
import type { NuxMilestoneKey } from "$/models/Nux/NuxProgress.types";
import type { ReactNode } from "react";

/**
 * A `msg` descriptor rather than a bare string: `i18n._("...")` on a literal
 * is invisible to the Lingui extractor, so the label would never reach the
 * catalogs and would ship untranslated.
 */
const DISMISS_LABEL = msg`Dismiss the tutorial`;

type Props = {
  /**
   * Routing lives with the caller, not here: the panel knows which milestone
   * was clicked, `NuxRoot` knows how to get there.
   */
  onOpenMilestone: (key: NuxMilestoneKey) => void;
};

/**
 * The persistent "Get started" checklist.
 *
 * Mounted once in the workspace layout so it survives every route change,
 * which matters because the four milestones span five routes and progress
 * ticks over while the user is somewhere else.
 *
 * It is also the tutorial's navigation. Clicking a row routes to that
 * milestone, which is why no tooltip has to be spent telling the user where
 * to click next.
 */
export function NuxChecklistPanel({
  onOpenMilestone,
}: Readonly<Props>): ReactNode {
  const { i18n } = useLingui();
  const [state, dispatch] = NuxStateManager.useContext();

  const isFinished = areAllMilestonesComplete(state.completedMilestones);
  if (
    !state.isHydrated ||
    state.status === "dismissed" ||
    state.status === "not_started" ||
    isFinished
  ) {
    return null;
  }

  const completedCount = state.completedMilestones.length;
  const total = NUX_MILESTONE_KEYS.length;

  if (!state.isPanelExpanded) {
    return (
      <Button
        pos="fixed"
        bottom={16}
        right={16}
        style={{ zIndex: 300 }}
        size="compact-sm"
        rightSection={<IconChevronRight size={14} />}
        onClick={() => {
          dispatch.setPanelExpanded(true);
        }}
      >
        <Trans>
          Get started {completedCount}/{total}
        </Trans>
      </Button>
    );
  }

  return (
    <Card
      withBorder
      shadow="md"
      padding="md"
      pos="fixed"
      bottom={16}
      right={16}
      w={320}
      style={{ zIndex: 300 }}
    >
      <Stack gap="sm">
        <Group justify="space-between" wrap="nowrap">
          <Title order={4} size="h6">
            <Trans>Get started</Trans>
          </Title>
          <Group gap={4} wrap="nowrap">
            <Text size="xs" c="dimmed">
              {completedCount} / {total}
            </Text>
            <ActionIcon
              variant="subtle"
              color="neutral"
              size="sm"
              aria-label={i18n._(DISMISS_LABEL)}
              onClick={() => {
                dispatch.dismiss();
              }}
            >
              <IconX size={14} />
            </ActionIcon>
          </Group>
        </Group>

        {FIRST_DASHBOARD_MILESTONES.map((milestone) => {
          const isDone = state.completedMilestones.includes(milestone.key);
          return (
            <UnstyledButton
              key={milestone.key}
              disabled={isDone}
              onClick={() => {
                onOpenMilestone(milestone.key);
              }}
            >
              <Group gap="sm" wrap="nowrap" align="flex-start">
                <ThemeIcon
                  size="sm"
                  radius="xl"
                  variant={isDone ? "filled" : "light"}
                  color={isDone ? "green" : "neutral"}
                >
                  {isDone ?
                    <IconCheck size={12} />
                  : null}
                </ThemeIcon>
                <Stack gap={0}>
                  <Text
                    size="sm"
                    fw={isDone ? 400 : 600}
                    td={isDone ? "line-through" : undefined}
                  >
                    {i18n._(milestone.title)}
                  </Text>
                  {isDone ? null : (
                    <Text size="xs" c="dimmed">
                      {i18n._(milestone.summary)}
                    </Text>
                  )}
                </Stack>
              </Group>
            </UnstyledButton>
          );
        })}

        {state.blockedReason ?
          <Stack gap={4}>
            <Text size="xs" c="dimmed">
              {state.blockedReason}
            </Text>
            <Button
              variant="subtle"
              size="compact-xs"
              onClick={() => {
                dispatch.skipActiveMilestone();
              }}
            >
              <Trans>Skip this step</Trans>
            </Button>
          </Stack>
        : null}
      </Stack>
    </Card>
  );
}
