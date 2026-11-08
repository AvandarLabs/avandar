import { Callout } from "@avandar/ui";
import { Trans, useLingui } from "@lingui/react/macro";
import { Button, Skeleton, Text } from "@mantine/core";
import { IconAlertCircle } from "@tabler/icons-react";
import css from "@/views/IndividualManagerApp/SingleIndividualView/DetailsStatus/DetailsStatus.module.css";
import type {
  CaseDetailsLoadError,
  CaseDetailsRow,
} from "@/views/IndividualManagerApp/SingleIndividualView/CaseDetailsRail";
import type { ReactNode } from "react";

/** How many placeholder rows stand in for the fields while they load. */
const PLACEHOLDER_ROW_COUNT = 4;

type Props = {
  /** The case's fields, or `undefined` while they load. */
  attributes: readonly CaseDetailsRow[] | undefined;

  /** Set when the fields failed to load. Replaces the placeholder rows. */
  loadError: CaseDetailsLoadError | undefined;
};

/**
 * What stands in for the facts when there are none to list: the load failure,
 * placeholders, or the empty state. Rendered beside the fact list, never in
 * it, so the list only ever holds terms and values.
 */
export function DetailsStatus({
  attributes,
  loadError,
}: Readonly<Props>): ReactNode {
  const { t } = useLingui();
  if (loadError) {
    return (
      <Callout
        title={t`This record's fields failed to load`}
        titleSize="sm"
        titleOrder={5}
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
