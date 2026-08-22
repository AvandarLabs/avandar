import type { I18n } from "@lingui/core";
import type { ReactNode } from "react";

import { msg } from "@lingui/core/macro";
import { Button } from "@mantine/core";

import css from "@/views/GisApp/panels/MapStatusCard/MapStatusCard.module.css";

type Props = {
  layerName: string;
  filterCount: number;
  i18n: I18n;
  onReviewFilter: () => void;
};

/** Renders the empty result message and optional filter action. */
export function MapEmptyStatus({
  layerName,
  filterCount,
  i18n,
  onReviewFilter,
}: Props): ReactNode {
  const filterMessage =
    filterCount === 0
      ? msg`The source has no rows.`
      : filterCount === 1
        ? msg`One filter is active on this layer. It may be excluding everything.`
        : msg`${filterCount} filters are active on this layer. They may be excluding everything.`;
  return (
    <>
      <span className={css.mapStatusCardTitle}>
        {i18n._(msg`${layerName} returned no rows`)}
      </span>
      <span className={css.mapStatusCardBody}>{i18n._(filterMessage)}</span>
      {filterCount > 0 ? (
        <span className={css.mapStatusCardActions}>
          <Button size="compact-xs" variant="default" onClick={onReviewFilter}>
            {i18n._(msg`Review filter`)}
          </Button>
        </span>
      ) : null}
    </>
  );
}
