import { prop, propEq } from "@avandar/utils";
import { FitText } from "../../primitives/FitText/FitText";
import { SketchedShape } from "../../primitives/SketchedShape";
import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { Input } from "./OutreachHouseholdRevisits.schema";
import type { ReactNode } from "react";

type Props = { input: Input; completed: Input["visits"]; accent: string };
/**
 * Supplied map centers stay fixed; indexed label rows reserve complete copy.
 */
export function HouseholdMap({
  input,
  completed,
  accent,
}: Readonly<Props>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  return (
    <g>
      {input.households.map((household, index) => {
        return _getHouseholdFromInputAndVisits({
          input,
          completed,
          accent,
          household,
          index,
          tokens,
          scales,
        });
      })}
    </g>
  );
}

/** A household's fixed placement and observed visit state. */
type HouseholdPlacement = {
  household: Input["households"][number];
  index: number;
  x: number;
  y: number;
  events: Input["visits"];
  state: string;
  color: string;
  input: Input;
  accent: string;
  tokens: ReturnType<typeof GraphicThemeHooks.useGraphicTokens>;
  scales: ReturnType<typeof GraphicThemeHooks.useGraphicShapeScales>;
};
/** A keyed household combines its original map shape, labels, and stamps. */
function _getHouseholdFromInputAndVisits({
  input,
  completed,
  accent,
  household,
  index,
  tokens,
  scales,
}: Readonly<HouseholdVisitOptions>): ReactNode {
  const placement = _makeHouseholdPlacementFromVisits({
    input,
    completed,
    accent,
    household,
    index,
    tokens,
    scales,
  });
  const { x, y, events, state } = placement;
  return (
    <g
      key={household.id}
      data-household-id={household.id}
      data-x={x}
      data-y={y}
      data-events={events.length}
      data-state={state}
    >
      {_getHouseholdOutlineFromPlacement(placement)}
      {_getHouseholdLabelsFromPlacement(placement)}
      {_getVisitStampsFromPlacement(placement)}
    </g>
  );
}
/** The connector and outlined home preserve fixed authored map centers. */
function _getHouseholdOutlineFromPlacement({
  household,
  index,
  x,
  y,
  color,
  state,
  tokens,
  scales,
}: Readonly<HouseholdPlacement>): ReactNode {
  return (
    <>
      <SketchedShape
        shape={{
          kind: "path",
          d: `M${x + 19} ${y} L600 ${112 + index * 38} H620`,
        }}
        profile={tokens.sketch.shape}
        stroke={tokens.color.line}
        fill="none"
      />
      <g data-home-outline={household.id}>
        <SketchedShape
          shape={{
            kind: "path",
            d: `M${x - 18} ${y - 3} L${x} ${y - 20} L${x + 18} ${y - 3} V${y + 20} H${x - 18} Z`,
          }}
          profile={tokens.sketch.shape}
          fill={tokens.color.surface}
          stroke={color}
          strokeWidth={scales.stroke(
            state === "contacted"
              ? tokens.stroke.emphasis
              : tokens.stroke.outline,
          )}
        />
      </g>
    </>
  );
}
/** Indexed map labels retain their complete authored household copy. */
function _getHouseholdLabelsFromPlacement({
  household,
  index,
  x,
  y,
  color,
}: Readonly<HouseholdPlacement>): ReactNode {
  return (
    <>
      <FitText
        text={String(index + 1)}
        x={x}
        y={y + 1}
        width={30}
        fontSize={14}
        maxLines={1}
        anchor="middle"
        normalizeWhitespace
      />
      <FitText
        text={String(index + 1)}
        x={615}
        y={112 + index * 38}
        width={25}
        fontSize={12}
        maxLines={1}
        normalizeWhitespace
        color={color}
      />
      <FitText
        text={household.label}
        x={650}
        y={112 + index * 38}
        width={270}
        fontSize={12}
        maxLines={2}
        breakLongWords
        normalizeWhitespace
      />
    </>
  );
}
/** Optional visit marks retain the event order and contact-specific fill. */
function _getVisitStampsFromPlacement({
  input,
  events,
  household,
  x,
  y,
  accent,
  tokens,
}: Readonly<HouseholdPlacement>): ReactNode {
  return input.showVisitStamps
    ? events.map((event, eventIndex) => {
        return (
          <circle
            key={eventIndex}
            data-visit-stamp={household.id}
            cx={x - 10 + eventIndex * 10}
            cy={y + 14}
            r={3}
            fill={event.contacted ? accent : tokens.color.highlight}
          />
        );
      })
    : undefined;
}

/** Authored household, visit, and theme inputs for one map placement. */
type HouseholdVisitOptions = Props & {
  household: Input["households"][number];
  index: number;
  tokens: ReturnType<typeof GraphicThemeHooks.useGraphicTokens>;
  scales: ReturnType<typeof GraphicThemeHooks.useGraphicShapeScales>;
};
/** Fixed map centers and contact states derived from the completed visits. */
function _makeHouseholdPlacementFromVisits({
  input,
  completed,
  accent,
  household,
  index,
  tokens,
  scales,
}: Readonly<HouseholdVisitOptions>): HouseholdPlacement {
  const x = 80 + household.x * 480;
  const y = 120 + household.y * 270;
  const events = completed.filter(propEq("householdId", household.id));
  const state = events.some(prop("contacted"))
    ? "contacted"
    : events.length
      ? "no-contact"
      : "unvisited";
  const color =
    state === "contacted"
      ? accent
      : state === "no-contact"
        ? tokens.color.highlight
        : tokens.color.inactive;
  return {
    input,
    accent,
    household,
    index,
    x,
    y,
    events,
    state,
    color,
    tokens,
    scales,
  };
}
