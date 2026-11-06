import { Button, ColorInput, Select, Text } from "@mantine/core";
import { InspectorSection } from "@/views/GisApp/panels/LayerInspector/InspectorSection/InspectorSection";
import inspectorCss from "@/views/GisApp/panels/LayerInspector/LayerInspectorBody/LayerInspectorBody.module.css";
import { LayerLeadStatus } from "@/views/GisApp/panels/LayerInspector/LayerLeadStatus/LayerLeadStatus";
import { LegendSection } from "@/views/GisApp/panels/LayerInspector/LegendSection/LegendSection";
import { SensitivitySection } from "@/views/GisApp/panels/LayerInspector/SensitivitySection/SensitivitySection";
import { CircleRadiusControl } from "@/views/GisApp/panels/LayerInspector/StyleSection/CircleRadiusControl";
import { StrokeControls } from "@/views/GisApp/panels/LayerInspector/StyleSection/StrokeControls";
import { SymbologyOptions } from "@/views/GisApp/panels/LayerInspector/StyleSection/SymbologyOptions/SymbologyOptions";
import symbologyCss from "@/views/GisApp/panels/LayerInspector/StyleSection/SymbologyTypeControl/SymbologyTypeControl.module.css";
import { MapChromePanel } from "@/views/GisApp/shell/MapChromePanel/MapChromePanel";
import { viewStates } from "./mapFixtures";
import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";

const _noop = () => undefined;

/** The real layer inspector panel: product data/style/sensitivity sections over an immutable fixture layer. */
export function PointInspector({
  layer,
  frame,
}: {
  layer: MapLayer.T;
  frame: number;
}) {
  const isDataOpen = frame < 208;
  const symbology = layer.symbology as Extract<
    MapLayer.Symbology,
    { type: "circle" }
  >;
  // DataSection's actual control ordering and Mantine controls. Its data
  // clients are replaced by immutable CSV columns at this adapter boundary.
  return (
    <MapChromePanel
      variant="inspector"
      id="gis-inspector"
      title="Layer"
      isCollapsed={false}
      onToggleCollapsed={_noop}
      collapseLabel="Collapse the layer panel"
      expandLabel="Expand the layer panel"
    >
      <div className={inspectorCss.layerInspectorBodyLead}>
        <h3 className={inspectorCss.layerInspectorBodyLeadName}>
          {layer.name}
        </h3>
        <LayerLeadStatus viewState={viewStates.get(layer.id)} />
      </div>
      <div>
        <InspectorSection
          key={String(isDataOpen)}
          title="Data"
          defaultOpen={isDataOpen}
        >
          <Select
            label="Source"
            value={layer.id}
            data={[{ value: layer.id, label: layer.name }]}
            onChange={_noop}
          />
          <Select
            label="Geometry"
            value="latLngColumns"
            data={[
              {
                value: "latLngColumns",
                label: "Latitude and longitude columns",
              },
            ]}
            allowDeselect={false}
            onChange={_noop}
          />
          <Select
            label="Latitude"
            placeholder="Select a column"
            value="latitude"
            data={["latitude", "longitude"]}
            searchable
            clearable
            onChange={_noop}
          />
          <Select
            label="Longitude"
            placeholder="Select a column"
            value="longitude"
            data={["latitude", "longitude"]}
            searchable
            clearable
            onChange={_noop}
          />
          <Select
            label="Time column"
            placeholder="Select a column"
            value={null}
            data={[]}
            clearable
            onChange={_noop}
          />
        </InspectorSection>
      </div>
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
              isOptionAvailable={() => true}
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
      <SensitivitySection layer={layer} onLayerChange={_noop} />
      <InspectorSection title="Filter">
        <span />
      </InspectorSection>
      <InspectorSection title="Popup" note="All fields">
        <span />
      </InspectorSection>
      <LegendSection layer={layer} onLayerChange={_noop} />
    </MapChromePanel>
  );
}
