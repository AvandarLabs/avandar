import { LiteralDataText } from "../../../primitives/LiteralDataText/LiteralDataText";
import { SketchedShape } from "../../../primitives/SketchedShape";
import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { type Props } from "./CacheStoredEntryShared.types";
import { StoredEntryLabel } from "./StoredEntryLabel";
import type { ReactNode } from "react";
/**
 * The persistent keyed shelf entry remains after the first response returns.
 */
export function CacheStoredEntry({
  input,
  opacity,
  accent,
}: Readonly<Props>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
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
      <StoredEntryLabel input={input} accent={accent} />
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
