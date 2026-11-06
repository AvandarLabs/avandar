import { Callout } from "@avandar/ui";
import { Trans, useLingui } from "@lingui/react/macro";
import { Button, Center, Loader } from "@mantine/core";
import { useMemo, useRef } from "react";
import { CaseActivityDayGroup } from "@/views/IndividualManagerApp/SingleIndividualView/CaseActivityFeed/CaseActivityDayGroup";
import classes from "@/views/IndividualManagerApp/SingleIndividualView/CaseActivityFeed/CaseActivityFeed.module.css";
import { CaseActivityFeedEmptyState } from "@/views/IndividualManagerApp/SingleIndividualView/CaseActivityFeed/CaseActivityFeedEmptyState";
import { EarlierActivityControl } from "@/views/IndividualManagerApp/SingleIndividualView/CaseActivityFeed/EarlierActivityControl";
import { groupActivityByDay } from "@/views/IndividualManagerApp/SingleIndividualView/CaseActivityFeed/groupActivityByDay";
import { useKeepScrollOnPrepend } from "@/views/IndividualManagerApp/SingleIndividualView/CaseActivityFeed/useKeepScrollOnPrepend";
import type { ActivityFeedItemProps } from "@/views/IndividualManagerApp/SingleIndividualView/CaseActivityFeed/activityFeedItemRenderers";
import type { CaseActivityFeedState } from "@/views/IndividualManagerApp/SingleIndividualView/CaseActivityFeed/useCaseActivityFeed";
import type { ReactNode } from "react";

type Props = {
  /** Identifies the case, so state kept for one case never leaks to another. */
  caseKey: string;
  feed: CaseActivityFeedState;
  itemProps: Omit<ActivityFeedItemProps, "entry">;
};

/**
 * The body of a case's feed: a loader, the load failure, the empty state,
 * or the entries by day with the control that loads older ones. Loading
 * older entries keeps the reader's place.
 */
export function CaseActivityFeedContent({
  caseKey,
  feed,
  itemProps,
}: Props): ReactNode {
  const { t } = useLingui();
  const feedRef = useRef<HTMLDivElement>(null);
  const rememberScrollPosition = useKeepScrollOnPrepend(feedRef, {
    pageCount: feed.pageCount,
    hasError: feed.hasEarlierError,
    resetKey: caseKey,
  });
  const dayGroups = useMemo(() => {
    return groupActivityByDay(feed.entries);
  }, [feed.entries]);

  if (feed.isLoading) {
    return (
      <Center py="xl">
        <Loader size="sm" />
      </Center>
    );
  }
  if (feed.isLoadError) {
    return (
      <Callout
        title={t`The activity for this case failed to load`}
        message={t`Try again in a moment, or reach out to support if it keeps happening.`}
      >
        <Button
          variant="default"
          size="compact-sm"
          className={classes.retry}
          loading={feed.isRetrying}
          onClick={feed.retry}
        >
          <Trans>Try again</Trans>
        </Button>
      </Callout>
    );
  }
  if (feed.entries.length === 0) {
    return <CaseActivityFeedEmptyState />;
  }
  return (
    <div
      ref={feedRef}
      className={classes.feed}
      role="feed"
      aria-label={t`Activity`}
      aria-busy={feed.isLoadingEarlier}
    >
      {feed.hasEarlier ? (
        <EarlierActivityControl
          hasError={feed.hasEarlierError}
          isLoading={feed.isLoadingEarlier}
          onLoadEarlier={() => {
            rememberScrollPosition();
            feed.loadEarlier();
          }}
        />
      ) : null}
      {dayGroups.map((group) => {
        return (
          <CaseActivityDayGroup
            key={group.dayKey}
            group={group}
            itemProps={itemProps}
          />
        );
      })}
    </div>
  );
}
