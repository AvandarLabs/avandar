import { GlobeProjection } from "../../geography/GlobeProjection/GlobeProjection";
import { STOCK, type GraphicProps } from "../../graphics-common";
import { CustodyLane } from "./CustodyLane";
import { CustodyLegend } from "./CustodyLegend";
import { CustodyStops } from "./CustodyStops";
import { SceneLabel } from "./SceneLabel";
import type { Input } from "./ColdChainCustody.schema";
import type { ReactNode } from "react";
type Props = GraphicProps & { input: Input };
/** Containers travel a schematic route without merging their record facts. */
export function ColdChainCustody({
  frame,
  accent,
  input,
}: Readonly<Props>): ReactNode {
  return (
    <g>
      <SceneLabel text={input.sceneLabel} x={32} y={30} width={700} />
      <SceneLabel text={input.copy.schematic} x={32} y={55} width={650} />
      {input.geographyMode === "globe-and-schematic" ? (
        <g data-globe="context" transform="translate(900 50)">
          <circle r={30} fill={STOCK.surface} stroke={STOCK.line} />
          <path
            d={GlobeProjection.getLandPathFromView({
              centerLongitude: 10,
              centerLatitude: 15,
              radius: 30,
            })}
            fill={accent}
            fillOpacity={0.5}
          />
        </g>
      ) : undefined}
      <CustodyStops input={input} frame={frame} accent={accent} />
      {input.crates.map((crate, index) => (
        <CustodyLane
          key={crate.id}
          crate={crate}
          index={index}
          frame={frame}
          accent={accent}
          input={input}
        />
      ))}
      <CustodyLegend input={input} frame={frame} accent={accent} />
    </g>
  );
}
