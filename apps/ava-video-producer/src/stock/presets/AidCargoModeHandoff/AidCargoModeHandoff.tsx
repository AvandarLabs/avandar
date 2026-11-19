import { PersonGlyph } from "../../primitives/PersonGlyph/PersonGlyph";
import { SketchedShape } from "../../primitives/SketchedShape";
import { useGraphicTokens } from "../../theme/useGraphicTheme/useGraphicTheme";
import { CargoCarrier } from "./CargoCarrier";
import { CargoLabels } from "./CargoLabels";
import { CargoParcel } from "./CargoParcel";
import type { GraphicProps } from "../../graphics-common/graphicCommon.types";
import type { Input } from "./AidCargoModeHandoff.schema";
import type { ReactNode } from "react";
/** Complete input with frame-controlled graphic properties. */
export type Props = GraphicProps & { input: Input };
/** A conserved physical load moves through the authored carrier boundaries. */
export function AidCargoModeHandoff({
  input,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const tokens = useGraphicTokens();
  return (
    <g>
      <CargoLabels input={input} accent={accent} />
      <PersonGlyph x={910} y={330} size={36} role="worker" color={accent} />
      <SketchedShape
        shape={{ kind: "path", d: "M40 380 H920" }}
        profile={tokens.sketch.shape}
        stroke={tokens.color.line}
      />
      {input.carriers.map((carrier, index) => {
        return (
          <CargoCarrier
            key={carrier.id}
            carrier={carrier}
            input={input}
            frame={frame}
            index={index}
            accent={accent}
          />
        );
      })}
      {input.parcels.map((parcel, index) => {
        return (
          <CargoParcel
            key={parcel.id}
            input={input}
            frame={frame}
            parcelIndex={index}
            accent={accent}
          />
        );
      })}
    </g>
  );
}
