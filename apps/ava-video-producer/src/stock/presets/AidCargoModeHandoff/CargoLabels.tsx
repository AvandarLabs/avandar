import { FitText } from "../../primitives/FitText/FitText";
import type { Input } from "./AidCargoModeHandoff.schema";
import type { ReactNode } from "react";

type Props = { input: Input; accent: string };
/** Carrier places and persistent ordinal parcel labels occupy fixed rails. */
export function CargoLabels({ input, accent }: Readonly<Props>): ReactNode {
  return (
    <g>
      <FitText
        text={input.scenarioCaption}
        x={40}
        y={38}
        width={880}
        fontSize={16}
        maxLines={2}
        normalizeWhitespace
        breakLongWords
      />
      <FitText
        text={input.receivingLabel}
        x={625}
        y={100}
        width={280}
        fontSize={14}
        maxLines={3}
        normalizeWhitespace
        breakLongWords
      />
      {input.carriers.map((carrier, index) => (
        <FitText
          key={carrier.id}
          text={carrier.handoffLabel}
          x={60 + (index * 620) / (input.carriers.length - 1)}
          y={410}
          width={250}
          fontSize={14}
          maxLines={3}
          normalizeWhitespace
          breakLongWords
        />
      ))}
      {input.showParcelLabels
        ? input.parcels.map((parcel, index) => (
            <g key={parcel.id}>
              <text x={40 + index * 230} y={505} fill={accent} fontSize={16}>
                {index + 1}
              </text>
              <FitText
                text={parcel.label}
                x={65 + index * 230}
                y={505}
                width={195}
                fontSize={14}
                maxLines={4}
                normalizeWhitespace
                breakLongWords
              />
            </g>
          ))
        : undefined}
    </g>
  );
}
