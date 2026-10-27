import { propEq } from "@avandar/utils";
import { STOCK, type GraphicProps } from "../../graphics-common";
import { FitText } from "../../primitives/FitText/FitText";
import { AccessParticipant } from "./AccessParticipant";
import { DEFAULT_INPUT } from "./ChosenServiceAccess.fixtures";
import { ServiceEntrance } from "./ServiceEntrance";
import { ServiceStaff } from "./ServiceStaff";
import type { Input } from "./ChosenServiceAccess.schema";
import type { ReactNode } from "react";
type Props = GraphicProps & { input: Input };
/**
 * Choice precedes a targeted physical access change and self-directed entry.
 */
export function ChosenServiceAccess({
  input = DEFAULT_INPUT,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const chosenIndex = input.services.findIndex(
    propEq("id", input.chosenServiceId),
  );
  const doorX = 160 + ((chosenIndex + 0.5) * 640) / input.services.length;
  const threshold = input.accessChange === "clear-entrance" ? 356 : 326;
  return (
    <g>
      <path d="M50 356 H860" fill="none" stroke={STOCK.line} strokeWidth={2} />
      {input.services.map((service, index) => (
        <ServiceEntrance
          key={service.id}
          service={service}
          index={index}
          input={input}
          frame={frame}
          accent={accent}
        />
      ))}
      <path
        data-access-route
        d={`M25 440 H${doorX - 170} L${doorX - 100} 356 L${doorX - 42} ${threshold} H${doorX + 42}`}
        stroke={STOCK.line}
        fill="none"
        strokeWidth={1}
      />
      <ServiceStaff input={input} frame={frame} accent={STOCK.orange} />
      <AccessParticipant input={input} frame={frame} accent={accent} />
      <FitText
        text={input.labels.participant}
        x={50}
        y={524}
        width={380}
        fontSize={14}
        maxLines={2}
        breakLongWords
        normalizeWhitespace
      />
      <FitText
        text={input.labels.staff}
        x={530}
        y={524}
        width={380}
        fontSize={14}
        maxLines={2}
        breakLongWords
        normalizeWhitespace
      />
      <FitText
        text={input.scenarioCaption}
        x={50}
        y={577}
        width={860}
        fontSize={12}
        maxLines={2}
        breakLongWords
        normalizeWhitespace
      />
    </g>
  );
}
