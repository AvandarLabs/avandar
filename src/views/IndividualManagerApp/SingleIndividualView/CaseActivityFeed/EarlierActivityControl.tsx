import { Trans } from "@lingui/react/macro";
import { Button, Group, Text } from "@mantine/core";
import classes from "@/views/IndividualManagerApp/SingleIndividualView/CaseActivityFeed/CaseActivityFeed.module.css";
import type { ReactNode } from "react";

type Props = {
  hasError: boolean;
  isLoading: boolean;
  onLoadEarlier: () => void;
};

/**
 * The control at the top of a case's feed that loads older activity, or,
 * after that failed, says so and offers to try again.
 */
export function EarlierActivityControl({
  hasError,
  isLoading,
  onLoadEarlier,
}: Props): ReactNode {
  if (hasError && !isLoading) {
    return (
      <Group gap="xs" justify="center" className={classes.earlier} role="alert">
        <Text size="sm" c="dimmed">
          <Trans>Earlier activity failed to load.</Trans>
        </Text>
        <Button
          variant="subtle"
          color="neutral"
          size="compact-sm"
          onClick={onLoadEarlier}
        >
          <Trans>Try again</Trans>
        </Button>
      </Group>
    );
  }
  return (
    <Button
      variant="subtle"
      color="neutral"
      size="compact-sm"
      className={classes.earlier}
      loading={isLoading}
      onClick={onLoadEarlier}
    >
      <Trans>Show earlier activity</Trans>
    </Button>
  );
}
