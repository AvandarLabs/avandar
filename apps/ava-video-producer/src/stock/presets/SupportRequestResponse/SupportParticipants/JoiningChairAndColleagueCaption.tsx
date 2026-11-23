import { LabelSlots } from "../../../primitives/LabelSlots/LabelSlots";
import { StockRect } from "../../../primitives/StockRect";
import type { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { Input } from "../SupportRequestResponse.schema";
import type { ReactNode } from "react";

type ParentProps = {
  input: Input;
  frame: number;
  accent: string;
};

type Props = {
  input: Readonly<ParentProps>["input"];
  frame: Readonly<ParentProps>["frame"];
  tokens: ReturnType<typeof GraphicThemeHooks.useGraphicTokens>;
  motion: ReturnType<typeof GraphicThemeHooks.useGraphicMotion>;
  scales: ReturnType<typeof GraphicThemeHooks.useGraphicShapeScales>;
  chairX: number;
};

/** Renders the joining chair and colleague caption in authored paint order. */
export function JoiningChairAndColleagueCaption(
  options: Readonly<Props>,
): ReactNode {
  return (
    <>
      {options.input.response.state === "joins" && options.frame > 89 ? (
        <StockRect
          data-second-chair="true"
          x={options.chairX}
          y={375}
          width={55}
          height={35}
          rx={options.scales.corner(options.tokens.corner.chip)}
          stroke={options.tokens.color.accentAlt}
          fill="none"
          strokeWidth={options.scales.stroke(options.tokens.stroke.emphasis)}
          opacity={options.motion.ramp(options.frame, 89, options.motion.whip)}
        />
      ) : undefined}
      <g data-colleague-name="true">
        <LabelSlots
          labels={[[options.input.people.colleague, 700, 200, 200, 20, 4]]}
        />
      </g>
    </>
  );
}
