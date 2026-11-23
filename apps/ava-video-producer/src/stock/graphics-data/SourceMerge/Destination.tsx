import { Arrive } from "../../graphics-common/Arrive/Arrive";
import { GRAPHIC_WIDTH } from "../../graphics-common/graphicCanvas.constants";
import { Panel } from "../../graphics-common/Panel";
import { Text } from "../../graphics-common/Text";
import { StockRect } from "../../primitives/StockRect";
import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { DestinationSlots } from "./DestinationSlots";
import { DESTINATION } from "./SourceMerge.constants";
import type { SourceMergeInput } from "../../presets/SourceMerge/SourceMerge.schema";
import type { ReactNode } from "react";

type Props = Readonly<{
  input: SourceMergeInput;
  frame: number;
  accent: string;
}>;
/** The destination panel the merged output lands in. */
export function Destination({ input, frame, accent }: Props): ReactNode {
  const style = GraphicThemeHooks.useGraphicProps({
    name: "SourceMerge",
    props: {},
  });
  const { layout } = GraphicThemeHooks.useGraphicTokens();
  const shapes = GraphicThemeHooks.useGraphicShapeScales();
  const x = GRAPHIC_WIDTH - layout.graphic.margin - DESTINATION.width;
  const center = x + DESTINATION.width / 2;
  return (
    <Arrive frame={frame} at={34}>
      <Panel
        x={x}
        y={DESTINATION.y}
        width={DESTINATION.width}
        height={DESTINATION.height}
        stroke={accent}
      >
        <StockRect
          x={x + 20}
          y={252}
          width={194}
          height={style.barHeight}
          rx={shapes.corner(style.barHeight / 2)}
          fill={accent}
          fillOpacity={style.barAlpha}
        />
        <Text role="title" x={center} y={305} anchor="middle">
          {input.destination.label}
        </Text>
        <Text role="secondary" x={center} y={336} anchor="middle">
          {input.destination.detail}
        </Text>
        <DestinationSlots x={x} accent={accent} />
      </Panel>
    </Arrive>
  );
}
