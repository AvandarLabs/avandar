import { Motion } from "../../../motion";
import { PriorityQueueItem } from "./PriorityQueueItem";
import type { GraphicProps } from "../../graphics-common/graphicCommon.types";
import type { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { Input } from "./PriorityInsertion.schema";
import type { ReactNode } from "react";

type ParentProps = GraphicProps & {
  input: Input;
};

type Props = {
  frame: Readonly<ParentProps>["frame"];
  input: Readonly<ParentProps>["input"];
  accent: Readonly<ParentProps>["accent"];
  motion: ReturnType<typeof GraphicThemeHooks.useGraphicMotion>;
  incoming: number;
  spur: number;
  insertionY: number;
};

/** Renders the incoming priority item in authored paint order. */
export function IncomingPriorityItem(options: Readonly<Props>): ReactNode {
  return (
    <PriorityQueueItem
      item={options.input.incomingItem}
      x={Motion.mix({
        t: options.incoming,
        from: 580,
        to: 100,
      })}
      y={Motion.mix({
        t: options.spur,
        from: 276,
        to: options.insertionY,
      })}
      accent={options.accent}
      opacity={options.motion.ramp(options.frame, 38, options.motion.scale(26))}
      isIncoming
    />
  );
}
