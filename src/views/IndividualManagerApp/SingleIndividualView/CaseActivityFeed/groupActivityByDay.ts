/** A run of feed entries that happened on the same local day. */
export type ActivityDayGroup<T> = {
  dayKey: string;
  date: Date;
  entries: T[];
};

/** Splits time-ordered entries into local-day groups for day separators. */
export function groupActivityByDay<T extends { occurredAt: string }>(
  entries: readonly T[],
): Array<ActivityDayGroup<T>> {
  const groups: Array<ActivityDayGroup<T>> = [];
  entries.forEach((entry) => {
    const date = new Date(entry.occurredAt);
    const dayKey = date.toDateString();
    const lastGroup = groups.at(-1);
    if (lastGroup?.dayKey === dayKey) {
      lastGroup.entries.push(entry);
    } else {
      groups.push({ dayKey, date, entries: [entry] });
    }
  });
  return groups;
}
