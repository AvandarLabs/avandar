import assert from "node:assert/strict";
import { SvgAttributes } from "../../../../tests/helpers/SvgAttributes";
import { getConservativeWidthFromText } from "../../text/getConservativeWidthFromText";

type Point = { x: number; y: number };
type Bounds = { left: number; right: number; top: number; bottom: number };
function _intersects({
  first,
  second,
}: {
  first: Bounds;
  second: Bounds;
}): boolean {
  return (
    first.left < second.right &&
    first.right > second.left &&
    first.top < second.bottom &&
    first.bottom > second.top
  );
}
function _getPoints(attributes: string): Point[] {
  const path = attributes.match(/ d="([^"]+)"/);
  assert.ok(path);
  assert.match(path[1], /^[MVH\d. +\-e]+$/i);
  return [...path[1].matchAll(/([MVH])([^MVH]*)/g)].reduce<Point[]>(
    (points, match) => {
      const values = match[2].trim().split(/\s+/).map(Number);
      const prior = points.at(-1) ?? { x: 0, y: 0 };
      const point =
        match[1] === "M"
          ? { x: values[0], y: values[1] }
          : match[1] === "V"
            ? { x: prior.x, y: values[0] }
            : { x: values[0], y: prior.y };
      assert.ok(Number.isFinite(point.x + point.y));
      return [...points, point];
    },
    [],
  );
}
function _decodeText(text: string): string {
  return text.replace(
    /&(amp|lt|gt|quot|#x27);/g,
    (_, entity: string) =>
      ({ amp: "&", lt: "<", gt: ">", quot: '"', "#x27": "'" })[entity]!,
  );
}
function _getTextBounds(markup: string): Bounds[] {
  return [...markup.matchAll(/<text([^>]*)>([\s\S]*?)<\/text>/g)].flatMap(
    ([, attributes, body]) => {
      const fontSize = SvgAttributes.getNumberFromMarkup({
        attributes: attributes,
        name: "font-size",
      });
      const baseline = SvgAttributes.getNumberFromMarkup({
        attributes,
        name: "y",
      });
      const spans = [...body.matchAll(/<tspan([^>]*)>([^<]*)<\/tspan>/g)];
      const lines = spans.length
        ? spans.map(([, span, line], index) => ({
            x: SvgAttributes.getNumberFromMarkup({
              attributes: span,
              name: "x",
            }),
            y:
              baseline +
              spans
                .slice(0, index + 1)
                .reduce(
                  (offset, [, spanAttributes]) =>
                    offset +
                    Number(spanAttributes.match(/ dy="([^"]*)"/)?.[1] ?? 0),
                  0,
                ),
            line,
          }))
        : [
            {
              x: SvgAttributes.getNumberFromMarkup({ attributes, name: "x" }),
              y: baseline,
              line: body,
            },
          ];
      return lines.map(({ x, y, line }) => {
        const text = _decodeText(line);
        const width = getConservativeWidthFromText({ text, fontSize });
        const anchor = attributes.match(/ text-anchor="([^"]+)"/)?.[1];
        const left =
          x - (anchor === "middle" ? width / 2 : anchor === "end" ? width : 0);
        return {
          left,
          right: left + width,
          top: y - fontSize,
          bottom: y + fontSize * 0.3,
        };
      });
    },
  );
}
function _getRectangleBounds(attributes: string): Bounds {
  const left = SvgAttributes.getNumberFromMarkup({ attributes, name: "x" });
  const top = SvgAttributes.getNumberFromMarkup({
    attributes: attributes,
    name: "y",
  });
  return {
    left,
    right:
      left + SvgAttributes.getNumberFromMarkup({ attributes, name: "width" }),
    top,
    bottom:
      top + SvgAttributes.getNumberFromMarkup({ attributes, name: "height" }),
  };
}
function _getSegmentBounds({
  prior,
  point,
}: {
  prior: Point;
  point: Point;
}): Bounds {
  return {
    left: Math.min(point.x, prior.x),
    right: Math.max(point.x, prior.x),
    top: Math.min(point.y, prior.y),
    bottom: Math.max(point.y, prior.y),
  };
}
function _assertPortContact({
  markup,
  id,
  points,
}: Readonly<{ markup: string; id: string; points: Point[] }>): void {
  const port = [
    ...markup.matchAll(/<circle data-register-port="([^"]*)"[^>]*>/g),
  ].find((match) => match[1] === id)?.[0];
  assert.ok(port);
  assert.deepEqual(points.at(-1), {
    x: SvgAttributes.getNumberFromMarkup({ attributes: port, name: "cx" }),
    y:
      SvgAttributes.getNumberFromMarkup({ attributes: port, name: "cy" }) -
      SvgAttributes.getNumberFromMarkup({ attributes: port, name: "r" }),
  });
}
/**
 * Checks actual orthogonal connector paint against full text and artifact
 * bounds.
 */
export function assertReleaseConnectorClearance(markup: string): void {
  const artifact = SvgAttributes.fromMarker({
    markup,
    marker: "release-artifact",
  });
  const rectangle = _getRectangleBounds(artifact);
  const bayBounds = _getRectangleBounds(
    SvgAttributes.fromMarker({ markup, marker: "recipient-bay" }),
  );
  const textBounds = _getTextBounds(markup);
  [...markup.matchAll(/<path data-obligation-unfold="([^"]*)"[^>]*>/g)].forEach(
    ([attributes, id], _, matches) => {
      const points = _getPoints(attributes);
      assert.ok(points.length > 1);
      const halfStroke =
        SvgAttributes.getNumberFromMarkup({
          attributes,
          name: "stroke-width",
        }) / 2;
      points.slice(1).forEach((point, index) => {
        const bounds = _getSegmentBounds({ prior: points[index], point });
        assert.ok(
          !_intersects({ first: bounds, second: rectangle }),
          `${id} crosses opaque artifact`,
        );
        assert.ok(
          !_intersects({ first: bounds, second: bayBounds }),
          `${id} crosses the recipient bay`,
        );
        const paint = {
          left: bounds.left - halfStroke,
          right: bounds.right + halfStroke,
          top: bounds.top - halfStroke,
          bottom: bounds.bottom + halfStroke,
        };
        textBounds.forEach((text) =>
          assert.ok(
            !_intersects({ first: paint, second: text }),
            `${id} crosses complete text bounds ${JSON.stringify(text)}`,
          ),
        );
      });
      _assertPortContact({ markup, id, points });
      assert.equal(
        matches.length,
        [...markup.matchAll(/<circle data-register-port=/g)].length,
      );
    },
  );
}
