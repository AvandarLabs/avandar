import { isNullish, unknownToString } from "@avandar/utils";
import { Trans, useLingui } from "@lingui/react/macro";
import { Text } from "@mantine/core";
import { AppViewRail } from "@/components/layouts/AppView/AppViewRail/AppViewRail";
import css from "@/views/IndividualManagerApp/SingleIndividualView/CaseDetailsRail.module.css";
import { DetailsStatus } from "@/views/IndividualManagerApp/SingleIndividualView/DetailsStatus/DetailsStatus";
import type { ConceptAttribute } from "$/models/ontology/ConceptAttribute/ConceptAttribute";
import type { ReactNode } from "react";

/** One field of a case as the rail shows it. */
export type CaseDetailsRow = {
  /** The case type field this value belongs to. */
  id: ConceptAttribute.Id;
  name: string;
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

/** The case's fields as reference material in the properties rail. */
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
                {isNullish(attribute.value) ? (
                  <Text span c="dimmed">
                    <Trans>No value</Trans>
                  </Text>
                ) : (
                  unknownToString(attribute.value)
                )}
                {attribute.sourceNames.length > 0 ? (
                  <ul aria-label={t`Sources`} className={css.sourceList}>
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
