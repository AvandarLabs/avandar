import { useLingui } from "@lingui/react/macro";
import { TextInput } from "@mantine/core";
import { useState } from "react";
import { MapLayerUpdates } from "@/views/GisApp/layers/MapLayerUpdates/MapLayerUpdates";
import type { LayerChangeHandler } from "@/views/GisApp/panels/LayerInspector/LayerInspector";
import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import type { ReactNode } from "react";

type Props = {
  layer: MapLayer.T;
  breaks: readonly number[];
  onLayerChange: LayerChangeHandler;
};

/** Edits manual cuts as a validated, comma-separated numeric list. */
export function ClassificationBreakList(props: Props): ReactNode {
  const { t } = useLingui();
  const [text, setText] = useState(props.breaks.join(", "));
  const numbers = text.split(",").map((part) => {
    return Number(part.trim());
  });
  const isValid =
    numbers.length > 0 &&
    numbers.every((value, index) => {
      return (
        Number.isFinite(value) && (index === 0 || value > numbers[index - 1]!)
      );
    });
  return (
    <TextInput
      label={t`Manual breaks`}
      description={t`Enter strictly increasing values separated by commas.`}
      error={
        isValid ? undefined : t`Breaks must be finite and strictly increasing.`
      }
      value={text}
      onChange={(event) => {
        const value = event.currentTarget.value;
        setText(value);
        const nextNumbers = value.split(",").map((part) => {
          return Number(part.trim());
        });
        props.onLayerChange((current) => {
          return MapLayerUpdates.withManualBreaks(current, nextNumbers);
        });
      }}
    />
  );
}
