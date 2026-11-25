import { plural } from "@lingui/core/macro";
import { useLingui } from "@lingui/react/macro";
import { Stack, Text } from "@mantine/core";
import type { ApplyCounts } from "@/views/DataManagerApp/ApplyDictionariesView/useApplyFacts";
import type { ReactNode } from "react";

type Props = {
  counts: ApplyCounts;
  /** Bound columns this apply leaves without a dictionary. */
  removedCount: number;
};

/** What attaching does, in a sentence or three: nothing in the data changes. */
export function AttachSummaryText({
  counts,
  removedCount,
}: Readonly<Props>): ReactNode {
  const { t } = useLingui();
  const attached =
    counts.attachedCount > 0
      ? plural(counts.attachedCount, {
          one: "Nothing in your data changes. # column keeps its values, with the dictionaries attached as reference. Edits to the dictionaries show up here right away.",
          other:
            "Nothing in your data changes. # columns keep their values, with the dictionaries attached as reference. Edits to the dictionaries show up here right away.",
        })
      : t`Nothing in your data changes. Edits to the dictionaries show up here right away.`;
  const described = plural(counts.describedCount, {
    one: "# column gets a description from a dictionary.",
    other: "# columns get descriptions from dictionaries.",
  });
  const removed = plural(removedCount, {
    one: "# column no longer uses a dictionary.",
    other: "# columns no longer use a dictionary.",
  });
  return (
    <Stack gap="xs" maw="72ch">
      <Text size="sm">{attached}</Text>
      {counts.describedCount > 0 ? <Text size="sm">{described}</Text> : null}
      {removedCount > 0 ? <Text size="sm">{removed}</Text> : null}
    </Stack>
  );
}
