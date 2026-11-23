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

function _primitive(primitive: EffectPrimitive, index: number): ReactNode {
  const input = index === 0 ? "SourceGraphic" : `fx${index - 1}`;
  const result = `fx${index}`;
  if (primitive.kind === "dropShadow") {
    return (
      <feDropShadow
        key={result}
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
        key={result}
        in={input}
        stdDeviation={primitive.stdDeviation}
        result={result}
      />
    );
  }
  return (
    <GlowEffect
      key={result}
      primitive={primitive}
      input={input}
      result={result}
    />
  );
}

/**
 * One SVG `<defs>` holding the filters a stock graphic's theme defines, each
 * under `buildEffectFilterId(graphicId, tokenPath)`. Renders nothing when the
 * theme defines none. Steps chain in order, so a glow wraps a drop shadow.
 */
export function VideoEffectDefs({ graphicId, filters }: Props) {
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
            {filter.primitives.map(_primitive)}
          </filter>
        );
      })}
    </defs>
  );
}
