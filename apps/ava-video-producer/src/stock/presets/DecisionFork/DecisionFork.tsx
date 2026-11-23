import { propEq } from "@avandar/utils";
import { Motion } from "../../../motion";
import { Text } from "../../graphics-common/Text";
import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { DecisionBranches } from "./DecisionBranches";
import type { GraphicProps } from "../../graphics-common/graphicCommon.types";
import type { DecisionForkInput } from "./DecisionFork.schema";
import type { ReactNode } from "react";

/** Frame-controlled authored choice preserves the established input type. */
export type Props = GraphicProps & {
  input: DecisionForkInput;
};

/**
 * A bounded authored decision shows conditions, closed gates and one outcome.
 */
export function DecisionFork({ frame, accent, input }: Props): ReactNode {
  const motion = GraphicThemeHooks.useGraphicMotion();
  const branchSpacing = 880 / input.branches.length;
  const selectedIndex = input.branches.findIndex(
    propEq("id", input.selectedBranchId),
  );
  const selectedX = 40 + branchSpacing * (selectedIndex + 0.5);
  return (
    <g>
      <DecisionBranches
        frame={frame}
        accent={accent}
        input={input}
        branchSpacing={branchSpacing}
        selectedX={selectedX}
      />
      <g
        opacity={Motion.ramp({
          frame,
          at: 120,
          dur: motion.chip,
          easing: motion.reveal.easing,
        })}
      >
        <Text role="secondary" x={480} y={557} anchor="middle">
          {input.selectionLabel}
        </Text>
      </g>
    </g>
  );
}
