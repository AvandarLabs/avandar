import { useLingui } from "@lingui/react/macro";
import css from "@/views/GisApp/panels/LegendPanel/MapLegend/MapLegendGroup/MapLegendGroup.module.css";
import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import type { ReactNode } from "react";

type Props = { layer: MapLayer.T };

function _getEntryClassName(entry: MapLayer.LegendEntry): string {
  if (entry.type === "suppressed") {
    return `${css.mapLegendGroupKey!} ${css.mapLegendGroupKeySuppressed!}`;
  }
  if (entry.type === "noData") {
    return `${css.mapLegendGroupKey!} ${css.mapLegendGroupKeyNoData!}`;
  }
  return css.mapLegendGroupKey!;
}

/** Renders one layer's title, units, and persisted ordered symbol keys. */
export function MapLegendGroup({ layer }: Props): ReactNode {
  const { t } = useLingui();
  const title = layer.legend.title.trim() || layer.name.trim() || t`Legend`;
  const flatEntryLabel =
    layer.symbology.type === "proportionalSymbol" ?
      t`Sized by value`
    : layer.name;
  return (
    <div className={css.mapLegendGroup}>
      <h3 className={css.mapLegendGroupTitle}>{title}</h3>
      {layer.legend.units ?
        <div className={css.mapLegendGroupUnits}>{layer.legend.units}</div>
      : null}
      <ul className={css.mapLegendGroupList}>
        {layer.legend.entries.length > 0 ?
          layer.legend.entries.map((entry) => {
            if (entry.type === "noData" && !layer.legend.showNoData) {
              return null;
            }
            const label =
              entry.label.trim() ||
              (entry.type === "suppressed" ? t`Suppressed`
              : entry.type === "noData" ? t`Not reported`
              : t`Other`);
            return (
              <li
                className={css.mapLegendGroupItem}
                key={JSON.stringify(entry)}
              >
                <span
                  aria-label={label}
                  className={_getEntryClassName(entry)}
                  style={{ backgroundColor: entry.color }}
                />
                <span>{label}</span>
                <span className={css.mapLegendGroupCount}>{entry.count}</span>
              </li>
            );
          })
        : <FlatLegendEntries layer={layer} entryLabel={flatEntryLabel} />}
      </ul>
    </div>
  );
}

function FlatLegendEntries(props: {
  layer: MapLayer.T;
  entryLabel: string;
}): ReactNode {
  const { t } = useLingui();
  const color = props.layer.symbology.color;
  return (
    <>
      <li className={css.mapLegendGroupItem}>
        <span
          className={css.mapLegendGroupKey}
          style={{
            backgroundColor: color.type === "single" ? color.color : undefined,
          }}
        />
        {props.entryLabel}
      </li>
      {props.layer.legend.showNoData ?
        <li className={css.mapLegendGroupItem}>
          <span
            className={`${css.mapLegendGroupKey} ${css.mapLegendGroupKeyNoData}`}
          />
          {t`Not reported`}
        </li>
      : null}
    </>
  );
}
