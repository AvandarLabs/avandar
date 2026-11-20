import {
  buildEffectFilterId,
  type EffectPrimitive,
  type VideoEffectFilter,
} from "../videoEffectFilterHelpers/videoEffectFilterHelpers";
import { GlowEffect } from "./GlowEffect";
import type { ReactNode } from "react";

type Props = Readonly<{
  graphicId: string;
  filters: readonly VideoEffectFilter[];
}>;

type KeyedPrimitive = Readonly<{
  key: string;
  primitive: EffectPrimitive;
  input: string;
  result: string;
}>;

function _buildKeyedPrimitives(
  primitives: readonly EffectPrimitive[],
): KeyedPrimitive[] {
  const counts = new Map<string, number>();
  return primitives.map((primitive, stepOffset) => {
    const occurrence = counts.get(primitive.kind) ?? 0;
    counts.set(primitive.kind, occurrence + 1);
    return {
      key: `${primitive.kind}-${occurrence}`,
      primitive,
      input: stepOffset === 0 ? "SourceGraphic" : `fx${stepOffset - 1}`,
      result: `fx${stepOffset}`,
    };
  });
}

function _primitive({
  key,
  primitive,
  input,
  result,
}: KeyedPrimitive): ReactNode {
  if (primitive.kind === "dropShadow") {
    return (
      <feDropShadow
        key={key}
        dx={primitive.dx}
        dy={primitive.dy}
        stdDeviation={primitive.stdDeviation}
        floodColor={primitive.color}
        floodOpacity={primitive.opacity}
        in={input}
        result={result}
      />
    );
  }
  if (primitive.kind === "blur") {
    return (
      <feGaussianBlur
        key={key}
        in={input}
        stdDeviation={primitive.stdDeviation}
        result={result}
      />
    );
  }
  return (
    <GlowEffect key={key} primitive={primitive} input={input} result={result} />
  );
}

/**
 * One SVG `<defs>` holding the filters a stock graphic's theme defines, each
 * under `buildEffectFilterId(graphicId, tokenPath)`. Renders nothing when the
 * theme defines none. Steps chain in order, so a glow wraps a drop shadow.
 */
export function VideoEffectDefs({ graphicId, filters }: Props): ReactNode {
  if (filters.length === 0) {
    return null;
  }
  return (
    <defs>
      {filters.map((filter) => {
        return (
          <filter
            key={filter.path}
            id={buildEffectFilterId(graphicId, filter.path)}
            x="-50%"
            y="-50%"
            width="200%"
            height="200%"
            colorInterpolationFilters="sRGB"
          >
            {_buildKeyedPrimitives(filter.primitives).map(_primitive)}
          </filter>
        );
      })}
    </defs>
  );
}
