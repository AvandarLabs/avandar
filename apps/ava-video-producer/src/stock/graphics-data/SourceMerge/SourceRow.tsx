import { Arrive } from "../../graphics-common/Arrive/Arrive";
import { DrawPath } from "../../graphics-common/DrawPath";
import { Packet } from "../../graphics-common/Packet/Packet";
import { Panel } from "../../graphics-common/Panel";
import { Text } from "../../graphics-common/Text";
import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { SourceChip } from "./SourceChip";
import {
  MERGE_INPUT,
  SOURCE_EDGE_CUE,
  SOURCE_EDGE_STEP,
  SOURCE_HEIGHT,
  SOURCE_PACKET_STEP,
  SOURCE_STEP,
  SOURCE_TOP,
  SOURCE_WIDTH,
} from "./SourceMerge.constants";
import type { SourceMergeInput } from "../../presets/SourceMerge/SourceMerge.schema";
import type { ReactNode } from "react";

type Source = SourceMergeInput["sources"][number];
type Props = Readonly<{
  source: Source;
  index: number;
  frame: number;
  color: string;
  showPackets: boolean;
}>;
/**
 * One source: its edge into the merge node, packets, and its labelled panel.
 */
export function SourceRow({
  source,
  index,
  frame,
  color,
  showPackets,
}: Props): ReactNode {
  const style = GraphicThemeHooks.useGraphicProps({
    name: "SourceMerge",
    props: {},
  });
  const { layout } = GraphicThemeHooks.useGraphicTokens();
  const x = layout.graphic.margin;
  const y = SOURCE_TOP + index * SOURCE_STEP;
  const from = { x: x + SOURCE_WIDTH, y: y + 43 };
  return (
    <g>
      <DrawPath
        curve={{ from, to: MERGE_INPUT }}
        frame={frame}
        at={SOURCE_EDGE_CUE + index * SOURCE_EDGE_STEP}
        color={color}
        opacity={style.edgeAlpha}
      />
      {showPackets ? (
        <Packet
          frame={frame}
          from={from}
          to={MERGE_INPUT}
          color={color}
          delay={index * SOURCE_PACKET_STEP}
        />
      ) : null}
      <Arrive frame={frame} index={index}>
        <Panel x={x} y={y} width={SOURCE_WIDTH} height={SOURCE_HEIGHT}>
          <SourceChip source={source} x={x} y={y} color={color} />
          <Text role="itemLabel" x={x + 79} y={y + 49}>
            {source.name}
          </Text>
        </Panel>
      </Arrive>
    </g>
  );
}
