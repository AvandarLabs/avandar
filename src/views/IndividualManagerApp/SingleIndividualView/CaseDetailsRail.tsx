import { Callout } from "@avandar/ui";
import { isNullish, unknownToString } from "@avandar/utils";
import { Trans, useLingui } from "@lingui/react/macro";
import { Button, Skeleton, Text } from "@mantine/core";
import { IconAlertCircle } from "@tabler/icons-react";
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

/**
 * What stands in for the facts when there are none to list: the load failure,
 * placeholders, or the empty state. Rendered beside the fact list, never in
 * it, so the list only ever holds terms and values.
 */
function DetailsStatus({
  attributes,
  loadError,
}: {
  attributes: readonly CaseDetailsRow[] | undefined;
  loadError: CaseDetailsLoadError | undefined;
}): ReactNode {
  const { t } = useLingui();
  if (loadError) {
    return (
      <Callout
        title={t`This record's fields failed to load`}
        titleSize="sm"
        message={t`Try again in a moment, or reach out to support if it keeps happening.`}
        messageSize="sm"
        icon={<IconAlertCircle size={20} aria-hidden />}
      >
        <Button
          variant="default"
          size="compact-sm"
          className={css.retry}
          loading={loadError.isRetrying}
          onClick={loadError.onRetry}
        >
          <Trans>Try again</Trans>
        </Button>
      </Callout>
    );
  }
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
export function CaseDetailsRail({
  attributes,
  loadError,
  children,
}: Props): ReactNode {
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
                {attribute.sourceNames.map((sourceName, index) => {
                  return (
                    <Text key={`${index}-${sourceName}`} size="xs" c="dimmed">
                      {sourceName}
                    </Text>
                  );
                })}
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
