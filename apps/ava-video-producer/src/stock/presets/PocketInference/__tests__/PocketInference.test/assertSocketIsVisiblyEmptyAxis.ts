import assert from "node:assert/strict";
import { SvgAttributes } from "../../../../../../tests/helpers/SvgAttributes";

/**
 * Asserts the socket is visibly empty before the cartridge appears and seats
 * before input begins.
 */
export function assertSocketIsVisiblyEmptyAxis({
  axis,
  cartridge,
  socket,
}: Readonly<{ axis: string; cartridge: string; socket: string }>): void {
  const extent = axis === "x" ? "width" : "height";
  assert.ok(
    SvgAttributes.getNumberFromMarkup({ attributes: cartridge, name: axis }) >=
      SvgAttributes.getNumberFromMarkup({ attributes: socket, name: axis }),
  );
  assert.ok(
    SvgAttributes.getNumberFromMarkup({ attributes: cartridge, name: axis }) +
      SvgAttributes.getNumberFromMarkup({
        attributes: cartridge,
        name: extent,
      }) <=
      SvgAttributes.getNumberFromMarkup({ attributes: socket, name: axis }) +
        SvgAttributes.getNumberFromMarkup({ attributes: socket, name: extent }),
  );
}
