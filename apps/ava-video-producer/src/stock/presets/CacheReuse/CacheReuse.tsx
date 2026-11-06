import { ramp } from "../../../motion";
import { STOCK } from "../../stockPalette";
import { CacheCaptions } from "./CacheCaptions";
import { CacheLookupToken } from "./CacheLookupToken";
import { CacheParticipants } from "./CacheParticipants";
import { CacheResponse } from "./CacheResponse";
import { CacheStoredEntry } from "./CacheStoredEntry";
import { getCacheJourneyFromFrame } from "./getCacheJourneyFromFrame";
import type { GraphicProps } from "../../graphics-common";
import type { Input } from "./CacheReuse.schema";
import type { ReactNode } from "react";

type Props = GraphicProps & { input: Input };
/** An initial miss populates a keyed shelf that alone answers the repeat. */
export function CacheReuse({
  frame,
  input,
  accent,
}: Readonly<Props>): ReactNode {
  const state = getCacheJourneyFromFrame(frame);
  return (
    <g opacity={ramp(frame, 12, 12)}>
      <CacheCaptions frame={frame} input={input} accent={accent} />
      <path
        d="M190 290 H650 V440"
        fill="none"
        stroke={STOCK.line}
        strokeWidth={2}
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
