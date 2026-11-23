import { Motion } from "../../../../motion";
import { DEMONSTRATE_CUE } from "../exchangeTiming";
import { DemonstrationTool } from "./DemonstrationTool";
import { WorktableSurface } from "./WorktableSurface";
import type { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { Input } from "../ExpertiseRoleExchange.schema";
import type { ReactNode } from "react";

type ParentProps = {
  input: Input;
  frame: number;
  accent: string;
  toolX: number;
};

type GetExpertiseWorktableToolWidthStateResult = {
  toolWidth: number;
  topic: Readonly<ParentProps>["input"]["topics"][number];
  demonstration: number;
};

type Props = {
  frame: Readonly<ParentProps>["frame"];
  accent: Readonly<ParentProps>["accent"];
  toolX: Readonly<ParentProps>["toolX"];
  tokens: ReturnType<typeof GraphicThemeHooks.useGraphicTokens>;
  scales: ReturnType<typeof GraphicThemeHooks.useGraphicShapeScales>;
  motion: ReturnType<typeof GraphicThemeHooks.useGraphicMotion>;
  toolWidth: GetExpertiseWorktableToolWidthStateResult["toolWidth"];
  topic: GetExpertiseWorktableToolWidthStateResult["topic"];
  demonstration: GetExpertiseWorktableToolWidthStateResult["demonstration"];
};

/** The tool's corner before the corner style scales it. */
const TOOL_CORNER = 2;

/** Renders the expertise worktable content in authored paint order. */
export function ExpertiseWorktableContent(options: Readonly<Props>): ReactNode {
  return (
    <g opacity={options.motion.reveal(options.frame, 16)}>
      <WorktableSurface tokens={options.tokens} scales={options.scales} />
      <g
        opacity={Motion.ramp({
          frame: options.frame,
          at: DEMONSTRATE_CUE,
          dur: options.motion.panel,
          easing: options.motion.reveal.easing,
        })}
      >
        <rect
          data-demonstration-tool={options.topic.demonstration}
          x={options.toolX}
          y={325}
          width={90}
          height={8}
          rx={options.scales.corner(TOOL_CORNER)}
          fill={options.accent}
        />
        <DemonstrationTool
          accent={options.accent}
          toolX={options.toolX}
          tokens={options.tokens}
          toolWidth={options.toolWidth}
          topic={options.topic}
          demonstration={options.demonstration}
        />
      </g>
    </g>
  );
}
