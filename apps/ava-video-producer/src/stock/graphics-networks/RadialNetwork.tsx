import { wave } from "../../motion";
import {
  Arrive,
  CircleNode,
  Curve,
  DrawPath,
  Eyebrow,
  Packet,
  STOCK,
  Text,
  type GraphicProps,
} from "../graphics-common";
import { getStockDisplayCopyFromDescriptor } from "../i18n/getStockDisplayCopyFromDescriptor/getStockDisplayCopyFromDescriptor";
import { LEGACY_DISPLAY_COPY } from "../presets/legacy/legacyDisplayCopy";
import type { RadialNetworkInput } from "../presets/RadialNetwork/RadialNetwork.schema";
import type { ReactNode } from "react";

type Props = GraphicProps & { input: RadialNetworkInput };

/** Draws the bounded authored radial-network study at an explicit frame. */
export function RadialNetwork({
  input,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const spokes = input.spokes;
  const center = { x: 480, y: 295 };
  const nodes = spokes.map((label, i) => ({
    label,
    x:
      center.x +
      Math.cos(-Math.PI / 2 + (i * Math.PI * 2) / spokes.length) * 278,
    y:
      center.y +
      Math.sin(-Math.PI / 2 + (i * Math.PI * 2) / spokes.length) * 181,
  }));
  return (
    <g>
      <Eyebrow x={64}>
        {getStockDisplayCopyFromDescriptor({
          descriptor: LEGACY_DISPLAY_COPY["radial-network"].hubSpoke,
        })}
      </Eyebrow>
      {input.showOrbit ? (
        <ellipse
          cx={480}
          cy={295}
          rx={278}
          ry={181}
          fill="none"
          stroke={STOCK.line}
          strokeDasharray="3 9"
          opacity={0.65}
        />
      ) : null}
      {nodes.map((node, i) => (
        <g key={node.label}>
          <DrawPath
            d={Curve({ from: center, to: node })}
            frame={frame}
            at={20 + i * 2}
            color={accent}
            opacity={0.3}
          />
          <Packet
            frame={frame}
            from={i % 2 ? center : node}
            to={i % 2 ? node : center}
            delay={i * 12}
            color={i % 2 ? accent : STOCK.cyan}
          />
          <CircleNode
            {...node}
            frame={frame}
            index={i}
            accent={i % 2 ? accent : STOCK.cyan}
            radius={22}
            active={wave(frame, 90, i * 10) * 0.6}
          />
        </g>
      ))}
      <Arrive frame={frame}>
        <circle
          cx={480}
          cy={295}
          r={70}
          fill={STOCK.surface}
          stroke={accent}
          strokeOpacity={0.4}
        />
        <circle cx={480} cy={295} r={59} fill={accent} fillOpacity={0.035} />
        <Text x={480} y={293} size={25} anchor="middle" weight={600}>
          {input.hub.label}
        </Text>
        <Text x={480} y={317} size={12} anchor="middle" fill={STOCK.muted} mono>
          {input.hub.detail}
        </Text>
      </Arrive>
      <Text x={480} y={560} size={15} fill={STOCK.muted} anchor="middle">
        {getStockDisplayCopyFromDescriptor({
          descriptor:
            LEGACY_DISPLAY_COPY["radial-network"].manyEndpointsOneSharedCenter,
        })}
      </Text>
    </g>
  );
}
