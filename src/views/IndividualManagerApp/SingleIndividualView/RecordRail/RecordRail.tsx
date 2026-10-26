import { formatDate } from "@avandar/utils";
import { Trans, useLingui } from "@lingui/react/macro";
import { AppViewRail } from "@/components/layouts/AppView/AppViewRail/AppViewRail";
import type { Concept } from "$/models/ontology/Concept/Concept";
import type { Individual } from "$/models/ontology/Individual/Individual";
import type { ReactNode } from "react";

type Props = {
  concept: Concept.T;
  individual: Individual.T;
};

function _formatDay(date: string): string {
  return formatDate(date, { format: "MMM D, YYYY" });
}

/**
 * Reference facts about a record: its case type, its ID in the source data,
 * and when it was created, last changed, and (only when it happened) found
 * missing from its source. A fact with no value is omitted.
 */
export function RecordRail({
  concept,
  individual,
}: Readonly<Props>): ReactNode {
  const { t } = useLingui();

  return (
    <AppViewRail>
      <AppViewRail.Group title={<Trans>Record</Trans>}>
        <AppViewRail.Fact label={t`Case type`}>{concept.name}</AppViewRail.Fact>
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
    </AppViewRail>
  );
}
