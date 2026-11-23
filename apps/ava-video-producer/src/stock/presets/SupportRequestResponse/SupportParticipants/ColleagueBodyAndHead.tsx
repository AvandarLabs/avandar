import { Motion } from "../../../../motion";
import { PersonGlyph } from "../../../primitives/PersonGlyph/PersonGlyph";
import type { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { Input } from "../SupportRequestResponse.schema";
import type { ReactNode } from "react";

type ParentProps = {
  input: Input;
  frame: number;
  accent: string;
};

type Props = {
  frame: Readonly<ParentProps>["frame"];
  tokens: ReturnType<typeof GraphicThemeHooks.useGraphicTokens>;
  motion: ReturnType<typeof GraphicThemeHooks.useGraphicMotion>;
  colleagueX: number;
};

/** Renders the colleague body and head in authored paint order. */
export function ColleagueBodyAndHead(options: Readonly<Props>): ReactNode {
  return (
    <>
      <PersonGlyph
        x={options.colleagueX}
        y={330}
        size={76}
        color={options.tokens.color.accentAlt}
      />
      <circle
        cx={
          options.colleagueX -
          Motion.mix({
            t: options.motion.ramp(options.frame, 43, options.motion.scale(20)),
            from: 0,
            to: 10,
          })
        }
        cy={307}
        r={2.5}
        fill={options.tokens.color.accentAlt}
      />
    </>
  );
}
