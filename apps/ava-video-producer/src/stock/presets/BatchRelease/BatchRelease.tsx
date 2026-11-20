import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { BatchEnvelope } from "./BatchEnvelope";
import { BatchHeadings } from "./BatchHeadings/BatchHeadings";
import type { GraphicProps } from "../../graphics-common/graphicCommon.types";
import type { Input } from "./BatchRelease.schema";
import type { ReactNode } from "react";

type Props = GraphicProps & { input: Input };
/** Separate arrivals become intact batches that cross one dispatch boundary. */
export function BatchRelease({
  frame,
  input,
  accent,
}: Readonly<Props>): ReactNode {
  const motion = GraphicThemeHooks.useGraphicMotion();
  return (
    <g opacity={motion.reveal(frame, 12)}>
      <BatchHeadings input={input} />
      {input.batches.map((batch, index) => {
        return (
          <BatchEnvelope
            key={batch.id}
            batch={batch}
            index={index}
            input={input}
            frame={frame}
            accent={accent}
          />
        );
      })}
    </g>
  );
}
