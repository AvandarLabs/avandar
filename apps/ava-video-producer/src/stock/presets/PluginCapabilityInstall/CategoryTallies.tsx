import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { CategoryTally } from "./CategoryTally/CategoryTally";
import type { Input } from "./PluginCapabilityInstall.schema";
import type { ReactNode } from "react";

type Props = { input: Input; frame: number; accent: string };
/** Each retained row becomes one tally on the same eight-record ruler. */
export function CategoryTallies({
  input,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const motion = GraphicThemeHooks.useGraphicMotion();
  const hasTallies = input.installation.choice === "install" && frame >= 91;
  return (
    <g>
      {hasTallies ? (
        <g opacity={motion.reveal(frame, 91)}>
          <LabelSlots labels={[[input.copy.result, 55, 557, 840, 12, 1]]} />
        </g>
      ) : null}
      {input.categories.map((category, index) => {
        return (
          <CategoryTally
            key={category.id}
            {...{ input, category, index, frame, accent, hasTallies }}
          />
        );
      })}
    </g>
  );
}
