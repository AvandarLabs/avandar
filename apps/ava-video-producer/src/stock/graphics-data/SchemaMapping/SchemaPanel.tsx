import { Arrive } from "../../graphics-common/Arrive";
import { Panel } from "../../graphics-common/Panel";
import { Text } from "../../graphics-common/Text";
import {
  useGraphicProps,
  useGraphicTokens,
} from "../../theme/useGraphicTheme/useGraphicTheme";
import {
  DIVIDER_Y,
  PANEL_HEIGHT,
  PANEL_TOP,
  PANEL_WIDTH,
  TITLE_INSET,
  TITLE_Y,
} from "./SchemaMapping.constants";
import type { ReactNode } from "react";

type Props = {
  x: number;
  title: string;
  frame: number;
  index: number;
};

/** One side panel of the mapping: its title and the divider under it. */
export function SchemaPanel({ x, title, frame, index }: Props): ReactNode {
  const style = useGraphicProps("SchemaMapping", {});
  const { color } = useGraphicTokens();
  return (
    <Arrive frame={frame} index={index}>
      <Panel x={x} y={PANEL_TOP} width={PANEL_WIDTH} height={PANEL_HEIGHT}>
        <Text role="panelTitle" x={x + TITLE_INSET} y={TITLE_Y}>
          {title}
        </Text>
        <line
          x1={x}
          y1={DIVIDER_Y}
          x2={x + PANEL_WIDTH}
          y2={DIVIDER_Y}
          stroke={color.line}
          strokeWidth={style.dividerWidth}
        />
      </Panel>
    </Arrive>
  );
}
