import { FitText } from "../../primitives/FitText/FitText";
import { LiteralDataText } from "../../primitives/LiteralDataText/LiteralDataText";
import { SketchedShape } from "../../primitives/SketchedShape";
import {
  useGraphicShapeScales,
  useGraphicTokens,
} from "../../theme/useGraphicTheme/useGraphicTheme";
import type { Input } from "./CacheReuse.schema";
import type { ReactNode } from "react";

type Props = { input: Input; opacity: number; accent: string };
/**
 * The persistent keyed shelf entry remains after the first response returns.
 */
export function CacheStoredEntry({
  input,
  opacity,
  accent,
}: Readonly<Props>): ReactNode {
  const tokens = useGraphicTokens();
  const scales = useGraphicShapeScales();
  return (
    <g
      data-stored-entry={input.request.key}
      data-stored-value={input.result.value}
      opacity={opacity}
    >
      <SketchedShape
        shape={{ kind: "path", d: "M430 338 H890" }}
        profile={tokens.sketch.shape}
        stroke={accent}
        strokeWidth={scales.stroke(tokens.stroke.emphasis)}
      />
      <LiteralDataText
        value={input.request.key}
        x={430}
        y={245}
        color={accent}
      />
      <FitText
        text={input.result.label}
        x={430}
        y={275}
        width={450}
        fontSize={16}
        maxLines={2}
        normalizeWhitespace
        breakLongWords
      />
      {input.showStoredValue ? (
        <LiteralDataText
          value={input.result.value}
          x={430}
          y={325}
          color={tokens.color.text}
        />
      ) : undefined}
    </g>
  );
}
