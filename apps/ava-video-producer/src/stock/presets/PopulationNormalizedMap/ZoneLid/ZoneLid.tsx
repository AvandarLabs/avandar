import { SketchedShape } from "../../../primitives/SketchedShape";
import { ZoneGround } from "../ZoneGround";
import { ZoneSurface } from "../ZoneSurface";
import { useZoneLidPresentation } from "./useZoneLidPresentation";
import type { Input } from "../PopulationNormalizedMap.schema.ts";
import type { ReactNode } from "react";

type Props = {
  zone: Input["zones"][number];
  index: number;
  input: Input;
  frame: number;
  accent: string;
  lift: number;
};
/**
 * One lifted boundary remains connected to its zone's unchanged denominator.
 */
export function ZoneLid(props: Readonly<Props>): ReactNode {
  const presentation = useZoneLidPresentation(props);

  return (
    <g
      data-zone={props.zone.id}
      data-records={props.zone.records}
      data-population={props.zone.population}
      data-rate={presentation.rate}
    >
      <ZoneGround
        zoneId={props.zone.id}
        points={presentation.points}
        first={presentation.first}
        index={props.index}
        frame={props.frame}
        accent={props.accent}
      />
      <ZoneSurface
        zoneId={props.zone.id}
        points={presentation.points}
        lift={props.lift}
        accent={props.accent}
        opacity={presentation.opacity}
      />
      <SketchedShape
        shape={{
          kind: "path",
          d: `M${55 + presentation.first[0] * 5} ${180 + presentation.first[1] * 2.5} v${-props.lift}`,
        }}
        profile={presentation.tokens.sketch.shape}
        stroke={props.accent}
        strokeOpacity={presentation.tokens.alpha.guide}
      />
    </g>
  );
}
