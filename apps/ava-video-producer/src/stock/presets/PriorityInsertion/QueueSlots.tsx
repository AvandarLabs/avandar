import { QueueSlot } from "./QueueSlot";
import type { GraphicProps } from "../../graphics-common/graphicCommon.types";
import type { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { Input } from "./PriorityInsertion.schema";
import type { ReactNode } from "react";

type ParentProps = GraphicProps & {
  input: Input;
};

type Props = {
  input: Readonly<ParentProps>["input"];
  atomic: ReturnType<typeof GraphicThemeHooks.useGraphicTheme>["atomic"];
  tokens: ReturnType<typeof GraphicThemeHooks.useGraphicTokens>;
  scales: ReturnType<typeof GraphicThemeHooks.useGraphicShapeScales>;
};

/** Renders the queue slots in authored paint order. */
export function QueueSlots({
  input,
  atomic,
  tokens,
  scales,
}: Readonly<Props>): ReactNode {
  return Array.from({ length: input.queue.length + 1 }, (_, index) => {
    return (
      <QueueSlot
        key={index}
        input={input}
        atomic={atomic}
        tokens={tokens}
        scales={scales}
        index={index}
      />
    );
  });
}
