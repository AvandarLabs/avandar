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
  tokens: ReturnType<typeof GraphicThemeHooks.useGraphicTokens>;
  scales: ReturnType<typeof GraphicThemeHooks.useGraphicShapeScales>;
  subgroups: string[];
  parent: number;
  child: number;
  parentX: number;
  hasChild: boolean;
};

/**
 * Returns selected parent and child frames, subgroup labels, and theme values
 * for `DrillSelectionWindow`, `DrillParentSelectionFrame`.
 */
export function useDrillSelectionWindowPresentation({
  frame,
  input,
  accent,
}: Readonly<Options>): Presentation {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  const motion = GraphicThemeHooks.useGraphicMotion();
  const parentGroups = [
    ...new Set(
      input.records.map((record) => {
        return record.groups[0];
      }),
    ),
  ];
  const subgroups = [
    ...new Set(
      input.records
        .filter((record) => {
          return record.groups[0] === input.selectionPath[0];
        })
        .map((record) => {
          return record.groups[1];
        }),
    ),
  ];
  const parent = DrillTiming.getParentFromFrame({ frame, motion });
  const child = DrillTiming.getChildFromFrame({ frame, motion });
  const parentX = 44 + parentGroups.indexOf(input.selectionPath[0]) * 292;
  const hasChild = input.selectionPath.length === 2;
  return {
    frame,
    input,
    accent,
    tokens,
    scales,
    subgroups,
    parent,
    child,
    parentX,
    hasChild,
  };
}
