import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { getMaterialItemsFromInput } from "../getMaterialItemsFromInput";
import { getMaterialPlacementFromInputAndFrame } from "../getMaterialPlacementFromInputAndFrame";
import { MaterialPart } from "./MaterialPart";
import type { Input } from "../ComponentMaterialReturn.schema";
import type { ReactNode } from "react";

type Props = { input: Input; frame: number };
/** Stable numbered components retain source identity in all destinations. */
export function MaterialParts({ input, frame }: Readonly<Props>): ReactNode {
  const motion = GraphicThemeHooks.useGraphicMotion();
  return (
    <g>
      {getMaterialItemsFromInput(input).map((item, index) => {
        const point = getMaterialPlacementFromInputAndFrame({
          motion,
          input,
          index,
          frame,
        });
        return (
          <MaterialPart key={item.id} item={item} index={index} point={point} />
        );
      })}
    </g>
  );
}
