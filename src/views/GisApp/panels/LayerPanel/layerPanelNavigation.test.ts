import { describe, expect, it } from "vitest";
import { stepLayerPanelBack } from "@/views/GisApp/panels/LayerPanel/layerPanelNavigation";

describe("stepLayerPanelBack", () => {
  it("returns to the layer list from the layer's sections", () => {
    expect(stepLayerPanelBack({ type: "sections" })).toEqual({
      page: "list",
      inspectorView: { type: "sections" },
    });
  });

  it("returns to the layer's sections from a match report", () => {
    expect(stepLayerPanelBack({ type: "matchReport" })).toEqual({
      page: "settings",
      inspectorView: { type: "sections" },
    });
  });

  it("returns to the layer's sections from classification", () => {
    expect(stepLayerPanelBack({ type: "classification" })).toEqual({
      page: "settings",
      inspectorView: { type: "sections" },
    });
  });
});
