import { StockGraphic } from "../../../stock/StockGraphic/StockGraphic";
import { ContinuityTimeline } from "../../ContinuityTimeline/ContinuityTimeline";
import type { ContinuityBeat } from "../../continuitySchema/continuitySchema";
import type { ReactNode } from "react";

type Props = {
  diagram: Extract<
    ContinuityBeat["content"],
    { kind: "composite" }
  >["diagrams"][number];
  frame: number;
  clipId: string;
};
/** Clip the requested stock artwork to its optional authored detail. */
export function FloatingDiagramGraphic({
  diagram,
  frame,
  clipId,
}: Readonly<Props>): ReactNode {
  const detail = diagram.detail;
  const cue = diagram.overlay;
  return (
    <svg
      width="100%"
      height="100%"
      viewBox={
        detail
          ? `${detail.x} ${detail.y} ${detail.width} ${detail.height}`
          : "0 0 960 600"
      }
    >
      {detail ? (
        <defs>
          <clipPath id={clipId}>
            <rect {...detail} />
          </clipPath>
        </defs>
      ) : null}
      <g clipPath={detail ? `url(#${clipId})` : undefined}>
        <StockGraphic
          {...diagram.request}
          frame={ContinuityTimeline.sampleStockFrame({
            frame: (frame - cue.at) * 3 + 36,
          })}
          width={960}
          height={600}
          transparent
        />
      </g>
    </svg>
  );
}
