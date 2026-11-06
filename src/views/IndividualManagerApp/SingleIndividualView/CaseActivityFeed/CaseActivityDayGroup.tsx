import { Text } from "@mantine/core";
import { activityFeedItemRenderers } from "@/views/IndividualManagerApp/SingleIndividualView/CaseActivityFeed/activityFeedItemRenderers";
import classes from "@/views/IndividualManagerApp/SingleIndividualView/CaseActivityFeed/CaseActivityFeed.module.css";
import { useDateTimeFormatter } from "@/views/IndividualManagerApp/SingleIndividualView/CaseActivityFeed/useDateTimeFormatter";
import type { ActivityFeedEntry } from "@/clients/activity/ActivityEventClient";
import type { ActivityFeedItemProps } from "@/views/IndividualManagerApp/SingleIndividualView/CaseActivityFeed/activityFeedItemRenderers";
import type { ActivityDayGroup } from "@/views/IndividualManagerApp/SingleIndividualView/CaseActivityFeed/groupActivityByDay";
import type { ReactNode } from "react";

const DAY_FORMAT: Intl.DateTimeFormatOptions = {
  weekday: "long",
  month: "long",
  day: "numeric",
};

type Props = {
  group: ActivityDayGroup<ActivityFeedEntry>;
  itemProps: Omit<ActivityFeedItemProps, "entry">;
};

/** One day of a case's feed: the day separator, then that day's entries. */
export function CaseActivityDayGroup({ group, itemProps }: Props): ReactNode {
  const dayFormatter = useDateTimeFormatter(DAY_FORMAT);
  return (
    <div>
      <Text size="xs" c="dimmed" fw={500} className={classes.day}>
        {dayFormatter.format(group.date)}
      </Text>
      {group.entries.map((entry) => {
        const Renderer = activityFeedItemRenderers[entry.kind];
        return Renderer ? (
          <Renderer key={entry.id} entry={entry} {...itemProps} />
        ) : null;
      })}
    </div>
  );
}
