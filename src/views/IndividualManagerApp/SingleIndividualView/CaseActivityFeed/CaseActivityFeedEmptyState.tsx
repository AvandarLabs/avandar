import { Trans } from "@lingui/react/macro";
import { Stack, Text, ThemeIcon, Title } from "@mantine/core";
import { IconMessages } from "@tabler/icons-react";
import classes from "@/views/IndividualManagerApp/SingleIndividualView/CaseActivityFeed/CaseActivityFeed.module.css";
import type { ReactNode } from "react";

/** What a case with no activity shows: what the feed is, and the next move. */
export function CaseActivityFeedEmptyState(): ReactNode {
  return (
    <Stack className={classes.empty} align="center" gap="xs">
      <ThemeIcon size={64} radius="xl" variant="light">
        <IconMessages size={28} />
      </ThemeIcon>
      <Title order={4} fw={650} className={classes.emptyTitle}>
        <Trans>No activity on this case yet</Trans>
      </Title>
      <Text c="dimmed" size="sm">
        <Trans>
          Post the first update below. Type @ to mention a teammate or link a
          dashboard, dataset, or case.
        </Trans>
      </Text>
    </Stack>
  );
}
