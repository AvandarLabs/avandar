import { useLingui } from "@lingui/react/macro";
import clsx from "clsx";
import css from "@/views/GisApp/panels/LegendPanel/MapLegend/MapLegendGroup/MapLegendGroup.module.css";
import type { ReactNode } from "react";

type Props = {
  color: string | undefined;
  entryLabel: string;
  showNoData: boolean;
};

/** Renders a single-color legend row and an optional no-data key. */
export function FlatLegendEntry({
  color,
  entryLabel,
  showNoData,
}: Props): ReactNode {
  const { t } = useLingui();
  return (
    <>
      <li className={css.mapLegendGroupItem}>
        <span
          className={css.mapLegendGroupKey}
          style={{ backgroundColor: color }}
        />
        {entryLabel}
      </li>
      {showNoData ?
        <li className={css.mapLegendGroupItem}>
          <span
            className={clsx(css.mapLegendGroupKey, css.mapLegendGroupKeyNoData)}
          />
          {t`Not reported`}
        </li>
      : null}
    </>
  );
}
