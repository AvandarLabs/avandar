import { ramp } from "../../../motion";
import { FitText } from "../../primitives/FitText/FitText";
import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { WeaveCrossing } from "./WeaveCrossing";
import type { Input } from "./ContributionWeave.schema";
import type { ReactNode } from "react";

type Props = {
  contributor: Input["weft"][number];
  index: number;
  input: Input;
  frame: number;
  id: string;
};
/** Frames one shuttle pass takes, which also spaces the passes. */
const PASS_FRAMES = 24;
/** Frames a weft band takes to fade in. */
const FADE_FRAMES = 10;
/** A single clipped shuttle pass reveals alternating over-under patches. */
export function WeaveShuttle({
  contributor,
  index,
  input,
  frame,
  id,
}: Readonly<Props>): ReactNode {
  const motion = GraphicThemeHooks.useGraphicMotion();
  const y = 240 + (index * 180) / (input.weft.length - 1);
  const progress = ramp(
    frame,
    36 + index * motion.scale(PASS_FRAMES),
    motion.scale(PASS_FRAMES),
    motion.travel.easing,
  );
  const pattern = `url(#${id}-band-${input.warp.length + index})`;
  const clipId = `${id}-shuttle-${index}`;
  const band = { x: 330, y: y - 24, width: 530 * progress, height: 48 };
  const end = { x: 300, y: y - 24, width: 30, height: 48, fill: pattern };
  const label = {
    text: contributor.label,
    x: 40,
    y: y - 3,
    width: 240,
    fontSize: 12 as const,
    maxLines: 3,
    breakLongWords: true,
    normalizeWhitespace: true,
  };
  const crossingProps = { row: index, weft: contributor, input, id, y };
  return (
    <g
      opacity={ramp(
        frame,
        20 + index * motion.stagger.list,
        motion.scale(FADE_FRAMES),
        motion.reveal.easing,
      )}
    >
      <defs>
        <clipPath id={clipId}>
          <rect {...band} />
        </clipPath>
      </defs>
      <rect data-weft-band={contributor.id} {...band} fill={pattern} />
      <g clipPath={`url(#${clipId})`}>
        {input.warp.map((warp, column) => {
          return (
            <WeaveCrossing
              key={warp.id}
              warp={warp}
              column={column}
              {...crossingProps}
            />
          );
        })}
      </g>
      {input.showContributorEnds ? (
        <rect data-contributor-end={contributor.id} {...end} />
      ) : undefined}
      {input.showLabels ? <FitText {...label} /> : undefined}
    </g>
  );
}
