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
  insertion: number;
  shift: number;
};

/** Renders the queued priority items in authored paint order. */
export function QueuedPriorityItems(options: Readonly<Props>): ReactNode {
  return (
    <>
      {options.input.queue.map((item, index) => {
        return (
          <PriorityQueueItem
            key={item.id}
            item={item}
            x={100}
            y={
              190 +
              58 * (index + (index >= options.insertion ? options.shift : 0))
            }
            accent={options.accent}
            opacity={options.motion.ramp(
              options.frame,
              12 + index * options.motion.stagger.list,
              options.motion.hero,
            )}
          />
        );
      })}
    </>
  );
}
