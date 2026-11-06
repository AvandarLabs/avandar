import { unknownToString } from "@avandar/utils";
import { Trans } from "@lingui/react/macro";
import { Skeleton, Text } from "@mantine/core";
import { AppViewRail } from "@/components/layouts/AppView/AppViewRail/AppViewRail";
import css from "@/views/IndividualManagerApp/SingleIndividualView/CaseDetailsRail.module.css";
import type { ConceptAttribute } from "$/models/ontology/ConceptAttribute/ConceptAttribute";
import type { ReactNode } from "react";

/** How many placeholder rows stand in for the fields while they load. */
const PLACEHOLDER_ROW_COUNT = 4;

/** One field of a case as the rail shows it. */
export type CaseDetailsRow = {
  /** The case type field this value belongs to. */
  id: ConceptAttribute.Id;
  name: string;
  value: unknown;
  sourceName?: string;
};

type Props = {
  /** The case's fields, or `undefined` while they load. */
  attributes: readonly CaseDetailsRow[] | undefined;

  /** Further rail groups, shown under the case's fields. */
  children?: ReactNode;
};

/**
 * What stands in for the facts when there are none to list. Rendered beside
 * the fact list, never in it, so the list only ever holds terms and values.
 */
function DetailsStatus({
  attributes,
}: {
  attributes: readonly CaseDetailsRow[] | undefined;
}): ReactNode {
  if (attributes === undefined) {
    return (
      <div className={css.placeholderRows} aria-hidden>
        {Array.from({ length: PLACEHOLDER_ROW_COUNT }, (_, index) => {
          return <Skeleton key={index} height={14} />;
        })}
      </div>
    );
  }
  if (attributes.length === 0) {
    return (
      <Text size="sm" c="dimmed">
        <Trans>No fields yet</Trans>
      </Text>
    );
  }
  return null;
}

/** The case's fields as reference material in the properties rail. */
export function CaseDetailsRail({ attributes, children }: Props): ReactNode {
  return (
    <AppViewRail>
      <div className={css.details}>
        <AppViewRail.Group title={<Trans>Details</Trans>}>
          {attributes?.map((attribute) => {
            return (
              <AppViewRail.Fact key={attribute.id} label={attribute.name}>
                {unknownToString(attribute.value)}
                {attribute.sourceName ? (
                  <Text size="xs" c="dimmed">
                    {attribute.sourceName}
                  </Text>
                ) : null}
              </AppViewRail.Fact>
            );
          })}
        </AppViewRail.Group>
        <DetailsStatus attributes={attributes} />
      </div>
      {children}
    </AppViewRail>
  );
}
