import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { DEFAULT_INPUT } from "./CommunityCoordinationTable.fixtures";
import { CommunityCoordinationTableRequestTag } from "./CommunityCoordinationTableRequestTag/CommunityCoordinationTableRequestTag";
import { CommunityCoordinationTableTeamsLayer } from "./CommunityCoordinationTableTeamsLayer/CommunityCoordinationTableTeamsLayer";
import { CoordinationActors } from "./CoordinationActors";
import { CoordinationLabels } from "./CoordinationLabels";
import { CoordinationPlaceConnections } from "./CoordinationPlaceConnections";
import { CoordinationTableSurface } from "./CoordinationTableSurface/CoordinationTableSurface";
import type { GraphicProps } from "../../graphics-common/graphicCommon.types";
import type { Input } from "./CommunityCoordinationTable.schema";
import type { ReactNode } from "react";

type Props = GraphicProps & { input: Input };
/**
 * One authored reallocation responds to community input on a schematic table.
 */
export function CommunityCoordinationTable({
  input = DEFAULT_INPUT,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const { atomic } = GraphicThemeHooks.useGraphicTheme();
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  return (
    <g>
      <CoordinationTableSurface {...{ atomic, tokens, scales }} />
      <CommunityCoordinationTableRequestTag
        {...{ input, tokens, accent, frame }}
      />
      <CoordinationPlaceConnections input={input} accent={accent} />
      <CoordinationActors {...{ input, frame, accent }} />
      <CommunityCoordinationTableTeamsLayer {...{ input, frame, accent }} />
      <CoordinationLabels {...{ input, frame, accent }} />
    </g>
  );
}
