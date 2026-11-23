import { FitText } from "../../../primitives/FitText/FitText";
import { SketchedShape } from "../../../primitives/SketchedShape";
import { UncertaintyAxisMaximum } from "./UncertaintyAxisMaximum";
import { UncertaintyContextLabel } from "./UncertaintyContextLabel";
import { useUncertaintyAxisPresentation } from "./useUncertaintyAxisPresentation";
import type { Input } from "../UncertaintyUnfold.schema.ts";
import type { ReactNode } from "react";
/** Authored context and labels for the fixed uncertainty ruler. */
export type Props = { input: Input };
/** Renders static context and finite ruler endpoints. */
export function UncertaintyAxis(props: Readonly<Props>): ReactNode {
  const presentation = useUncertaintyAxisPresentation(props);

  return (
    <>
      <UncertaintyContextLabel {...presentation} />
      <FitText
        text={props.input.estimate.label}
        x={100}
        y={128}
        width={760}
        fontSize={20}
        maxLines={2}
        breakLongWords
        normalizeWhitespace
      />
      <SketchedShape
        shape={{ kind: "path", d: "M100 300 H860 M100 288 V312 M860 288 V312" }}
        profile={presentation.tokens.sketch.shape}
        stroke={presentation.tokens.color.line}
        strokeWidth={presentation.scales.stroke(
          presentation.tokens.stroke.default,
        )}
      />
      <FitText
        text={String(props.input.axis.min)}
        x={100}
        y={238}
        width={200}
        fontSize={12}
        maxLines={2}
        breakLongWords
        normalizeWhitespace
        color={presentation.tokens.color.textMuted}
      />
      <UncertaintyAxisMaximum {...presentation} />
    </>
  );
}
