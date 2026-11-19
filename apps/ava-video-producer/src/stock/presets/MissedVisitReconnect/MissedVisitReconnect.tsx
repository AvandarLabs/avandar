import { mix } from "../../../motion";
import { PersonGlyph } from "../../primitives/PersonGlyph/PersonGlyph";
import { useGraphicMotion } from "../../theme/useGraphicTheme/useGraphicTheme";
import { ReconnectCase } from "./ReconnectCase";
import { ReconnectLedger } from "./ReconnectLedger";
import { ReconnectSetting } from "./ReconnectSetting";
import type { GraphicProps } from "../../graphics-common/graphicCommon.types";
import type { Input } from "./MissedVisitReconnect.schema";
import type { ReactNode } from "react";

type Props = GraphicProps & { input: Input };
/** A worker contacts the fixed group; only attended people enter the clinic. */
export function MissedVisitReconnect({
  frame,
  accent,
  input,
}: Readonly<Props>): ReactNode {
  const motion = useGraphicMotion();
  const workerPosition = input.cases.reduce((position, _, index) => {
    return mix(
      motion.ramp(frame, 39 + index * 9, motion.scale(7), motion.travel.easing),
      position,
      160 + index * 48,
    );
  }, 160);
  return (
    <g>
      <ReconnectSetting input={input} />
      {input.cases.map((item, index) => {
        return (
          <ReconnectCase
            key={item.id}
            item={item}
            index={index}
            frame={frame}
            accent={accent}
          />
        );
      })}
      <g
        data-worker="outreach"
        opacity={motion.ramp(frame, 39, motion.whip, motion.reveal.easing)}
      >
        <PersonGlyph
          x={350}
          y={workerPosition}
          size={32}
          role="worker"
          color={accent}
        />
      </g>
      <ReconnectLedger input={input} frame={frame} />
    </g>
  );
}
