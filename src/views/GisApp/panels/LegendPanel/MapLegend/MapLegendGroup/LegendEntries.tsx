import { useLingui } from "@lingui/react/macro";
import clsx from "clsx";
import css from "@/views/GisApp/panels/LegendPanel/MapLegend/MapLegendGroup/MapLegendGroup.module.css";
import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import type { ReactNode } from "react";

type Props = {
  entries: readonly MapLayer.LegendEntry[];
  showNoData: boolean;
};

function _getEntryClassName(entry: MapLayer.LegendEntry): string {
  return clsx(
    css.mapLegendGroupKey,
    entry.type === "suppressed" && css.mapLegendGroupKeySuppressed,
    entry.type === "noData" && css.mapLegendGroupKeyNoData,
  );
}

/** Renders classified legend keys, labels, and counts. */
export function LegendEntries({ entries, showNoData }: Props): ReactNode {
  const { t } = useLingui();
  return (
    <>
      {entries.map((entry) => {
        if (entry.type === "noData" && !showNoData) {
          return null;
        }
        const label =
          entry.label.trim() ||
          (entry.type === "suppressed"
            ? t`Suppressed`
            : entry.type === "noData"
              ? t`Not reported`
              : t`Other`);
        return (
          <li className={css.mapLegendGroupItem} key={JSON.stringify(entry)}>
            <span
              aria-label={label}
              className={_getEntryClassName(entry)}
              style={{ backgroundColor: entry.color }}
            />
            <span>{label}</span>
            <span className={css.mapLegendGroupCount}>{entry.count}</span>
          </li>
        );
      })}
    </>
  );
}
