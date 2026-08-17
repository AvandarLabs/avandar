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

function _parseBreaks(text: string): number[] {
  return text.split(",").map((part) => {
    return Number(part.trim());
  });
}

function _areBreaksValid(numbers: readonly number[]): boolean {
  return (
    numbers.length > 0 &&
    numbers.every((value, index) => {
      return (
        Number.isFinite(value) && (index === 0 || value > numbers[index - 1]!)
      );
    })
  );
}

/** Edits manual cuts as a validated, comma-separated numeric list. */
export function ClassificationBreakList({
  breaks,
  onLayerChange,
}: Props): ReactNode {
  const { t } = useLingui();
  const [text, setText] = useState(() => {
    return breaks.join(", ");
  });
  const numbers = _parseBreaks(text);
  return (
    <TextInput
      label={t`Manual breaks`}
      description={t`Enter strictly increasing values separated by commas.`}
      error={
        _areBreaksValid(numbers) ? undefined : (
          t`Breaks must be finite and strictly increasing.`
        )
      }
      value={text}
      onChange={(event) => {
        const value = event.currentTarget.value;
        setText(value);
        onLayerChange((current) => {
          return MapLayerUpdates.withManualBreaks({
            layer: current,
            breaks: _parseBreaks(value),
          });
        });
      }}
    />
  );
}
