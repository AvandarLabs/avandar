import { Button, ColorInput, Text } from "@mantine/core";
import { InspectorSection } from "@/views/GisApp/panels/LayerInspector/InspectorSection/InspectorSection";
import { CircleRadiusControl } from "@/views/GisApp/panels/LayerInspector/StyleSection/CircleRadiusControl";
import { StrokeControls } from "@/views/GisApp/panels/LayerInspector/StyleSection/StrokeControls";
import { SymbologyOptions } from "@/views/GisApp/panels/LayerInspector/StyleSection/SymbologyOptions/SymbologyOptions";
import symbologyCss from "@/views/GisApp/panels/LayerInspector/StyleSection/SymbologyTypeControl/SymbologyTypeControl.module.css";
import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import type { ReactNode } from "react";

type Props = { symbology: Extract<MapLayer.Symbology, { type: "circle" }> };
const _noop = () => {
  return undefined;
};
/** Render the product point symbology controls over the selected fixture. */
export function PointStyleSection({ symbology }: Readonly<Props>): ReactNode {
  return (
    <InspectorSection title="Style" defaultOpen>
      <div>
        <Text component="span" size="xs" fw={500}>
          Symbol
        </Text>
        <div
          className={symbologyCss.symbologyTypeControlGroup}
          role="group"
          aria-label="Symbol"
        >
          <SymbologyOptions
            activeType="circle"
            labels={{
              circle: "Point",
              proportionalSymbol: "Sized",
              cluster: "Cluster",
              heatmap: "Heat",
            }}
            isOptionAvailable={() => {
              return true;
            }}
            onTypeChange={_noop}
          />
        </div>
      </div>
      <ColorInput
        label="Color"
        format="hex"
        value={symbology.color.type === "single" ? symbology.color.color : ""}
        onChange={_noop}
      />
      <Button variant="subtle">Edit classification</Button>
      <CircleRadiusControl symbology={symbology} onLayerChange={_noop} />
      <StrokeControls stroke={symbology.stroke} onLayerChange={_noop} />
    </InspectorSection>
  );
}
