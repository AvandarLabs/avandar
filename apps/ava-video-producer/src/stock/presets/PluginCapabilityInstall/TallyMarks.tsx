import { propEq } from "@avandar/utils";
import { SketchedShape } from "../../primitives/SketchedShape";
import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { Input } from "./PluginCapabilityInstall.schema";
import type { ReactNode } from "react";

type Props = {
  input: Input;
  records: Input["records"];
  y: number;
  frame: number;
  accent: string;
};
/** Each retained ID contributes one staggered mark to its single category. */
export function TallyMarks({
  input,
  records,
  y,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const motion = GraphicThemeHooks.useGraphicMotion();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  return (
    <g>
      {records.map((record, index) => {
        return (
          <SketchedShape
            key={record.id}
            shape={{ kind: "path", d: `M${768 + index * 16.875} ${y - 7} v14` }}
            profile={tokens.sketch.shape}
            data-tally-record={record.id}
            stroke={accent}
            strokeWidth={scales.stroke(tokens.stroke.default)}
            opacity={motion.ramp(
              frame,
              91 + input.records.findIndex(propEq("id", record.id)) * 3,
              motion.scale(20),
            )}
          />
        );
      })}
    </g>
  );
}
