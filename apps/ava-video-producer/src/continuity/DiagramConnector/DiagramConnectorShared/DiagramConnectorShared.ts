import {
  type SourceRect,
  type ConnectorTarget,
} from "./DiagramConnectorShared.types";
import type { ResolvedVideoComponents } from "../../../videoTheme/videoTheme.types";
/** A curve from the source's centre to the active diagram's target. */
function _buildConnectorPath({
  source,
  target,
  bend,
}: Readonly<{
  source: SourceRect;
  target: ConnectorTarget;
  bend: Readonly<Pick<ResolvedVideoComponents["Connector"], "bend" | "drop">>;
}>): string {
  return `M ${source.x + source.width / 2} ${source.y + source.height / 2} Q ${target.x} ${source.y + source.height / 2} ${target.x + bend.bend} ${target.y + bend.drop}`;
}
/**
 * Connector path geometry used by DiagramConnector to join its source and
 * target.
 */
export const DiagramConnectorShared = {
  /** A curve from the source's centre to the active diagram's target. */
  buildConnectorPath: _buildConnectorPath,
} as const;
