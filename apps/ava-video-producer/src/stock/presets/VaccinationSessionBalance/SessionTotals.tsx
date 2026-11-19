import { propEq } from "@avandar/utils";
import {
  useGraphicMotion,
  useGraphicTokens,
} from "../../theme/useGraphicTheme/useGraphicTheme";
import { SceneLabel } from "./SceneLabel";
import type { Input } from "./VaccinationSessionBalance.schema";
import type { ReactNode } from "react";

type Props = { input: Input; frame: number };
/**
 * The conservation equation and unique-person count are separate quantities.
 */
export function SessionTotals({ input, frame }: Readonly<Props>): ReactNode {
  const tokens = useGraphicTokens();
  const motion = useGraphicMotion();
  const counts = ["administered", "remaining", "discarded"].map((outcome) => {
    return input.units.filter(
      propEq<{ outcome: unknown }, "outcome", unknown>("outcome", outcome),
    ).length;
  });
  return (
    <g opacity={motion.reveal(frame, 112)}>
      {input.showEquation ? (
        <g data-equation={counts.join("+")}>
          <SceneLabel text={input.copy.unit} x={32} y={495} width={400} />
          <text
            x={32}
            y={570}
            fill={tokens.color.text}
            fontSize={28}
          >{`${input.units.length} = ${counts.join(" + ")}`}</text>
        </g>
      ) : undefined}
      {input.showPeopleTotal ? (
        <g data-people-total={input.recipients.length}>
          <SceneLabel text={input.copy.people} x={540} y={495} width={385} />
          <text x={540} y={570} fill={tokens.color.text} fontSize={28}>
            {input.recipients.length}
          </text>
        </g>
      ) : undefined}
    </g>
  );
}
