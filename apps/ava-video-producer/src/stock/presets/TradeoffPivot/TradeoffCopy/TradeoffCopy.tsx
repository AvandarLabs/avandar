import { DrawPath } from "../../../graphics-common/DrawPath";
import { FitText } from "../../../primitives/FitText/FitText";
import { useTradeoffCopyPresentation } from "./useTradeoffCopyPresentation";
import type { Input } from "../TradeoffPivot.schema.ts";
import type { ReactNode } from "react";

type Props = { frame: number; input: Input; accent: string };
/** The authored priority appears only after both sides can be read together. */
export function TradeoffCopy(props: Readonly<Props>): ReactNode {
  const presentation = useTradeoffCopyPresentation(props);

  return (
    <g>
      {presentation.labels.map(({ opacity, ...label }, index) => {
        return (
          <g key={index} opacity={opacity} aria-label={label.text}>
            <FitText
              {...label}
              x={480}
              width={840}
              maxLines={2}
              breakLongWords
              normalizeWhitespace
              anchor="middle"
            />
          </g>
        );
      })}
      <DrawPath
        d="M330 520 H630"
        frame={props.frame}
        at={108}
        duration={12}
        color={props.accent}
      />
    </g>
  );
}
