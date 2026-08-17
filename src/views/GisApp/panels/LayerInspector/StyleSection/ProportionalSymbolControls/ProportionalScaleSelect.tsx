import { Callout } from "@avandar/ui";
import { useLingui } from "@lingui/react/macro";
import { Select } from "@mantine/core";
import { MapLayerUpdates } from "@/views/GisApp/layers/MapLayerUpdates/MapLayerUpdates";
import type { LayerChangeHandler } from "@/views/GisApp/panels/LayerInspector/LayerInspector";
import type { ReactNode } from "react";

type Props = {
  scale: "sqrt" | "linear";
  onLayerChange: LayerChangeHandler;
};

/** Selects area-vs-linear scaling and explains the square-root default. */
export function ProportionalScaleSelect({
  scale,
  onLayerChange,
}: Props): ReactNode {
  const { t } = useLingui();
  return (
    <>
      <Select
        label={t`Scale`}
        data={[
          { value: "sqrt", label: t`Square root` },
          { value: "linear", label: t`Linear` },
        ]}
        value={scale}
        allowDeselect={false}
        onChange={(nextScale) => {
          if (nextScale !== "sqrt" && nextScale !== "linear") {
            return;
          }
          onLayerChange((current) => {
            return MapLayerUpdates.withSymbolScale({
              layer: current,
              scale: nextScale,
            });
          });
        }}
      />
      {scale === "sqrt" ?
        <Callout>
          {t`Symbol area is proportional to the value, not radius, so a value ten times larger draws a symbol about three times wider.`}
        </Callout>
      : null}
    </>
  );
}
