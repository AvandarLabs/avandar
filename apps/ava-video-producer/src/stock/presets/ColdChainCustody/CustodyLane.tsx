import { mix } from "../../../motion";
import { ObjectGlyph } from "../../primitives/ObjectGlyph/ObjectGlyph";
import { SketchedShape } from "../../primitives/SketchedShape";
import {
  useGraphicMotion,
  useGraphicTheme,
  useGraphicTokens,
} from "../../theme/useGraphicTheme/useGraphicTheme";
import { CustodyCheckpoint } from "./CustodyCheckpoint";
import { SceneLabel } from "./SceneLabel";
import type { VideoMotion } from "../../../videoTheme/createVideoMotion/createVideoMotion";
import type { Input } from "./ColdChainCustody.schema";
import type { ReactNode } from "react";

type Props = {
  crate: Input["crates"][number];
  index: number;
  frame: number;
  accent: string;
  input: Input;
};
/** One persistent container and three independent checkpoint facts per stop. */
export function CustodyLane({
  crate,
  index,
  frame,
  accent,
  input,
}: Readonly<Props>): ReactNode {
  const motion = useGraphicMotion();
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
        x={_getContainerX(frame, index, motion)}
        y={y}
        accent={accent}
        showIdentity={input.showIdentityRibbon}
      />
    </g>
  );
}

/** The container's position on its two legs between stops. */
function _getContainerX(
  frame: number,
  index: number,
  motion: VideoMotion,
): number {
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

/** The container itself, with its identity ribbon when shown. */
function MovingContainer({
  crate,
  x,
  y,
  accent,
  showIdentity,
}: Readonly<{
  crate: Props["crate"];
  x: number;
  y: number;
  accent: string;
  showIdentity: boolean;
}>): ReactNode {
  return (
    <g data-moving-container={crate.id} transform={`translate(${x} ${y})`}>
      <ObjectGlyph
        kind={crate.kind === "carrier" ? "resource" : "box"}
        x={0}
        y={0}
        size={26}
        color={accent}
      />
      {showIdentity ? (
        <SceneLabel text={crate.id} x={22} y={-5} width={185} lines={2} />
      ) : undefined}
    </g>
  );
}

/** The dashed track the container travels along. */
function LaneTrack({ y }: Readonly<{ y: number }>): ReactNode {
  const { atomic } = useGraphicTheme();
  const tokens = useGraphicTokens();
  return (
    <SketchedShape
      shape={{ kind: "path", d: `M280 ${y} H740` }}
      profile={tokens.sketch.shape}
      stroke={tokens.color.line}
      strokeDasharray={atomic.dash.spaced.join(" ")}
    />
  );
}
