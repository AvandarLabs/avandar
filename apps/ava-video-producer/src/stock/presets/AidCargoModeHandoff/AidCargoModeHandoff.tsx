import { PersonGlyph } from "../../primitives/PersonGlyph/PersonGlyph";
import { STOCK } from "../../stockPalette";
import { CargoCarrier } from "./CargoCarrier";
import { CargoLabels } from "./CargoLabels";
import { CargoParcel } from "./CargoParcel";
import type { GraphicProps } from "../../graphics-common";
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
  return (
    <g>
      <CargoLabels input={input} accent={accent} />
      <PersonGlyph x={910} y={330} size={36} role="worker" color={accent} />
      <path d="M40 380 H920" stroke={STOCK.line} />
      {input.carriers.map((carrier, index) => (
        <CargoCarrier
          key={carrier.id}
          carrier={carrier}
          input={input}
          frame={frame}
          index={index}
          accent={accent}
        />
      ))}
      {input.parcels.map((parcel, index) => (
        <CargoParcel
          key={parcel.id}
          input={input}
          frame={frame}
          parcelIndex={index}
          accent={accent}
        />
      ))}
    </g>
  );
}
