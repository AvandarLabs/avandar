import { propEq, prop } from "@avandar/utils";
import { SketchedShape } from "../../primitives/SketchedShape";
import {
  useGraphicShapeScales,
  useGraphicTokens,
} from "../../theme/useGraphicTheme/useGraphicTheme";
import { getClusterPointPositionFromPoint } from "./getClusterPointPositionFromPoint";
import type { Input } from "./MapClusterUnfold.schema";
import type { ReactNode } from "react";

type Props = { input: Input; grouping: number; accent: string };
function _getLocations({ input, grouping }: Readonly<Omit<Props, "accent">>) {
  const positions = input.points.map((point) => {
    const cluster = input.clusters.find(propEq("id", point.clusterId))!;
    return getClusterPointPositionFromPoint({ point, cluster, grouping });
  });
  return positions
    .filter((position, index) => {
      return (
        positions.findIndex((other) => {
          return other.x === position.x && other.y === position.y;
        }) === index
      );
    })
    .map((position) => {
      const members = positions.filter((other) => {
        return other.x === position.x && other.y === position.y;
      });
      return {
        x: position.x,
        y: position.y,
        numMembers: members.length,
        hasStationaryMember: members.some(prop("isStationary")),
      };
    });
}
/** Stable groups and stationary coincident members retain derived badges. */
export function LocationCounts({
  input,
  grouping,
  accent,
}: Readonly<Props>): ReactNode {
  return (
    <g>
      {_getLocations({ input, grouping })
        .filter((location) => {
          return (
            grouping === 0 ||
            grouping === 1 ||
            (location.hasStationaryMember && location.numMembers > 1)
          );
        })
        .map((location, index) => {
          return (
            <LocationBadge key={index} location={location} accent={accent} />
          );
        })}
    </g>
  );
}

/** A location's member count in a ring at its shared position. */
function LocationBadge({
  location,
  accent,
}: Readonly<{
  location: ReturnType<typeof _getLocations>[number];
  accent: string;
}>): ReactNode {
  const { color, stroke, sketch, text } = useGraphicTokens();
  const shapes = useGraphicShapeScales();
  return (
    <g data-location-count={location.numMembers}>
      <SketchedShape
        shape={{
          kind: "circle",
          cx: location.x,
          cy: location.y,
          r: 14,
        }}
        profile={sketch.shape}
        fill={color.elevated}
        stroke={accent}
        strokeWidth={shapes.stroke(stroke.hairline)}
      />
      <text
        x={location.x}
        y={location.y + 4}
        textAnchor="middle"
        fontSize={text.graphic.data.fontSize}
        fontWeight={text.graphic.data.fontWeight}
        fill={text.graphic.data.color}
      >
        {location.numMembers}
      </text>
    </g>
  );
}
