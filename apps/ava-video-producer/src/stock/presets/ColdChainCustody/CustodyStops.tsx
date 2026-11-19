import { ObjectGlyph } from "../../primitives/ObjectGlyph/ObjectGlyph";
import { useGraphicMotion } from "../../theme/useGraphicTheme/useGraphicTheme";
import { SceneLabel } from "./SceneLabel";
import type { Input } from "./ColdChainCustody.schema";
import type { ReactNode } from "react";

type Props = { input: Input; frame: number; accent: string };
/** Three authored role locations define a schematic custody sequence. */
export function CustodyStops({
  input,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const motion = useGraphicMotion();
  return (
    <g>
      {input.stops.map((stop, index) => {
        return (
          <g
            key={stop.id}
            opacity={motion.reveal(frame, 12 + index * motion.scaleStagger(2))}
          >
            <ObjectGlyph
              kind={
                stop.kind === "vehicle" || stop.kind === "courier"
                  ? "device"
                  : "building"
              }
              x={180 + index * 230}
              y={110}
              size={32}
              color={accent}
            />
            <SceneLabel
              text={stop.label}
              x={200 + index * 230}
              y={100}
              width={220}
              lines={3}
            />
          </g>
        );
      })}
    </g>
  );
}
