import { isDefined } from "@avandar/utils";
import { FitText } from "../../primitives/FitText/FitText";
import type { Input } from "./HabitatCorridorReconnection.schema";
import type { ReactNode } from "react";
/** Inputs for HabitatCaptions. */
type Props = { input: Input };

/** Visible plan status and qualifications stay tied to authored content. */
export function HabitatCaptions({ input }: Readonly<Props>): ReactNode {
  const labels = [
    { text: input.copy.map, x: 32, y: 30, width: 500, maxLines: 2 },
    {
      text: input.copy[input.decision.stage],
      x: 650,
      y: 30,
      width: 278,
      maxLines: 3,
    },
    { text: input.corridor.label, x: 300, y: 137, width: 360, maxLines: 3 },
    {
      text: `${input.corridor.lengthM} × ${input.corridor.widthM}`,
      x: 300,
      y: 190,
      width: 360,
      maxLines: 2,
    },
    { text: input.copy.lengthUnit, x: 680, y: 190, width: 248, maxLines: 1 },
    { text: input.copy.crossing, x: 270, y: 221, width: 420, maxLines: 1 },
    { text: input.copy.barrier, x: 350, y: 394, width: 260, maxLines: 3 },
    { text: input.copy.disclaimer, x: 32, y: 588, width: 896, maxLines: 1 },
    input.showIllustrativeTraversal
      ? {
          text: input.copy.traversal,
          x: 32,
          y: 441,
          width: 896,
          maxLines: 1,
        }
      : undefined,
  ].filter(isDefined);
  return (
    <g>
      {labels.map(({ text, x, y, width, maxLines }, index) => (
        <FitText
          key={index}
          text={text}
          x={x}
          y={y}
          width={width}
          fontSize={12}
          maxLines={maxLines}
          breakLongWords
          normalizeWhitespace
        />
      ))}
    </g>
  );
}
