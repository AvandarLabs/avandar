import { useLingui } from "@lingui/react/macro";
import { Fieldset, Stack } from "@mantine/core";
import { legendBreakToLabel } from "@/views/GisApp/layers/classifyLayerValues/classifyLayerValues";
import { MapLayerUpdates } from "@/views/GisApp/layers/MapLayerUpdates/MapLayerUpdates";
import { GraduatedClassRow } from "@/views/GisApp/panels/LayerInspector/ClassificationEditor/GraduatedControls/GraduatedClassList/GraduatedClassRow";
import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import type { LayerChangeHandler } from "@/views/GisApp/panels/LayerInspector/LayerInspector";
import type { ReactNode } from "react";

type Props = {
  layer: MapLayer.T;
  color: Extract<MapLayer.Color, { type: "graduated" }>;
  onLayerChange: LayerChangeHandler;
};

/**
 * Edits each graduated class's color and legend label, one row per class.
 * A label left blank shows the class's generated interval in the legend.
 */
export function GraduatedClassList({
  layer,
  color,
  onLayerChange,
}: Props): ReactNode {
  const { t } = useLingui();
  return (
    <Fieldset legend={t`Class colors`} variant="unstyled">
      <Stack gap="xs">
        {color.ramp.map((classColor, classIndex) => {
          const classNumber = classIndex + 1;
          const legendBreak = layer.legend.breaks[classIndex];
          return (
            <GraduatedClassRow
              key={classIndex}
              classNumber={classNumber}
              color={classColor}
              label={color.classLabels[classIndex]}
              generatedLabel={
                legendBreak
                  ? legendBreakToLabel(legendBreak)
                  : t`Class ${classNumber}`
              }
              onColorChange={(nextColor) => {
                onLayerChange((current) => {
                  return MapLayerUpdates.withClassColor({
                    layer: current,
                    classIndex,
                    color: nextColor,
                  });
                });
              }}
              onLabelChange={(nextLabel) => {
                onLayerChange((current) => {
                  return MapLayerUpdates.withClassLabel({
                    layer: current,
                    classIndex,
                    label: nextLabel,
                  });
                });
              }}
            />
          );
        })}
      </Stack>
    </Fieldset>
  );
}
