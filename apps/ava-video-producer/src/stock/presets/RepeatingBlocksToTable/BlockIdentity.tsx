import { EASE, mix, ramp } from "../../../motion";
import { STOCK } from "../../stockPalette";
import { BlockCaption } from "./BlockCaption";
import type { Input } from "./RepeatingBlocksToTable.schema";
import type { ReactNode } from "react";

type Props = { input: Input; frame: number; accent: string; index: number };
/** Source block headings retain their identities beside the resulting rows. */
export function BlockIdentity({
  input,
  frame,
  accent,
  index,
}: Readonly<Props>): ReactNode {
  const duration = 9 / input.blocks.length,
    departure = 96 + (input.blocks.length - 1 - index) * duration;
  const color = [accent, STOCK.cyan, STOCK.orange][index];
  const poses = [
    {
      x: 52 + index * 294,
      y: 135,
      width: 268,
      opacity: 1 - ramp(frame, 96, 9),
    },
    {
      x: 52,
      y: mix(
        ramp(frame, departure, duration - 0.5, EASE.inOut),
        210,
        280 + index * 112,
      ),
      width: 224,
      opacity: ramp(frame, departure, 0.5),
    },
  ];
  return (
    <g data-output-block={input.blocks[index].id}>
      {poses.map((pose, poseIndex) => (
        <BlockCaption
          key={poseIndex}
          {...pose}
          heading={input.blocks[index].heading}
          index={index}
          showBlockNumbers={input.showBlockNumbers}
          accent={color}
        />
      ))}
    </g>
  );
}
