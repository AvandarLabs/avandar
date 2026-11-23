import { Motion } from "../../../../motion";
import { DrawPath } from "../../../graphics-common/DrawPath";
import { FitText } from "../../../primitives/FitText/FitText";
import { ContrastBand } from "../ContrastBand";
import { useContrastRowPresentation } from "./useContrastRowPresentation";
import type { Input } from "../PairedContrast.schema.ts";
import type { ReactNode } from "react";

type Props = {
  row: Input["criteria"][number];
  index: number;
  frame: number;
  accent: string;
  isFocused: boolean;
  showBrackets: boolean;
};
/**
 * Paired baselines keep every criterion readable during the resolved contrast.
 */
export function ContrastRow(props: Readonly<Props>): ReactNode {
  const presentation = useContrastRowPresentation(props);

  return (
    <g
      data-criterion={props.row.id}
      opacity={presentation.entrance}
      transform={`translate(0 ${Motion.mix({ t: presentation.entrance, from: 10, to: 0 })})`}
    >
      {props.isFocused ? (
        <ContrastBand
          criterionId={props.row.id}
          y={presentation.y}
          frame={props.frame}
          accent={props.accent}
        />
      ) : null}
      {props.showBrackets ? (
        <g data-pair-bracket={props.row.id}>
          <DrawPath
            d={`M388 ${presentation.y - 24} H404 V${presentation.y + 62} H388 M572 ${presentation.y - 24} H556 V${presentation.y + 62} H572`}
            frame={props.frame}
            at={42 + presentation.stagger}
            color={presentation.tokens.color.line}
          />
        </g>
      ) : null}
      {presentation.labels.map((label, side) => {
        return (
          <g key={side} aria-label={label.text}>
            <FitText
              {...label}
              maxLines={4}
              breakLongWords
              normalizeWhitespace
              anchor="middle"
            />
          </g>
        );
      })}
    </g>
  );
}
