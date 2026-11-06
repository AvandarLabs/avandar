import assert from "node:assert/strict";
import { SvgAttributes } from "../../../../tests/helpers/SvgAttributes";

/** One actual SVG point in the service scene. */
export type ServicePoint = { x: number; y: number };
/** A straight emitted SVG path segment. */
export type ServiceSegment = { start: ServicePoint; end: ServicePoint };
/** A filled obstacle or stroked barrier from the actual service scene. */
export type ServiceObstacle = {
  segments: ServiceSegment[];
  hasFill: boolean;
  strokeWidth: number;
};
/** Actual participant geometry with inherited stroke sizes resolved. */
export type ServiceParticipantGeometry = {
  circles: Array<ServicePoint & { radius: number; rimRadius: number }>;
  segments: Array<ServiceSegment & { strokeWidth: number }>;
};

function _getAttribute({
  tag,
  key,
}: {
  tag: string;
  key: string;
}): string | undefined {
  return tag.match(new RegExp(` ${key}="([^"]*)"`))?.[1];
}

/** Read straight SVG commands, preserving subpaths and closed polygons. */
function _getServicePathSegmentsFromTag(tag: string): ServiceSegment[] {
  const path = _getAttribute({ tag, key: "d" });
  assert.ok(path);
  const segments: ServiceSegment[] = [];
  let current = { x: 0, y: 0 },
    origin = current;
  [...path.matchAll(/([MLHVZmlhvz])([^MLHVZmlhvz]*)/g)].forEach(
    ([, command, values]) => {
      const coordinates = values
        .trim()
        .split(/[ ,]+/)
        .filter(Boolean)
        .map(Number);
      const isRelative = command === command.toLowerCase();
      const axis = command.toUpperCase();
      const end =
        axis === "Z"
          ? origin
          : {
              x:
                axis === "V"
                  ? current.x
                  : coordinates[0] + (isRelative ? current.x : 0),
              y:
                axis === "H"
                  ? current.y
                  : coordinates[axis === "V" ? 0 : 1] +
                    (isRelative ? current.y : 0),
            };
      if (axis === "M") {
        origin = end;
      } else {
        segments.push({ start: current, end });
      }
      current = end;
    },
  );
  assert.ok(segments.length > 0);
  return segments;
}

/** Read complete participant circles and strokes without pose diagnostics. */
function _getServiceParticipantGeometryFromMarkup(
  markup: string,
): ServiceParticipantGeometry {
  const result: ServiceParticipantGeometry = { circles: [], segments: [] };
  const styles = [{ hasStroke: false, strokeWidth: 1 }];
  [...markup.matchAll(/<\/?(?:g|path|circle)\b[^>]*>/g)].forEach(([tag]) => {
    if (tag.startsWith("</")) {
      if (tag.startsWith("</g")) {
        styles.pop();
      }
      return;
    }
    const parent = styles.at(-1)!;
    const stroke = _getAttribute({ tag, key: "stroke" });
    const style = {
      hasStroke: stroke === undefined ? parent.hasStroke : stroke !== "none",
      strokeWidth: Number(
        _getAttribute({ tag, key: "stroke-width" }) ?? parent.strokeWidth,
      ),
    };
    if (tag.startsWith("<g")) {
      styles.push(style);
    } else if (tag.startsWith("<circle")) {
      result.circles.push({
        x: SvgAttributes.getNumberFromMarkup({ attributes: tag, name: "cx" }),
        y: SvgAttributes.getNumberFromMarkup({ attributes: tag, name: "cy" }),
        rimRadius: SvgAttributes.getNumberFromMarkup({
          attributes: tag,
          name: "r",
        }),
        radius:
          SvgAttributes.getNumberFromMarkup({ attributes: tag, name: "r" }) +
          (style.hasStroke ? style.strokeWidth / 2 : 0),
      });
    } else {
      result.segments.push(
        ..._getServicePathSegmentsFromTag(tag).map((segment) => ({
          ...segment,
          strokeWidth: style.hasStroke ? style.strokeWidth : 0,
        })),
      );
    }
  });
  return result;
}

/** Read every unchanged barrier's real filled polygon and stroke. */
function _getServiceObstaclesFromMarkup(markup: string): ServiceObstacle[] {
  return [
    ...markup.matchAll(
      /<path data-barrier="[^"]*"[^>]*data-barrier-selected="false"[^>]*>/g,
    ),
  ].map(([tag]) => ({
    segments: _getServicePathSegmentsFromTag(tag),
    hasFill: _getAttribute({ tag, key: "fill" }) !== "none",
    strokeWidth: SvgAttributes.getNumberFromMarkup({
      attributes: tag,
      name: "stroke-width",
    }),
  }));
}

/** Related service svg geometry operations. */
export const ServiceSvgGeometry = {
  /** Read straight SVG commands, preserving subpaths and closed polygons. */
  getPathSegmentsFromTag: _getServicePathSegmentsFromTag,
  /** Read complete participant circles and strokes without pose diagnostics. */
  getParticipantGeometryFromMarkup: _getServiceParticipantGeometryFromMarkup,
  /** Read every unchanged barrier's real filled polygon and stroke. */
  getObstaclesFromMarkup: _getServiceObstaclesFromMarkup,
} satisfies {
  getPathSegmentsFromTag: typeof _getServicePathSegmentsFromTag;
  getParticipantGeometryFromMarkup: typeof _getServiceParticipantGeometryFromMarkup;
  getObstaclesFromMarkup: typeof _getServiceObstaclesFromMarkup;
};
