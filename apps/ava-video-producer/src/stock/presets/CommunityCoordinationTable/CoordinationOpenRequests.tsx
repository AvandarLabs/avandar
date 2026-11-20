import { propEq } from "@avandar/utils";
import { FitText } from "../../primitives/FitText/FitText";
import { SketchedShape } from "../../primitives/SketchedShape";
import { useGraphicTokens } from "../../theme/useGraphicTheme/useGraphicTheme";
import { getCoordinationPlaceColorFromIndex } from "./getCoordinationPlaceColorFromIndex";
import type { Input } from "./CommunityCoordinationTable.schema";
import type { ReactNode } from "react";

type Props = { input: Input; accent: string };
/** Each remaining request has its own keyed open label, including empty IDs. */
export function CoordinationOpenRequests({
  input,
  accent,
}: Readonly<Props>): ReactNode {
  const open = input.places.flatMap((place, index) => {
    return input.teams.some(propEq("agreedPlaceId", place.id))
      ? []
      : [{ place, index }];
  });
  return (
    <g>
      {open.map(({ place, index }, ordinal) => {
        return (
          <OpenRequestCaption
            key={place.id}
            placeId={place.id}
            index={index}
            x={25 + ordinal * 460}
            label={input.planLabels.unassigned}
            accent={accent}
          />
        );
      })}
    </g>
  );
}

/** One open place's lettered key beside the unassigned caption. */
function OpenRequestCaption({
  placeId,
  index,
  x,
  label,
  accent,
}: Readonly<{
  placeId: string;
  index: number;
  x: number;
  label: string;
  accent: string;
}>): ReactNode {
  return (
    <g data-unassigned-caption={placeId}>
      <OpenPlaceKey index={index} x={x} accent={accent} />
      <FitText
        text={label}
        x={x + 20}
        y={86}
        width={405}
        fontSize={12}
        maxLines={2}
        breakLongWords
        normalizeWhitespace
      />
    </g>
  );
}

/** The open place's letter in a ring of its place colour. */
function OpenPlaceKey({
  index,
  x,
  accent,
}: Readonly<{ index: number; x: number; accent: string }>): ReactNode {
  const tokens = useGraphicTokens();
  const color = getCoordinationPlaceColorFromIndex({
    index,
    accent,
    color: tokens.color,
  });
  return (
    <>
      <SketchedShape
        shape={{ kind: "circle", cx: x, cy: 82, r: 9 }}
        profile={tokens.sketch.shape}
        fill={tokens.color.surface}
        stroke={color}
      />
      <text
        data-open-place-key
        x={x}
        y={86}
        textAnchor="middle"
        fontFamily={tokens.text.graphic.data.fontFamily}
        fontWeight={tokens.text.graphic.data.fontWeight}
        fontSize={tokens.text.graphic.data.fontSize}
        fill={color}
      >
        {String.fromCharCode(65 + index)}
      </text>
    </>
  );
}
