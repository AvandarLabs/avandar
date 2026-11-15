import { ConvoyCopy } from "./ConvoyCopy";
import { ConvoyMap } from "./ConvoyMap";
import { ConvoyVehicle } from "./ConvoyVehicle";
import { getConvoyJourneyFromInputAndFrame } from "./getConvoyJourneyFromInputAndFrame";
import type { GraphicProps } from "../../graphics-common";
import type { Input } from "./ConvoyRouteDetour.schema";
import type { ReactNode } from "react";
/** Complete authored input and shared frame parameters. */
export type Props = GraphicProps & { input: Input };
/** A braking vehicle reverses safely, then follows the authored alternative. */
export function ConvoyRouteDetour({
  frame,
  accent,
  input,
}: Readonly<Props>): ReactNode {
  const journey = getConvoyJourneyFromInputAndFrame({ frame, input });
  return (
    <g>
      <ConvoyCopy input={input} accent={accent} />
      <ConvoyMap input={input} frame={frame} accent={accent} />
      <ConvoyVehicle {...journey} vehicle={input.vehicle} accent={accent} />
    </g>
  );
}
