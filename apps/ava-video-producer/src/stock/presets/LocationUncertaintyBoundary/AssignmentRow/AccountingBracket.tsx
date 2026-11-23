import { Motion } from "../../../../motion";
import { SketchedShape } from "../../../primitives/SketchedShape";
import type { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { getAssignmentsFromLocations } from "../getAssignmentsFromLocations";
import type { ReactNode } from "react";

type ParentProps = {
  location: ReturnType<typeof getAssignmentsFromLocations>[number];
  index: number;
  frame: number;
  accent: string;
  isFocused: boolean;
};

type Props = {
  location: Readonly<ParentProps>["location"];
  index: Readonly<ParentProps>["index"];
  frame: Readonly<ParentProps>["frame"];
  accent: Readonly<ParentProps>["accent"];
  tokens: ReturnType<typeof GraphicThemeHooks.useGraphicTokens>;
  motion: ReturnType<typeof GraphicThemeHooks.useGraphicMotion>;
};

/** Renders the accounting bracket in authored paint order. */
export function AccountingBracket(options: Readonly<Props>): ReactNode {
  return (
    <SketchedShape
      shape={{
        kind: "path",
        d: `M${
          options.location.district < 0
            ? Motion.mix({
                t: options.motion.ramp(
                  options.frame,
                  72,
                  options.motion.scale(36),
                ),
                from: 850,
                to: 880,
              })
            : 850
        } ${318 + options.index * 31}h12v20h-12`,
      }}
      profile={options.tokens.sketch.shape}
      data-accounting-bracket={options.location.id}
      fill="none"
      stroke={options.accent}
    />
  );
}
