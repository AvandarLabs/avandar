import { useLingui } from "@lingui/react/macro";
import { Text } from "@mantine/core";
import { countFilterRules } from "$/models/queries/StructuredQuery/countFilterRules";
import type { QueryFilterGroup } from "$/models/queries/StructuredQuery/QueryFilter.types";
import type { ReactNode } from "react";

type Props = {
  filters: QueryFilterGroup;
};

/**
 * States how many filters the results reflect, and how many are being ignored.
 *
 * Without this, a rule that is unfinished or invalid is simply absent from the
 * query while still visible in the panel, so the grid and the panel disagree
 * with no way to tell.
 */
export function AppliedFilterSummary({ filters }: Props): ReactNode {
  const { t } = useLingui();
  const { applied, unfinished, invalid } = countFilterRules(filters);
  const ignored = unfinished + invalid;

  if (applied === 0 && ignored === 0) {
    return null;
  }

  return (
    <Text
      size="xs"
      c={ignored > 0 ? "orange.7" : "neutral.6"}
      data-testid="applied-filter-summary"
    >
      {ignored > 0 ?
        t`${applied} filter(s) applied, ${ignored} not applied`
      : t`${applied} filter(s) applied`}
    </Text>
  );
}
