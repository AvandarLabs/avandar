import { DrawPath } from "../../graphics-common";
import { TradeoffCopy } from "./TradeoffCopy";
import { TradeoffLeaf } from "./TradeoffLeaf";
import type { GraphicProps } from "../../graphics-common";
import type { Input } from "./TradeoffPivot.schema";
import type { ReactNode } from "react";
/** Frame-controlled qualitative tradeoff with an authored priority. */
export type Props = GraphicProps & { input: Input };
/**
 * One qualitative choice holds its benefits, concessions and authored priority.
 */
export function TradeoffPivot({
  frame,
  accent,
  input,
}: Readonly<Props>): ReactNode {
  return (
    <g>
      <TradeoffCopy {...{ frame, accent, input }} />
      <DrawPath
        d="M480 152 V498"
        frame={frame}
        at={18}
        color={accent}
        width={3}
      />
      <TradeoffLeaf {...{ frame, accent, input }} side="gain" />
      <TradeoffLeaf {...{ frame, accent, input }} side="concession" />
    </g>
  );
}
