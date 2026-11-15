import { ObjectGlyph } from "../../primitives/ObjectGlyph/ObjectGlyph";
import { STOCK } from "../../stockPalette";
import { SceneLabel } from "./SceneLabel";
import type { Input } from "./ContactWindowOverlap.schema";
import type { ReactNode } from "react";

type Props = { input: Input; accent: string };
/** A shared place and explicit people count contextualize the time ribbons. */
export function OverlapSetting({ input, accent }: Readonly<Props>): ReactNode {
  return (
    <g>
      <SceneLabel text={input.sceneLabel} x={32} y={30} width={700} />
      <ObjectGlyph kind="building" x={480} y={65} size={44} color={accent} />
      <SceneLabel
        text={input.axis.venueLabel}
        x={525}
        y={60}
        width={380}
        lines={2}
      />
      <SceneLabel
        text={input.copy.denominator}
        x={32}
        y={70}
        width={300}
        lines={3}
      />
      <text x={32} y={140} fill={STOCK.text} fontSize={18}>
        {input.records.length}
      </text>
    </g>
  );
}
