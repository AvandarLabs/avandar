import { useLingui } from "@lingui/react/macro";
import { Button, NumberInput, Select, Title } from "@mantine/core";
import { IconArrowLeft } from "@tabler/icons-react";
import { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn";
import { MapLayerUpdates } from "@/views/GisApp/layers/MapLayerUpdates/MapLayerUpdates";
import { CategoricalControls } from "./CategoricalControls";
import { ClassificationBreakHandles } from "./ClassificationBreakHandles";
import { ClassificationBreakList } from "./ClassificationBreakList";
import css from "./ClassificationEditor.module.css";
import { ClassificationHistogram } from "./ClassificationHistogram";
import { NoDataControls } from "./NoDataControls";
import { NormalizationControls } from "./NormalizationControls";
import type { LayerChangeHandler } from "@/views/GisApp/panels/LayerInspector/LayerInspector";
import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import type { ReactNode } from "react";

type Props = {
  layer: MapLayer.T;
  onLayerChange: LayerChangeHandler;
  onBack: () => void;
};

const RAMPS = {
  blue: ["#eff3ff", "#bdd7e7", "#6baed6", "#2171b5", "#08306b"],
  orange: ["#feedde", "#fdbe85", "#fd8d3c", "#e6550d", "#a63603"],
} as const;

function _getDefaultValue(layer: MapLayer.T): MapLayer.LayerValue | undefined {
  const binding = layer.geoBinding;
  if (
    binding?.type === "joinToBoundaries" ||
    binding?.type === "aggregatePointsToBoundaries"
  ) {
    return {
      type: "areaAggregation",
      outputValueId: binding.aggregation.outputValueId,
    };
  }
  const column = layer.source.queryColumns.find(QueryColumn.isNumeric);
  return column ? { type: "queryColumn", column: column.id } : undefined;
}

function _createColor(
  layer: MapLayer.T,
  mode: "single" | "categorical" | "graduated",
): MapLayer.Color | undefined {
  const current = layer.symbology.color;
  if (mode === "single") {
    const color =
      current.type === "single" ? current.color
      : current.type === "graduated" ? current.ramp[0]
      : current.categories[0]?.color;
    return { type: "single", color: color ?? "#228be6" };
  }
  const value = current.type === mode ? current.value : _getDefaultValue(layer);
  if (!value) {
    return undefined;
  }
  const noData =
    current.type === "single" ?
      { color: "#ced4da", label: "" }
    : current.noData;
  if (mode === "graduated") {
    return {
      type: "graduated",
      value,
      ramp: RAMPS.blue,
      classification: { method: "quantile", classCount: 5 },
      normalization: undefined,
      noData,
    };
  }
  return {
    type: "categorical",
    value,
    categories: [
      { value: "", label: "", color: "#2171b5" },
      { value: "", label: "", color: "#f16913" },
      { value: "", label: "", color: "#31a354" },
    ],
    other: { color: "#969696", label: "" },
    noData,
  };
}

/** Focused editor for polygon color classification and normalization. */
export function ClassificationEditor(props: Props): ReactNode {
  const { t } = useLingui();
  const color = props.layer.symbology.color;
  const manualBreaks =
    color.type === "graduated" && color.classification.method === "manual" ?
      color.classification.breaks
    : props.layer.legend.breaks
        .map(({ upper }) => {
          return upper;
        })
        .filter((value): value is number => {
          return value !== undefined;
        });
  return (
    <div className={css.editor}>
      <div className={css.header}>
        <Button
          variant="subtle"
          onClick={props.onBack}
          leftSection={<IconArrowLeft size={14} />}
        >
          {t`Back`}
        </Button>
        <Title order={3}>{t`Classification`}</Title>
      </div>
      <Select
        label={t`Color mode`}
        data={[
          { value: "single", label: t`Single color` },
          { value: "categorical", label: t`Categories` },
          { value: "graduated", label: t`Graduated` },
        ]}
        value={color.type}
        allowDeselect={false}
        onChange={(mode) => {
          if (!mode) {
            return;
          }
          const nextColor = _createColor(
            props.layer,
            mode as "single" | "categorical" | "graduated",
          );
          if (nextColor) {
            props.onLayerChange((current) => {
              return MapLayerUpdates.withLayerColor(current, nextColor);
            });
          }
        }}
      />
      {color.type === "graduated" ?
        <GraduatedControls
          {...props}
          color={color}
          manualBreaks={manualBreaks}
        />
      : color.type === "categorical" ?
        <CategoricalControls {...props} />
      : null}
      <NoDataControls {...props} />
      <ClassificationHistogram entries={props.layer.legend.entries} />
    </div>
  );
}

function GraduatedControls(
  props: Props & {
    color: Extract<MapLayer.Color, { type: "graduated" }>;
    manualBreaks: readonly number[];
  },
): ReactNode {
  const { t } = useLingui();
  const { color } = props;
  const classCount =
    color.classification.method === "manual" ?
      color.classification.breaks.length + 1
    : color.classification.classCount;
  const updateColor = (nextColor: typeof color): void => {
    props.onLayerChange((current) => {
      return MapLayerUpdates.withLayerColor(current, nextColor);
    });
  };
  return (
    <>
      <Select
        label={t`Method`}
        data={[
          { value: "quantile", label: t`Quantile` },
          { value: "equalInterval", label: t`Equal interval` },
          { value: "jenks", label: t`Natural breaks` },
          { value: "standardDeviation", label: t`Standard deviation` },
          { value: "manual", label: t`Manual` },
        ]}
        value={color.classification.method}
        allowDeselect={false}
        onChange={(method) => {
          if (!method) {
            return;
          }
          updateColor({
            ...color,
            classification:
              method === "manual" ?
                { method, breaks: props.manualBreaks }
              : {
                  method: method as
                    | "quantile"
                    | "equalInterval"
                    | "jenks"
                    | "standardDeviation",
                  classCount,
                },
          });
        }}
      />
      {color.classification.method === "manual" ?
        <ClassificationBreakList
          layer={props.layer}
          breaks={color.classification.breaks}
          onLayerChange={props.onLayerChange}
        />
      : <NumberInput
          label={t`Classes`}
          min={2}
          max={7}
          value={color.classification.classCount}
          onChange={(value) => {
            if (typeof value === "number") {
              updateColor({
                ...color,
                classification: {
                  method: color.classification.method as
                    | "quantile"
                    | "equalInterval"
                    | "jenks"
                    | "standardDeviation",
                  classCount: value,
                },
              });
            }
          }}
        />
      }
      <Select
        label={t`Color ramp`}
        data={[
          { value: "blue", label: t`Blue` },
          { value: "orange", label: t`Orange` },
        ]}
        value={color.ramp[0] === RAMPS.orange[0] ? "orange" : "blue"}
        allowDeselect={false}
        onChange={(value) => {
          return updateColor({
            ...color,
            ramp: value === "orange" ? RAMPS.orange : RAMPS.blue,
          });
        }}
      />
      <NormalizationControls {...props} />
      <ClassificationBreakHandles
        layer={props.layer}
        breaks={props.manualBreaks}
        onLayerChange={props.onLayerChange}
      />
      {(
        color.classification.method === "jenks" &&
        props.layer.legend.entries.reduce((sum, entry) => {
          return sum + entry.count;
        }, 0) > 5_000
      ) ?
        <p>{t`Natural breaks used an evenly ranked sample of 5,000 values.`}</p>
      : null}
    </>
  );
}
