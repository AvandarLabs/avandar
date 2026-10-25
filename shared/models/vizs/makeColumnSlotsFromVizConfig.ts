import { match } from "ts-pattern";

/**
 * An authored visualization field and its position within the configuration.
 */
export type VizColumnSlot<Key extends string> = {
  key: Key | undefined;
  target: string;
};
type SlotSeries<Key extends string> = { key: Key; xKey?: Key; sizeKey?: Key };
type SlotConfig<Key extends string> =
  | { vizType: "table" }
  | {
      vizType: "bar" | "line" | "area";
      xAxisKey?: Key;
      series: ReadonlyArray<SlotSeries<Key>>;
    }
  | { vizType: "radar"; nameKey?: Key; series: ReadonlyArray<SlotSeries<Key>> }
  | { vizType: "scatter" | "bubble"; series: ReadonlyArray<SlotSeries<Key>> }
  | { vizType: "pie" | "funnel"; nameKey?: Key; valueKey?: Key };

function _makeSeriesSlots<Key extends string>({
  series,
  keys,
}: {
  series: ReadonlyArray<SlotSeries<Key>>;
  keys: ReadonlyArray<keyof SlotSeries<Key>>;
}): Array<VizColumnSlot<Key>> {
  return series.flatMap((item, index) => {
    return keys.map((key) => {
      return {
        key: item[key],
        target: `series.${index}.${key}`,
      };
    });
  });
}

/**
 * Lists every axis and series slot in rendering order, including absent slots.
 */
export function makeColumnSlotsFromVizConfig<Key extends string>(
  config: Readonly<SlotConfig<Key>>,
): Array<VizColumnSlot<Key>> {
  return match(config)
    .with({ vizType: "table" }, () => {
      return [];
    })
    .with(
      { vizType: "bar" },
      { vizType: "line" },
      { vizType: "area" },
      (chart) => {
        return [
          { key: chart.xAxisKey, target: "xAxisKey" },
          ..._makeSeriesSlots({ series: chart.series, keys: ["key"] }),
        ];
      },
    )
    .with({ vizType: "radar" }, (chart) => {
      return [
        { key: chart.nameKey, target: "nameKey" },
        ..._makeSeriesSlots({ series: chart.series, keys: ["key"] }),
      ];
    })
    .with({ vizType: "scatter" }, (chart) => {
      return _makeSeriesSlots({ series: chart.series, keys: ["key", "xKey"] });
    })
    .with({ vizType: "bubble" }, (chart) => {
      return _makeSeriesSlots({
        series: chart.series,
        keys: ["key", "xKey", "sizeKey"],
      });
    })
    .with({ vizType: "pie" }, { vizType: "funnel" }, (chart) => {
      return [
        { key: chart.nameKey, target: "nameKey" },
        { key: chart.valueKey, target: "valueKey" },
      ];
    })
    .exhaustive();
}
