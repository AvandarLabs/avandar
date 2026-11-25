import { GraphLayout } from "../../../layout/GraphLayout";
import type { useVideoMotion } from "../../../../videoTheme/useVideoMotion";
import type { useVideoTokens } from "../../../../videoTheme/videoThemeHelpers";
import type { Point } from "../../../layout/SceneGeometry";
import type { GraphEdge } from "../../../scenes.types";
import type { ReactNode } from "react";

/** Packet radius in pixels. */
const PACKET_RADIUS = 6;
type Props = {
  frame: number;
  motion: ReturnType<typeof useVideoMotion>;
  scene: ReturnType<typeof useVideoTokens>["color"]["scene"];
  edge: GraphEdge;
  start: Point;
  end: Point;
};
/** Renders graph edge packets. */
export function GraphEdgePackets({
  frame,
  motion,
  scene,
  edge,
  start,
  end,
}: Readonly<Props>): ReactNode {
  return (
    <>
      {GraphLayout.getPacketPositions({
        frame,
        packets: edge.packets ?? [],
        start,
        end,
        motion,
      }).map((point, index) => {
        return (
          // prettier-ignore
          // Filtered packet positions occupy stateless SVG draw slots
          // inside this keyed edge. Each frame replaces every circle's
          // geometry, and circles hold no individual packet state.
          // react-doctor-disable-next-line no-array-index-as-key
          <circle key={`packet-${index}`} cx={point.x} cy={point.y} r={PACKET_RADIUS} fill={scene.brand}/>
        );
      })}
    </>
  );
}
