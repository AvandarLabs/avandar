import { Trans, useLingui } from "@lingui/react/macro";
import { Text } from "@mantine/core";
import { AppViewRail } from "@/components/layouts/AppView/AppViewRail/AppViewRail";
import css from "@/views/IndividualManagerApp/SingleIndividualView/CaseDetailsRail.module.css";
import { DetailsStatus } from "@/views/IndividualManagerApp/SingleIndividualView/DetailsStatus/DetailsStatus";
import { RecordFieldValue } from "@/views/IndividualManagerApp/SingleIndividualView/RecordFieldValue/RecordFieldValue";
import type { AvaDataType } from "$/models/datasets/AvaDataType/AvaDataType";
import type { ConceptAttribute } from "$/models/ontology/ConceptAttribute/ConceptAttribute";
import type { ReactNode } from "react";

/** One field of a case as the rail shows it. */
export type CaseDetailsRow = {
  /** The case type field this value belongs to. */
  id: ConceptAttribute.Id;
  name: string;
  /** The field's `data_type`, which decides how its value reads. */
  dataType: AvaDataType.T;
  /** Whether the field keeps one value, every value, or one per period. */
  valueShape: ConceptAttribute.ValueShape;
  /** The field's period, when it keeps one value per period. */
  bucketGrain: ConceptAttribute.BucketGrain | undefined;
  /** The record's value, or `null` or `undefined` when it has none. */
  value: unknown;
  /** The names of the datasets the field reads, each on its own line. */
  sourceNames: string[];
};

/** A failed load of the case's fields, and how to try it again. */
export type CaseDetailsLoadError = {
  isRetrying: boolean;
  onRetry: () => void;
};

type Props = {
  /** The case's fields, or `undefined` while they load. */
  attributes: readonly CaseDetailsRow[] | undefined;

  /** Set when the fields failed to load. Replaces the placeholder rows. */
  loadError?: CaseDetailsLoadError;

  /** Further rail groups, shown under the case's fields. */
  children?: ReactNode;
};

/** The case's fields as reference material, plus any further groups. */
export function CaseDetailsRail({
  attributes,
  loadError,
  children,
}: Props): ReactNode {
  const { t } = useLingui();
  return (
    <AppViewRail>
      <div className={css.details}>
        <AppViewRail.Group title={<Trans>Details</Trans>}>
          {attributes?.map((attribute) => {
            return (
              <AppViewRail.Fact key={attribute.id} label={attribute.name}>
                <RecordFieldValue
                  fieldName={attribute.name}
                  valueShape={attribute.valueShape}
                  bucketGrain={attribute.bucketGrain}
                  dataType={attribute.dataType}
                  value={attribute.value}
                />
                {attribute.sourceNames.length > 0 ? (
                  <ul
                    role="list"
                    aria-label={t`Sources of ${attribute.name}`}
                    className={css.sourceList}
                  >
                    {attribute.sourceNames.map((sourceName, index) => {
                      return (
                        <Text
                          component="li"
                          key={`${index}-${sourceName}`}
                          size="xs"
                          c="dimmed"
                        >
                          {sourceName}
                        </Text>
                      );
                    })}
                  </ul>
                ) : null}
              </AppViewRail.Fact>
            );
          })}
        </AppViewRail.Group>
        <DetailsStatus attributes={attributes} loadError={loadError} />
      </div>
      {children}
    </AppViewRail>
  );
}
