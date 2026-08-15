import { useLingui } from "@lingui/react/macro";
import { match } from "ts-pattern";
import css from "@/views/GisApp/panels/LegendPanel/MapLegend/MapLegend.module.css";
import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import type { ReactNode } from "react";

type Props = { layer: MapLayer.T };

/** Renders one layer's title, units, symbol key, and no-data key. */
export function MapLegendGroup({ layer }: Props): ReactNode {
  const { t } = useLingui();
  const entryLabel = match(layer.symbology)
    .with({ type: "circle" }, () => {
      return layer.name;
    })
    .with({ type: "proportionalSymbol" }, () => {
      return t`Sized by value`;
    })
    .exhaustive();
  const title = layer.legend.title.trim() || layer.name.trim() || t`Legend`;
  return (
    <div className={css.mapLegendGroup}>
      <h3 className={css.mapLegendTitle}>{title}</h3>
      {layer.legend.units ?
        <div className={css.mapLegendUnits}>{layer.legend.units}</div>
      : null}
      <ul className={css.mapLegendList}>
        <li className={css.mapLegendItem}>
          <span
            className={css.mapLegendKey}
            style={{ backgroundColor: layer.symbology.color.color }}
          />
          {entryLabel}
        </li>
        {layer.legend.showNoData ?
          <li className={css.mapLegendItem}>
            <span className={`${css.mapLegendKey} ${css.mapLegendKeyNoData}`} />
            {t`Not reported`}
          </li>
        : null}
      </ul>
    </div>
  );
}
