import { Plural, Trans } from "@lingui/react/macro";
import { Text } from "@mantine/core";
import { countFilterRules } from "$/models/queries/StructuredQuery/countFilterRules/countFilterRules";
import type { StructuredQuery } from "$/models/queries/StructuredQuery/StructuredQuery";
import type { ReactNode } from "react";

type Props = {
  filters: StructuredQuery.FilterGroup;
  /**
   * True for the copy that sits with the results, which is the one a screen
   * reader should announce when the count changes. Both the query panel and the
   * results chrome show this summary, and two live regions with identical text
   * announce the same change twice.
   */
  isStatusRegion?: boolean;
};

/**
 * States how many filters the results reflect, and how many are being ignored.
 *
 * Without this, a rule that is unfinished or invalid is simply absent from the
 * query while still visible in the panel, so the grid and the panel disagree
 * with no way to tell.
 */
export function AppliedFilterSummary({
  filters,
  isStatusRegion = false,
}: Props): ReactNode {
  const { applied, unfinished, invalid } = countFilterRules(filters);
  const ignored = unfinished + invalid;

  if (applied === 0 && ignored === 0) {
    return null;
  }

  return (
    <Text
      size="xs"
      c={ignored > 0 ? "orange.7" : "neutral.6"}
      role={isStatusRegion ? "status" : undefined}
      data-testid="applied-filter-summary"
    >
      <Plural
        value={applied}
        one="# filter applied"
        other="# filters applied"
      />
      {ignored > 0 ?
        <Trans>
          , <Plural value={ignored} one="# not applied" other="# not applied" />
        </Trans>
      : null}
    </Text>
  );
}
