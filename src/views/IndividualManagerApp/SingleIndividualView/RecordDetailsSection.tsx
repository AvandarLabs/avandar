import { Trans, useLingui } from "@lingui/react/macro";
import { Skeleton } from "@mantine/core";
import { useMemo } from "react";
import { AppViewSection } from "@/components/layouts/AppView/AppViewSection/AppViewSection";
import { RecordAttributesList } from "@/views/IndividualManagerApp/SingleIndividualView/RecordAttributesList";
import type { RecordAttributeRow } from "@/views/IndividualManagerApp/SingleIndividualView/RecordAttributesList";
import type { HydratedIndividual } from "@/views/IndividualManagerApp/SingleIndividualView/useHydratedIndividual";
import type { ReactNode } from "react";

type Props = {
  hydratedIndividual: HydratedIndividual;
};

/** A record's attribute values, under a Details heading with their count. */
export function RecordDetailsSection({
  hydratedIndividual,
}: Readonly<Props>): ReactNode {
  const { t } = useLingui();
  const attributeRows: RecordAttributeRow[] | undefined = useMemo(() => {
    if (!hydratedIndividual.assertions) {
      return undefined;
    }
    return hydratedIndividual.assertions.map((assertion) => {
      return {
        name: assertion.attributeName ?? t`Loading...`,
        value: assertion.value,
        sourceType: assertion.sourceType,
        sourceName: assertion.sourceName,
      };
    });
  }, [hydratedIndividual.assertions, t]);

  return (
    <AppViewSection title={<Trans>Details</Trans>} meta={attributeRows?.length}>
      {attributeRows === undefined ? (
        <Skeleton height={120} radius="sm" />
      ) : (
        <RecordAttributesList attributes={attributeRows} />
      )}
    </AppViewSection>
  );
}
