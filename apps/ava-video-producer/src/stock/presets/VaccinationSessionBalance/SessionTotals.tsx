import { propEq } from "@avandar/utils";
import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { SceneLabel } from "./SceneLabel";
import type { Input } from "./VaccinationSessionBalance.schema";
import type { ReactNode } from "react";
/** The type scale step of the session's balancing totals. */
const TOTAL_SIZE = "28";
const OUTCOMES = ["administered", "remaining", "discarded"] as const;
type Props = { input: Input; frame: number };
/**
 * The conservation equation and unique-person count are separate quantities.
 */
export function SessionTotals({ input, frame }: Readonly<Props>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const motion = GraphicThemeHooks.useGraphicMotion();
  const totalSize = GraphicThemeHooks.useGraphicFontSize(TOTAL_SIZE);
  const data = tokens.text.graphic.data;
  const unitCounts = OUTCOMES.map((outcome) => {
    return input.units.filter(propEq("outcome", outcome)).length;
  });
  return (
    <g opacity={motion.reveal(frame, 112)}>
      {input.showEquation ? (
        <g data-equation={unitCounts.join("+")}>
          <SceneLabel text={input.copy.unit} x={32} y={495} width={400} />
          <text
            x={32}
            y={570}
            fill={tokens.color.text}
            fontSize={totalSize}
            fontWeight={data.fontWeight}
            fontFamily={data.fontFamily}
          >{`${input.units.length} = ${unitCounts.join(" + ")}`}</text>
        </g>
      ) : undefined}
      {input.showPeopleTotal ? (
        <g data-people-total={input.recipients.length}>
          <SceneLabel text={input.copy.people} x={540} y={495} width={385} />
          <text
            x={540}
            y={570}
            fill={tokens.color.text}
            fontSize={totalSize}
            fontWeight={data.fontWeight}
            fontFamily={data.fontFamily}
          >
            {input.recipients.length}
          </text>
        </g>
      ) : undefined}
    </g>
  );
}
