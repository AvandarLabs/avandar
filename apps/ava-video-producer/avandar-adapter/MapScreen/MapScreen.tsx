import { MapFilmShell } from "./MapFilmShell/MapFilmShell";
import { MAP_BEATS, MAP_DURATION } from "./mapFixtures";
import { useMapScreen } from "./useMapScreen";
import "./setUpMapLibreWorker";
import type { ReactNode } from "react";

type Props = {
  frame: number;
  width: number;
  height: number;
};
export { MAP_BEATS, MAP_DURATION };
/**
 * Native MapLibre canvas and product map panels, driven solely by film time.
 */
export function MapScreen({
  frame,
  width,
  height,
}: Readonly<Props>): ReactNode {
  const mapState = useMapScreen({ frame, width, height });

  return (
    <div ref={mapState.root} style={{ width, height, overflow: "hidden" }}>
      <MapFilmShell {...mapState} frame={frame} />
    </div>
  );
}
export { MapScreen as Screen };
