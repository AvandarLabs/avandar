import { propEq } from "@avandar/utils";
import { SketchedShape } from "../../primitives/SketchedShape";
import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { getPhrasePositionsFromSentenceParts } from "./getPhrasePositionsFromSentenceParts";
import { PhraseCopy } from "./PhraseCopy";
import { PhraseSocket } from "./PhraseSocket";
import type { Input } from "./UtteranceToModelDraft.schema";
import type { ReactNode } from "react";

type Props = {
  frame: number;
  input: Input;
  accent: string;
  item: Input["draft"]["entities"][number];
  index: number;
  x: number;
  y: number;
  role: string;
};
/** One phrase copy travels while the socket body waits at its destination. */
export function DraftSlip({
  frame,
  input,
  accent,
  item,
  index,
  x,
  y,
  role,
}: Readonly<Props>): ReactNode {
  const { atomic } = GraphicThemeHooks.useGraphicTheme();
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const motion = GraphicThemeHooks.useGraphicMotion();
  const source = getPhrasePositionsFromSentenceParts(input.sentenceParts).find(
    propEq("id", item.partId),
  )!;
  const duration = 48 / (3 + input.draft.attributes.length);
  const start = 49 + index * duration;
  return (
    <g>
      {input.showSourceGuides ? (
        <SketchedShape
          shape={{
            kind: "path",
            d: `M${source.x} ${source.y + 10} L${x} ${y}`,
          }}
          profile={tokens.sketch.shape}
          data-source-guide={item.id}
          opacity={atomic.opacity["30"] * motion.ramp(frame, start, duration)}
          stroke={tokens.color.inactive}
          fill="none"
        />
      ) : undefined}
      <PhraseCopy
        frame={frame}
        start={start}
        duration={duration}
        source={source}
        itemId={item.id}
        x={x}
        y={y}
      />
      <g
        data-model-item={item.id}
        data-source-part={item.partId}
        transform={`translate(${x} ${y})`}
        opacity={motion.ramp(frame, 97, motion.whip)}
      >
        <PhraseSocket role={role} label={item.label} accent={accent} />
      </g>
    </g>
  );
}
