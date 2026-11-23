import { useLingui } from "@lingui/react/macro";
import { useMemo } from "react";
import type { ConceptAttribute } from "$/models/ontology/ConceptAttribute/ConceptAttribute";

/** How one period reads in the interface. */
export type BucketGrainLabels = {
  /** The period as a noun heading a column of periods, such as "Month". */
  period: string;
  /** The period as a choice or a badge, such as "Per month". */
  perPeriod: string;
};

/**
 * The translated names of every period a per-period field can keep one value
 * for. Use it wherever a period is named, for example a picker's options or
 * a table's column heading.
 */
export function useBucketGrainLabels(): Readonly<
  Record<ConceptAttribute.BucketGrain, BucketGrainLabels>
> {
  const { t } = useLingui();
  return useMemo(() => {
    return {
      day: { period: t`Day`, perPeriod: t`Per day` },
      week: { period: t`Week`, perPeriod: t`Per week` },
      month: { period: t`Month`, perPeriod: t`Per month` },
      quarter: { period: t`Quarter`, perPeriod: t`Per quarter` },
      year: { period: t`Year`, perPeriod: t`Per year` },
    };
  }, [t]);
}
