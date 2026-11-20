import { SketchedShape } from "../../primitives/SketchedShape";
import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { CacheCaptions } from "./CacheCaptions";
import { CacheLookupToken } from "./CacheLookupToken/CacheLookupToken";
import { CacheParticipants } from "./CacheParticipants";
import { CacheResponse } from "./CacheResponse";
import { CacheStoredEntry } from "./CacheStoredEntry/CacheStoredEntry";
import { getCacheJourneyFromFrame } from "./getCacheJourneyFromFrame";
import type { GraphicProps } from "../../graphics-common/graphicCommon.types";
import type { Input } from "./CacheReuse.schema";
import type { ReactNode } from "react";

type Props = GraphicProps & { input: Input };
/** An initial miss populates a keyed shelf that alone answers the repeat. */
export function CacheReuse({
  frame,
  input,
  accent,
}: Readonly<Props>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  const motion = GraphicThemeHooks.useGraphicMotion();
  const state = getCacheJourneyFromFrame({ frame, motion });
  return (
    <g opacity={motion.reveal(frame, 12)}>
      <CacheCaptions frame={frame} input={input} accent={accent} />
      <SketchedShape
        shape={{ kind: "path", d: "M190 290 H650 V440" }}
        profile={tokens.sketch.shape}
        fill="none"
        stroke={tokens.color.line}
        strokeWidth={scales.stroke(tokens.stroke.default)}
      />
      <CacheParticipants
        input={input}
        originActive={state.originActive}
        accent={accent}
      />
      {frame >= 68 ? (
        <CacheStoredEntry
          input={input}
          opacity={state.stored}
          accent={accent}
        />
      ) : undefined}
      <CacheLookupToken
        x={state.x}
        y={state.y}
        frame={frame}
        input={input}
        accent={accent}
      />
      <CacheResponse input={input} opacity={state.response} />
    </g>
  );
}
