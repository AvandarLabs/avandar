import { useLingui } from "@lingui/react/macro";
import clsx from "clsx";
import { HeatmapLegend } from "@/views/GisApp/panels/LegendPanel/MapLegend/HeatmapLegend/HeatmapLegend";
import css from "@/views/GisApp/panels/LegendPanel/MapLegend/MapLegendGroup/MapLegendGroup.module.css";
import { SizeLegend } from "@/views/GisApp/panels/LegendPanel/MapLegend/SizeLegend/SizeLegend";
import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import type { ReactNode } from "react";

type Props = { layer: MapLayer.T };

function _getEntryClassName(entry: MapLayer.LegendEntry): string {
  return clsx(
    css.mapLegendGroupKey,
    entry.type === "suppressed" && css.mapLegendGroupKeySuppressed,
    entry.type === "noData" && css.mapLegendGroupKeyNoData,
  );
}

function LegendEntries(props: {
  entries: readonly MapLayer.LegendEntry[];
  showNoData: boolean;
}): ReactNode {
  const { t } = useLingui();
  return (
    <>
      {props.entries.map((entry) => {
        if (entry.type === "noData" && !props.showNoData) {
          return null;
        }
        const label =
          entry.label.trim() ||
          (entry.type === "suppressed" ? t`Suppressed`
          : entry.type === "noData" ? t`Not reported`
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

function FlatLegendEntry(props: {
  color: string | undefined;
  entryLabel: string;
  showNoData: boolean;
}): ReactNode {
  const { t } = useLingui();
  return (
    <>
      <li className={css.mapLegendGroupItem}>
        <span
          className={css.mapLegendGroupKey}
          style={{ backgroundColor: props.color }}
        />
        {props.entryLabel}
      </li>
      {props.showNoData ?
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

function SizedLegendContent({ layer }: Props): ReactNode {
  return (
    <div className={css.mapLegendGroupSized}>
      <SizeLegend sizeStops={layer.legend.sizeStops} />
      {layer.legend.entries.length > 0 ?
        <ul className={css.mapLegendGroupList}>
          <LegendEntries
            entries={layer.legend.entries}
            showNoData={layer.legend.showNoData}
          />
        </ul>
      : null}
    </div>
  );
}

function StandardLegendContent({ layer }: Props): ReactNode {
  const { t } = useLingui();
  const color =
    (
      layer.symbology.type !== "heatmap" &&
      layer.symbology.color.type === "single"
    ) ?
      layer.symbology.color.color
    : undefined;
  return (
    <ul className={css.mapLegendGroupList}>
      {layer.legend.entries.length > 0 ?
        <LegendEntries
          entries={layer.legend.entries}
          showNoData={layer.legend.showNoData}
        />
      : <FlatLegendEntry
          color={color}
          entryLabel={
            layer.symbology.type === "proportionalSymbol" ?
              t`Sized by value`
            : layer.name
          }
          showNoData={layer.legend.showNoData}
        />
      }
    </ul>
  );
}

function LayerLegendContent({ layer }: Props): ReactNode {
  if (layer.symbology.type === "heatmap") {
    return <HeatmapLegend ramp={layer.symbology.ramp} />;
  }
  if (layer.symbology.type === "cluster") {
    return (
      <ul className={css.mapLegendGroupList}>
        <FlatLegendEntry
          color={layer.symbology.color.color}
          entryLabel={layer.name}
          showNoData={false}
        />
      </ul>
    );
  }
  if (
    layer.symbology.type === "proportionalSymbol" &&
    layer.legend.sizeStops.length > 0
  ) {
    return <SizedLegendContent layer={layer} />;
  }
  return <StandardLegendContent layer={layer} />;
}

/** Renders one layer's title, units, and symbology-specific legend form. */
export function MapLegendGroup({ layer }: Props): ReactNode {
  const { t } = useLingui();
  const title = layer.legend.title.trim() || layer.name.trim() || t`Legend`;
  return (
    <div className={css.mapLegendGroup}>
      <h3 className={css.mapLegendGroupTitle}>{title}</h3>
      {layer.legend.units ?
        <div className={css.mapLegendGroupUnits}>{layer.legend.units}</div>
      : null}
      <LayerLegendContent layer={layer} />
    </div>
  );
}
