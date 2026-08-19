/**
 * Inline SVG canvas cursors: a crosshair plus a badge naming the armed tool.
 */

/** Crosshair centred on the hotspot, with a gap so the target stays visible. */
const CROSSHAIR_PATH = "M10 1v6M10 13v6M1 10h6M13 10h6";

/** Hotspot pixel of every generated cursor, at the crosshair centre. */
const HOTSPOT_PX = 10;

function _cursorSvg(badgePath: string): string {
  const paths = `<path d="${CROSSHAIR_PATH}"/><path d="${badgePath}"/>`;
  const strokeAttrs = `fill="none" stroke-linecap="round" stroke-linejoin="round"`;
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" ` +
    `viewBox="0 0 32 32">` +
    `<g ${strokeAttrs} stroke="#fff" stroke-width="3.5">${paths}</g>` +
    `<g ${strokeAttrs} stroke="#111" stroke-width="1.5">${paths}</g>` +
    `</svg>`
  );
}

/** A `cursor` drawing the badge beside a crosshair, which is the fallback. */
function _badgeCursor(badgePath: string): string {
  const svg = encodeURIComponent(_cursorSvg(badgePath));
  return `url("data:image/svg+xml,${svg}") ${HOTSPOT_PX} ${HOTSPOT_PX}, crosshair`;
}

/** Slanted pencil body for the freehand annotation tool. */
export const PENCIL_CURSOR = _badgeCursor(
  "M18 30 18.8 26.4 26.5 18.7 29.3 21.5 21.6 29.2Z",
);

/** Diagonal shaft with a head for the arrow annotation tool. */
export const ARROW_CURSOR = _badgeCursor(
  "M18 30 29 19M29 19 23.5 19.4M29 19 28.6 24.5",
);

/** Closed pentagon for the area annotation tool. */
export const POLYGON_CURSOR = _badgeCursor(
  "M23.5 18 29.5 22.4 27.2 29.5 19.8 29.5 17.5 22.4Z",
);
