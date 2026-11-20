import { GlobeProjection } from "../../geography/GlobeProjection/GlobeProjection";
import { SketchedShape } from "../../primitives/SketchedShape";
import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { CustodyLane } from "./CustodyLane/CustodyLane";
import { CustodyLegend } from "./CustodyLegend";
import { CustodyStops } from "./CustodyStops";
import { GlobeContext } from "./GlobeContext";
import { SceneLabel } from "./SceneLabel";
import type { GraphicProps } from "../../graphics-common/graphicCommon.types";
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
        <GlobeContext accent={accent} />
      ) : undefined}
      <CustodyStops input={input} frame={frame} accent={accent} />
      {input.crates.map((crate, index) => {
        return (
          <CustodyLane
            key={crate.id}
            crate={crate}
            index={index}
            frame={frame}
            accent={accent}
            input={input}
          />
        );
      })}
      <CustodyLegend input={input} frame={frame} accent={accent} />
    </g>
  );
}
