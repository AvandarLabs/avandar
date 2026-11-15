import { wave } from "../../motion";
import { getStockDisplayCopyFromDescriptor } from "../copy/getStockDisplayCopyFromDescriptor/getStockDisplayCopyFromDescriptor";
import {
  Arrive,
  Caption,
  CircleNode,
  DrawPath,
  Eyebrow,
  Guide,
  Packet,
  Text,
  type GraphicProps,
} from "../graphics-common";
import { LEGACY_DISPLAY_COPY } from "../presets/legacy/legacyDisplayCopy";
import {
  useGraphicMotion,
  useGraphicProps,
  useGraphicTokens,
} from "../theme/useGraphicTheme";
import type { RadialNetworkInput } from "../presets/RadialNetwork/RadialNetwork.schema";
import type { ReactNode } from "react";

type Props = GraphicProps & { input: RadialNetworkInput };

const CENTER = { x: 480, y: 295 };
const ORBIT = { rx: 278, ry: 181 };
const SPOKE_CUE = 20;
const PACKET_PHASE_STEP = 12;
const NODE_PHASE_STEP = 10;

/** Draws the bounded authored radial-network study at an explicit frame. */
export function RadialNetwork({
  input,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const style = useGraphicProps("RadialNetwork", {});
  const { color } = useGraphicTokens();
  const motion = useGraphicMotion();
  const spokes = input.spokes;
  const nodes = spokes.map((label, i) => {
    const angle = -Math.PI / 2 + (i * Math.PI * 2) / spokes.length;
    return {
      label,
      x: CENTER.x + Math.cos(angle) * ORBIT.rx,
      y: CENTER.y + Math.sin(angle) * ORBIT.ry,
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
        <Guide cx={CENTER.x} cy={CENTER.y} rx={ORBIT.rx} ry={ORBIT.ry} />
      ) : null}
      {nodes.map((node, i) => (
        <g key={node.label}>
          <DrawPath
            curve={{ from: CENTER, to: node }}
            frame={frame}
            at={SPOKE_CUE + i * motion.stagger.edge}
            color={accent}
            opacity={style.spokeAlpha}
          />
          <Packet
            frame={frame}
            from={i % 2 ? CENTER : node}
            to={i % 2 ? node : CENTER}
            delay={i * PACKET_PHASE_STEP}
            color={i % 2 ? accent : color.accentAlt}
          />
          <CircleNode
            {...node}
            frame={frame}
            index={i}
            accent={i % 2 ? accent : color.accentAlt}
            size="xs"
            active={
              wave(frame, style.spokePulsePeriod, i * NODE_PHASE_STEP) *
              style.spokePulseSwing
            }
          />
        </g>
      ))}
      <Arrive frame={frame}>
        <circle
          cx={CENTER.x}
          cy={CENTER.y}
          r={style.hubRadius}
          fill={color.surface}
          stroke={accent}
          strokeOpacity={style.hubStrokeAlpha}
          strokeWidth={style.hubStrokeWidth}
        />
        <circle
          cx={CENTER.x}
          cy={CENTER.y}
          r={style.hubGlowRadius}
          fill={accent}
          fillOpacity={style.hubGlowAlpha}
        />
        <Text
          role="title"
          x={CENTER.x}
          y={CENTER.y + style.hubLabelOffset}
          anchor="middle"
        >
          {input.hub.label}
        </Text>
        <Text
          role="detail"
          x={CENTER.x}
          y={CENTER.y + style.hubDetailOffset}
          anchor="middle"
        >
          {input.hub.detail}
        </Text>
      </Arrive>
      <Caption>
        {getStockDisplayCopyFromDescriptor({
          descriptor:
            LEGACY_DISPLAY_COPY["radial-network"].manyEndpointsOneSharedCenter,
        })}
      </Caption>
    </g>
  );
}
