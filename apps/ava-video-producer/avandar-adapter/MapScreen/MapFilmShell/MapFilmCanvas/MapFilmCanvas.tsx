import { MapCanvasSurface } from "@/views/GisApp/MapCanvas/MapCanvasSurface/MapCanvasSurface";
import css from "./MapFilmCanvas.module.css";
import type { useMapScreen } from "../../useMapScreen";
import type { ReactNode } from "react";

type Props = Pick<
  ReturnType<typeof useMapScreen>,
  "controller" | "pointTarget"
>;
/** Mount the native canvas and its measured facility-pointer target. */
export function MapFilmCanvas({
  controller,
  pointTarget,
}: Readonly<Props>): ReactNode {
  return (
    <>
      <MapCanvasSurface containerRef={controller.containerRef} />
      <span
        ref={pointTarget}
        data-video-target="map-facility-point"
        data-video-canvas-target="true"
        className={css.mapFilmCanvasFacilityPointTarget}
      />
    </>
  );
}
