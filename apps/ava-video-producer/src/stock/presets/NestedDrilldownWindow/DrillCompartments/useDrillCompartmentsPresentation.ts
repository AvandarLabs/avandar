import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { DrillTiming } from "../DrillTiming";
import type { Input } from "../NestedDrilldownWindow.schema.ts";

/** Values needed to derive this visual's layout and appearance. */
type Options = { frame: number; input: Input; accent: string };

/** Layout and appearance values returned for the current frame. */
type Presentation = {
  frame: Options["frame"];
  input: Options["input"];
  accent: Options["accent"];
  groups: string[];
  progress: number;
};

/**
 * Returns parent groups and their reveal progress for `DrillContextHeading`,
 * `DrillCompartments`.
 */
export function useDrillCompartmentsPresentation({
  frame,
  input,
  accent,
}: Readonly<Options>): Presentation {
  const motion = GraphicThemeHooks.useGraphicMotion();
  const groups = [
    ...new Set(
      input.records.map((record) => {
        return record.groups[0];
      }),
    ),
  ];
  const progress = DrillTiming.getParentFromFrame({ frame, motion });
  return { frame, input, accent, groups, progress };
}
