import { SketchedShape } from "../../../stock/primitives/SketchedShape";
import {
  useVideoProps,
  useVideoTokens,
} from "../../../videoTheme/videoThemeHelpers";
import { CONTINUITY_STAGE } from "../../continuityStage";
import { DiagramConnectorShared } from "../DiagramConnectorShared/DiagramConnectorShared";
import {
  type SourceRect,
  type ConnectorTarget,
} from "../DiagramConnectorShared/DiagramConnectorShared.types";
import css from "./ConnectorLine.module.css";
import type { ReactNode } from "react";

type Props = {
  source: SourceRect;
  target: ConnectorTarget;
  opacity: number;
  accent: string;
};
/** The sketched connector line, drawn across the whole stage. */
export function ConnectorLine({
  source,
  target,
  opacity,
  accent,
}: Readonly<Props>): ReactNode {
  const connector = useVideoProps({
    name: "Connector",
    props: {},
  });
  const tokens = useVideoTokens();
  return (
    <svg
      className={css.connectorLine}
      viewBox={`0 0 ${CONTINUITY_STAGE.width} ${CONTINUITY_STAGE.height}`}
      style={{
        width: CONTINUITY_STAGE.width,
        height: CONTINUITY_STAGE.height,
        opacity,
      }}
    >
      <SketchedShape
        shape={{
          kind: "path",
          d: DiagramConnectorShared.buildConnectorPath({
            source,
            target,
            bend: connector,
          }),
        }}
        profile={tokens.sketch.shape}
        fill="none"
        stroke={accent}
        strokeWidth={connector.strokeWidth}
        strokeDasharray={connector.dash.join(" ")}
      />
    </svg>
  );
}
