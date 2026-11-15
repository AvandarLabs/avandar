import { ramp } from "../../../motion";
import { FitText } from "../../primitives/FitText/FitText";
import type { Input } from "./ContributionWeave.schema";
import type { ReactNode } from "react";

type Props = {
  contributor: Input["warp"][number];
  index: number;
  numWarp: number;
  input: Input;
  frame: number;
  id: string;
};
/** Each vertical contribution tensions once and retains its own outer end. */
export function WeaveWarp({
  contributor,
  index,
  numWarp,
  input,
  frame,
  id,
}: Readonly<Props>): ReactNode {
  const x = 400 + (index * 400) / (numWarp - 1);
  const band = {
    x: x - 24,
    y: 180,
    width: 48,
    height: 300 * ramp(frame, 18 + index * 2, 14),
    fill: `url(#${id}-band-${index})`,
  };
  const end = { ...band, y: 150, height: 30 };
  const label = {
    text: contributor.label,
    x,
    y: 88,
    width: 190,
    fontSize: 12 as const,
    maxLines: 3,
    anchor: "middle" as const,
    breakLongWords: true,
    normalizeWhitespace: true,
  };
  return (
    <g opacity={ramp(frame, 14 + index * 2, 10)}>
      <rect data-warp-band={contributor.id} {...band} />
      {input.showContributorEnds ? (
        <rect data-contributor-end={contributor.id} {...end} />
      ) : undefined}
      {input.showLabels ? <FitText {...label} /> : undefined}
    </g>
  );
}
