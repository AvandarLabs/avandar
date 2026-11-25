import { Callout } from "@avandar/ui";
import { Trans, useLingui } from "@lingui/react/macro";
import { Button, Skeleton, Stack, Text } from "@mantine/core";
import { IconInbox } from "@tabler/icons-react";
import css from "@/views/IndividualManagerApp/AssignedToMeView/AssignedToMeView.module.css";
import type { ReactNode } from "react";

/** Placeholder rows while the first page loads, named for assistive tech. */
export function AssignedToMeLoading(): ReactNode {
  const { t } = useLingui();

  return (
    <Stack gap="xs" aria-busy="true" aria-label={t`Loading records`}>
      <Skeleton height={28} radius="sm" />
      <Skeleton height={28} radius="sm" width="80%" />
      <Skeleton height={28} radius="sm" width="65%" />
    </Stack>
  );
}

/** The failure copy, with a button that asks for the first page again. */
export function AssignedToMeError({
  onRetry,
}: Readonly<{ onRetry: () => unknown }>): ReactNode {
  const { t } = useLingui();

  return (
    <Callout
      title={t`These records failed to load`}
      message={t`Try again in a moment, or reach out to support if it keeps happening.`}
    >
      <Button
        variant="default"
        size="compact-sm"
        w="fit-content"
        onClick={onRetry}
      >
        <Trans>Try again</Trans>
      </Button>
    </Callout>
  );
}

/** A quiet block, since the view already sits inside the slate. */
export function AssignedToMeEmpty(): ReactNode {
  return (
    <Stack gap="xs" align="center" py="xxl" ta="center">
      <IconInbox
        size={22}
        stroke={1.5}
        aria-hidden
        className={css.assignedToMeEmptyIcon}
      />
      <Text size="sm" c="dimmed">
        <Trans>Nothing is assigned to you.</Trans>
      </Text>
    </Stack>
  );
}
