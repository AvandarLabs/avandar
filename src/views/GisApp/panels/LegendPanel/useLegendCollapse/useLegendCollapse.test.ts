import { describe, expect, it, vi } from "vitest";
import { uuid } from "$/lib/uuid";
import { act, renderHook } from "@/test-utils";
import { useLegendCollapse } from "@/views/GisApp/panels/LegendPanel/useLegendCollapse/useLegendCollapse";
import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";

type HookProps = {
  isPanelCollapsed: boolean;
  openFeatureListLayerId: MapLayer.Id | undefined;
};

function _renderLegendCollapse(
  initialProps: HookProps,
  onTogglePanel = vi.fn(),
) {
  return renderHook(
    (props: HookProps) => {
      return useLegendCollapse({ ...props, onTogglePanel });
    },
    { initialProps },
  );
}

describe("useLegendCollapse", () => {
  it("follows the saved panel state while no feature list is open", () => {
    const onTogglePanel = vi.fn();
    const { result } = _renderLegendCollapse(
      { isPanelCollapsed: false, openFeatureListLayerId: undefined },
      onTogglePanel,
    );

    expect(result.current.isCollapsed).toBe(false);
    act(() => {
      result.current.onToggleCollapsed();
    });
    expect(onTogglePanel).toHaveBeenCalledOnce();
  });

  it("collapses while a feature list is open, without saving it", () => {
    const onTogglePanel = vi.fn();
    const { result, rerender } = _renderLegendCollapse(
      { isPanelCollapsed: false, openFeatureListLayerId: undefined },
      onTogglePanel,
    );

    rerender({
      isPanelCollapsed: false,
      openFeatureListLayerId: uuid<MapLayer.Id>(),
    });

    expect(result.current.isCollapsed).toBe(true);
    expect(onTogglePanel).not.toHaveBeenCalled();
  });

  it("expands over an open list on request, then follows the panel again", () => {
    const onTogglePanel = vi.fn();
    const layerId = uuid<MapLayer.Id>();
    const { result, rerender } = _renderLegendCollapse(
      { isPanelCollapsed: false, openFeatureListLayerId: layerId },
      onTogglePanel,
    );

    act(() => {
      result.current.onToggleCollapsed();
    });
    expect(result.current.isCollapsed).toBe(false);
    expect(onTogglePanel).not.toHaveBeenCalled();

    rerender({ isPanelCollapsed: true, openFeatureListLayerId: undefined });
    expect(result.current.isCollapsed).toBe(true);
  });
});
