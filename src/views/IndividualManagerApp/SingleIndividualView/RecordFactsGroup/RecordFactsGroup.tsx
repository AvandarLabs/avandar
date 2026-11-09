import { formatDate } from "@avandar/utils";
import { Trans, useLingui } from "@lingui/react/macro";
import { AppViewRail } from "@/components/layouts/AppView/AppViewRail/AppViewRail";
import type { Individual } from "$/models/ontology/Individual/Individual";
import type { ReactNode } from "react";

type Props = {
  individual: Individual.T;
};

function _formatDay(date: string): string {
  return formatDate(date, { format: "MMM D, YYYY" });
}

/**
 * The record's own facts, in the record page's details band: its ID in the
 * source data, and when it was created, last changed, and (only when it
 * happened) found missing from its source. A fact with no value is omitted.
 * The case type is not repeated here: the header's facts line already states
 * it.
 */
export function RecordFactsGroup({ individual }: Readonly<Props>): ReactNode {
  const { t } = useLingui();

  return (
    <AppViewRail.Group title={<Trans>Record</Trans>}>
      <AppViewRail.Fact label={t`Source ID`}>
        {individual.externalId}
      </AppViewRail.Fact>
      <AppViewRail.Fact label={t`Created`}>
        {_formatDay(individual.createdAt)}
      </AppViewRail.Fact>
      <AppViewRail.Fact label={t`Updated`}>
        {_formatDay(individual.updatedAt)}
      </AppViewRail.Fact>
      {individual.missingFromSourceAt ? (
        <AppViewRail.Fact label={t`Missing from source since`}>
          {_formatDay(individual.missingFromSourceAt)}
        </AppViewRail.Fact>
      ) : null}
    </AppViewRail.Group>
  );
}
