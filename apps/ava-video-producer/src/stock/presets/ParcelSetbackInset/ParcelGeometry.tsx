import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { ParcelEnvelope } from "./ParcelEnvelope";
import { SetbackHatch } from "./SetbackHatch";
import { StructureFootprint } from "./StructureFootprint";
import type { Input } from "./ParcelSetbackInset.schema";
import type { ReactNode } from "react";

type Props = { input: Input; frame: number; accent: string; id: string };
/**
 * Equal inward edges and a lowered footprint share the original parcel plane.
 */
export function ParcelGeometry({
  input,
  frame,
  accent,
  id,
}: Readonly<Props>): ReactNode {
  const motion = GraphicThemeHooks.useGraphicMotion();
  const progress = motion.ramp(
    frame,
    36,
    motion.scale(48),
    motion.travel.easing,
  );
  const hatchId = `setback-${Array.from(id)
    .map((character) => {
      return character.codePointAt(0)?.toString(16);
    })
    .join("-")}`;
  return (
    <g>
      <SetbackHatch hatchId={hatchId} />
      {input.parcels.map((parcel, index) => {
        return (
          <ParcelEnvelope
            key={parcel.id}
            parcel={parcel}
            index={index}
            setback={input.setback}
            progress={progress}
            accent={accent}
            hatchId={hatchId}
            showDimensions={input.showDimensions}
          />
        );
      })}
      <StructureFootprint input={input} frame={frame} accent={accent} />
    </g>
  );
}
