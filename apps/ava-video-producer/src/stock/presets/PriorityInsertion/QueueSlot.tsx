import { OriginalQueueSlot } from "./OriginalQueueSlot";
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
  index: number;
};

/** Renders the queue slot in authored paint order. */
export function QueueSlot({
  input,
  atomic,
  tokens,
  scales,
  index,
}: Readonly<Props>): ReactNode {
  return (
    <g key={index}>
      <OriginalQueueSlot
        input={input}
        atomic={atomic}
        tokens={tokens}
        scales={scales}
        index={index}
      />
    </g>
  );
}
