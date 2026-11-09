import { useLingui } from "@lingui/react/macro";
import { NumberInput } from "@mantine/core";
import { useState } from "react";
import { MapLayerUpdates } from "@/views/GisApp/layers/MapLayerUpdates/MapLayerUpdates";
import type { LayerChangeHandler } from "@/views/GisApp/panels/LayerInspector/LayerInspector";
import type { ReactNode } from "react";

type Props = {
  /** Lowest and highest classified value, when the layer has classified. */
  classifiedValueDomain: readonly [number, number] | undefined;
  onLayerChange: LayerChangeHandler;
};

/** True when every classified value lies between 0 and 1. */
function _isFractionDomain(
  domain: readonly [number, number] | undefined,
): boolean {
  return domain !== undefined && domain[0] >= 0 && domain[1] <= 1;
}

/**
 * A shortcut that flags every value below one number. It writes ordinary
 * fields: a manual classification with that single break, the threshold
 * colors, and "Below" and "or above" class labels. When every classified
 * value is a fraction, the number is typed as a percent and stored as a
 * fraction, so 95 flags values below 0.95.
 */
export function HighlightValuesBelowInput({
  classifiedValueDomain,
  onLayerChange,
}: Props): ReactNode {
  const { t } = useLingui();
  const [typedValue, setTypedValue] = useState<number | string>("");
  const isFraction = _isFractionDomain(classifiedValueDomain);
  return (
    <NumberInput
      label={t`Highlight values below`}
      description={
        isFraction
          ? t`These values are fractions, so type a percent such as 95.`
          : undefined
      }
      rightSection={isFraction ? t`%` : undefined}
      value={typedValue}
      onChange={(value) => {
        setTypedValue(value);
        if (typeof value !== "number") {
          return;
        }
        const threshold = String(value);
        const belowLabel = isFraction
          ? t`Below ${threshold}%`
          : t`Below ${threshold}`;
        const aboveLabel = isFraction
          ? t`${threshold}% or above`
          : t`${threshold} or above`;
        const breakValue = isFraction ? value / 100 : value;
        onLayerChange((current) => {
          return MapLayerUpdates.withHighlightBelow({
            layer: current,
            breakValue,
            belowLabel,
            aboveLabel,
          });
        });
      }}
    />
  );
}
