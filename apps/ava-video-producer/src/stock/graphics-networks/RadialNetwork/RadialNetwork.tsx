import { getStockDisplayCopyFromDescriptor } from "../../copy/getStockDisplayCopyFromDescriptor/getStockDisplayCopyFromDescriptor";
import { Caption } from "../../graphics-common/Caption";
import { Eyebrow } from "../../graphics-common/Eyebrow";
import { Guide } from "../../graphics-common/Guide";
import { LEGACY_DISPLAY_COPY } from "../../presets/legacy/legacyDisplayCopy";
import { RadialHub } from "./RadialHub";
import { CENTER, ORBIT } from "./RadialNetwork.constants";
import { RadialSpoke } from "./RadialSpoke";
import type { GraphicProps } from "../../graphics-common/graphicCommon.types";
import type { RadialNetworkInput } from "../../presets/RadialNetwork/RadialNetwork.schema";
import type { ReactNode } from "react";

type Props = GraphicProps & { input: RadialNetworkInput };

/** Draws the bounded authored radial-network study at an explicit frame. */
export function RadialNetwork({
  input,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const spokes = input.spokes;
  const nodes = spokes.map((label, i) => {
    const angle = -Math.PI / 2 + (i * Math.PI * 2) / spokes.length;
    return {
      label,
      x: CENTER.x + Math.cos(angle) * ORBIT.radiusX,
      y: CENTER.y + Math.sin(angle) * ORBIT.radiusY,
    };
  });
  return (
    <g>
      <Eyebrow>
        {getStockDisplayCopyFromDescriptor({
          descriptor: LEGACY_DISPLAY_COPY["radial-network"].hubSpoke,
        })}
      </Eyebrow>
      {input.showOrbit ? (
        <Guide
          cx={CENTER.x}
          cy={CENTER.y}
          rx={ORBIT.radiusX}
          ry={ORBIT.radiusY}
        />
      ) : null}
      {nodes.map((node, i) => {
        return (
          <RadialSpoke
            key={node.label}
            node={node}
            index={i}
            frame={frame}
            accent={accent}
          />
        );
      })}
      <RadialHub input={input} frame={frame} accent={accent} />
      <Caption>
        {getStockDisplayCopyFromDescriptor({
          descriptor:
            LEGACY_DISPLAY_COPY["radial-network"].manyEndpointsOneSharedCenter,
        })}
      </Caption>
    </g>
  );
}
