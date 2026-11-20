import { mix } from "../../../../motion";
import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { CustodyCheckpoint } from "../CustodyCheckpoint";
import { SceneLabel } from "../SceneLabel";
import { type Props } from "./CustodyLaneShared.types";
import { LaneTrack } from "./LaneTrack";
import { MovingContainer } from "./MovingContainer";
import type { VideoMotion } from "../../../../videoTheme/createVideoMotion/createVideoMotion";
import type { ReactNode } from "react";
/** One persistent container and three independent checkpoint facts per stop. */
export function CustodyLane({
  crate,
  index,
  frame,
  accent,
  input,
}: Readonly<Props>): ReactNode {
  const motion = GraphicThemeHooks.useGraphicMotion();
  const y = 165 + index * 50;
  return (
    <g
      data-container={crate.id}
      opacity={motion.reveal(frame, 12 + index * motion.scaleStagger(2))}
    >
      <LaneTrack y={y} />
      <SceneLabel text={crate.label} x={32} y={y - 5} width={190} lines={3} />
      {crate.checkpoints.map((checkpoint, stopIndex) => {
        return (
          <CustodyCheckpoint
            key={checkpoint.stopId}
            checkpoint={checkpoint}
            stopIndex={stopIndex}
            crateIndex={index}
            y={y}
            frame={frame}
            accent={accent}
            showMonitoring={input.showMonitoring}
          />
        );
      })}
      <MovingContainer
        crate={crate}
        x={_getContainerX({ frame, index, motion })}
        y={y}
        accent={accent}
        showIdentity={input.showIdentityRibbon}
      />
    </g>
  );
}
/** The container's position on its two legs between stops. */
function _getContainerX({
  frame,
  index,
  motion,
}: Readonly<{ frame: number; index: number; motion: VideoMotion }>): number {
  const first = motion.ramp(
    frame,
    36 + index * motion.scaleStagger(2),
    motion.scale(30),
    motion.travel.easing,
  );
  const second = motion.ramp(
    frame,
    72 + index * motion.scaleStagger(2),
    motion.scale(35),
    motion.travel.easing,
  );
  return mix(first, 280, 510) + 230 * second;
}
