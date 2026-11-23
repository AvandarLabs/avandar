import { DrawerHeight } from "@/components/CanvasDrawer/DrawerHeight/DrawerHeight";
import { FeatureInspector } from "@/views/GisApp/panels/FeatureInspector/FeatureInspector";
import { Motion } from "../../src/motion";
import { selectedFacility, facilityLayer } from "./mapFixtures";
import type { useMapScreen } from "./useMapScreen";
import type { ReactNode } from "react";

type Props = Pick<
  ReturnType<typeof useMapScreen>,
  "surface" | "mapInstance"
> & { frame: number };
const _noop = () => {
  return undefined;
};
/** Render the native map selected-feature drawer at its authored entrance. */
export function MapFilmFeatureDrawer({
  frame,
  surface,
  mapInstance,
}: Readonly<Props>): ReactNode {
  return frame >= 548 ? (
    <div
      style={{
        maxHeight:
          (DrawerHeight.DEFAULT_HEIGHT + 32) *
          Motion.ramp({
            frame,
            at: 548,
            dur: 13,
          }),
        overflow: "hidden",
      }}
    >
      <FeatureInspector
        opened
        onClose={_noop}
        feature={selectedFacility}
        cluster={undefined}
        layer={facilityLayer}
        canvasRef={surface}
        mapRef={mapInstance.mapRef}
        onRowClick={_noop}
        onBackToTable={_noop}
      />
    </div>
  ) : null;
}
