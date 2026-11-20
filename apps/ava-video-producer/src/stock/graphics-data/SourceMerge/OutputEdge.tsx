import { DrawPath } from "../../graphics-common/DrawPath";
import { Packet } from "../../graphics-common/Packet";
import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { OUTPUT } from "./SourceMerge.constants";
import type { ReactNode } from "react";

type Props = Readonly<{ frame: number; accent: string; showPackets: boolean }>;
/** The edge and packets from the merge node to the destination. */
export function OutputEdge({ frame, accent, showPackets }: Props): ReactNode {
  const style = GraphicThemeHooks.useGraphicProps("SourceMerge", {});
  return (
    <>
      <DrawPath
        d="M525 323 H662"
        frame={frame}
        at={40}
        color={accent}
        opacity={style.outEdgeAlpha}
        width={style.outEdgeWidth}
      />
      {showPackets ? (
        <Packet
          frame={frame}
          from={OUTPUT.from}
          to={OUTPUT.to}
          color={accent}
          period={style.outPacketPeriod}
          delay={31}
        />
      ) : null}
    </>
  );
}
