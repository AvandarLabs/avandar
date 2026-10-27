import { STOCK } from "../../stockPalette";
import type { getJigSceneFromFrame } from "./getJigSceneFromFrame";
import type { Input } from "./SharedJigPreparation.schema";
import type { ReactNode } from "react";

type Props = { input: Input; scene: ReturnType<typeof getJigSceneFromFrame> };
/**
 * The collaborator's marking hand and tool contact the selected open cutout.
 */
export function JigMarkingHand({ input, scene }: Readonly<Props>): ReactNode {
  const index = scene.activeIndex;
  if (index < 0 || scene.guideX !== scene.centers[index] - 50) {
    return null;
  }
  const x = scene.centers[index];
  const handX =
    scene.guideX + (input.guide.pattern === "corner-mark" ? 11 : 70);
  const handY =
    scene.guideY + (input.guide.pattern === "corner-mark" ? 11 : 32);
  const tool =
    input.guide.pattern === "corner-mark"
      ? `M${handX - 10} ${handY - 10} L${scene.guideX + 22} ${scene.guideY + 22}`
      : `M${handX + 10} ${handY - 18} L${handX} ${handY}`;
  return (
    <g>
      <path
        data-marking-arm={input.collaborators[index].id}
        d={`M${x + 10} 280 L${x + 30} 310 L${handX} ${handY}`}
        fill="none"
        stroke={STOCK.cyan}
        strokeWidth={3}
      />
      <path
        data-marking-tool={input.collaborators[index].id}
        d={tool}
        stroke={STOCK.text}
        strokeWidth={3}
        strokeLinecap="round"
      />
      <circle
        data-marking-hand={input.collaborators[index].id}
        cx={handX}
        cy={handY}
        r={5}
        fill={STOCK.cyan}
      />
    </g>
  );
}
