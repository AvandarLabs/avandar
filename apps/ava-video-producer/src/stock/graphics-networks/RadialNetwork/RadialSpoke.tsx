import { Motion } from "../../../motion";
import { CircleNode } from "../../graphics-common/CircleNode/CircleNode";
import { DrawPath } from "../../graphics-common/DrawPath";
import { Packet } from "../../graphics-common/Packet/Packet";
import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { CENTER } from "./RadialNetwork.constants";
import type { ReactNode } from "react";

const SPOKE_CUE = 20;
const PACKET_PHASE_STEP = 12;
const NODE_PHASE_STEP = 10;
type Props = Readonly<{
  node: {
    label: string;
    x: number;
    y: number;
  };
  index: number;
  frame: number;
  accent: string;
}>;
/** One spoke: its edge, the packet travelling it, and the node at its end. */
export function RadialSpoke({ node, index, frame, accent }: Props): ReactNode {
  const style = GraphicThemeHooks.useGraphicProps({
    name: "RadialNetwork",
    props: {},
  });
  const { color } = GraphicThemeHooks.useGraphicTokens();
  const motion = GraphicThemeHooks.useGraphicMotion();
  const nodeAccent = index % 2 ? accent : color.accentAlt;
  return (
    <g>
      <DrawPath
        curve={{ from: CENTER, to: node }}
        frame={frame}
        at={SPOKE_CUE + index * motion.stagger.edge}
        color={accent}
        opacity={style.spokeAlpha}
      />
      <Packet
        frame={frame}
        from={index % 2 ? CENTER : node}
        to={index % 2 ? node : CENTER}
        delay={index * PACKET_PHASE_STEP}
        color={nodeAccent}
      />
      <CircleNode
        {...node}
        frame={frame}
        index={index}
        accent={nodeAccent}
        size="xs"
        active={
          Motion.wave({
            frame,
            period: style.spokePulsePeriod,
            offset: index * NODE_PHASE_STEP,
          }) * style.spokePulseSwing
        }
      />
    </g>
  );
}
