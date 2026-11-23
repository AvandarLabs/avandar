import { StockRect } from "../../../primitives/StockRect";
import { ShadeStructure } from "../ShadeStructure";
import { useShadeFootprintPresentation } from "./useShadeFootprintPresentation";
import type { Input } from "../StreetShadeInstallation.schema.ts";
import type { ReactNode } from "react";

type Props = { input: Input; index: number; frame: number };
/** One authored object retains its distinct footprint and visible key. */
export function ShadeFootprint(props: Readonly<Props>): ReactNode {
  const presentation = useShadeFootprintPresentation(props);

  return (
    <g data-installation-id={presentation.item.id}>
      <StockRect
        data-footprint={props.index}
        x={presentation.x}
        y={presentation.y}
        width={presentation.width}
        height={36}
        fill={presentation.color}
        fillOpacity={presentation.scales.wash(
          presentation.isInstalled
            ? presentation.atomic.opacity["34"]
            : presentation.atomic.opacity["6"],
        )}
        stroke={presentation.width > 0 ? presentation.color : undefined}
        strokeWidth={presentation.scales.stroke(
          presentation.tokens.stroke.hairline,
        )}
        strokeDasharray={
          presentation.isInstalled
            ? undefined
            : presentation.tokens.dash.planned.join(" ")
        }
      />
      <ShadeStructure
        kind={presentation.item.kind}
        index={props.index}
        x={presentation.x}
        y={presentation.y}
        width={presentation.width}
        isInstalled={presentation.isInstalled}
        color={presentation.color}
      />
    </g>
  );
}
