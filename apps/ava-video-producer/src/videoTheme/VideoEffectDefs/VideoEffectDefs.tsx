import { Fragment, type ReactNode } from "react";
import {
  buildEffectFilterId,
  type EffectPrimitive,
  type VideoEffectFilter,
} from "../videoEffectFilters/videoEffectFilters";

type Props = Readonly<{
  graphicId: string;
  filters: readonly VideoEffectFilter[];
}>;

type GlowPrimitive = Extract<EffectPrimitive, { kind: "glow" }>;

function _glow(
  primitive: GlowPrimitive,
  input: string,
  result: string,
): ReactNode {
  return (
    <Fragment key={result}>
      <feGaussianBlur
        in="SourceAlpha"
        stdDeviation={primitive.stdDeviation}
        result={`${result}-blur`}
      />
      <feFlood
        floodColor={primitive.color}
        floodOpacity={primitive.opacity}
        result={`${result}-flood`}
      />
      <feComposite
        in={`${result}-flood`}
        in2={`${result}-blur`}
        operator="in"
        result={`${result}-glow`}
      />
      <feMerge result={result}>
        <feMergeNode in={`${result}-glow`} />
        <feMergeNode in={input} />
      </feMerge>
    </Fragment>
  );
}

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
  return _glow(primitive, input, result);
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
