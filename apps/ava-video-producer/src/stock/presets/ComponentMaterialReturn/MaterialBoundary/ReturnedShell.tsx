import { Motion } from "../../../../motion";
import { SketchedShape } from "../../../primitives/SketchedShape";
import { OutputShell } from "./OutputShell";
import { ReturnedShellDetail } from "./ReturnedShellDetail";
import type { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { Input } from "../ComponentMaterialReturn.schema";
import type { ReactNode } from "react";

type ParentProps = {
  input: Input;
  frame: number;
  assembled: number;
};

type Props = {
  frame: Readonly<ParentProps>["frame"];
  assembled: Readonly<ParentProps>["assembled"];
  tokens: ReturnType<typeof GraphicThemeHooks.useGraphicTokens>;
  scales: ReturnType<typeof GraphicThemeHooks.useGraphicShapeScales>;
  open: number;
  isAppliance: boolean;
};

/** Renders the returned shell in authored paint order. */
export function ReturnedShell(options: Readonly<Props>): ReactNode {
  return (
    <>
      <SketchedShape
        shape={{
          kind: "path",
          d: `M50 290V335H320V290M50 290L${Motion.mix({
            t: options.open,
            from: 320,
            to: 50,
          })} ${Motion.mix({
            t: options.open,
            from: 290,
            to: 240,
          })}`,
        }}
        profile={options.tokens.sketch.shape}
        data-returned-shell="physical"
        fill="none"
        stroke={options.tokens.color.line}
        strokeWidth={options.scales.stroke(options.tokens.stroke.emphasis)}
      />
      <ReturnedShellDetail isAppliance={options.isAppliance} />
      {options.assembled > 0 ? (
        <OutputShell frame={options.frame} isAppliance={options.isAppliance} />
      ) : undefined}
    </>
  );
}
