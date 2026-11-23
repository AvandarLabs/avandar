import assert from "node:assert/strict";
import { SvgAttributes } from "../../../../../../tests/helpers/SvgAttributes";
import { type AssertUnloadingHandFollowsRigidBodyOptions } from "./PortableWorkTransferTestState";

/**
 * Asserts the unloading hand follows each rigid copy and stays above the
 * open folio.
 */
export function assertUnloadingHandFollowsRigidBody({
  body,
  hand,
  x,
  y,
  markup,
}: Readonly<AssertUnloadingHandFollowsRigidBodyOptions>): void {
  assert.equal(
    SvgAttributes.getNumberFromMarkup({ attributes: body, name: "width" }),
    240,
  );
  assert.equal(
    SvgAttributes.getNumberFromMarkup({ attributes: body, name: "height" }),
    80,
  );
  assert.equal(
    SvgAttributes.getNumberFromMarkup({ attributes: hand, name: "cx" }),
    x + 120,
  );
  assert.equal(
    SvgAttributes.getNumberFromMarkup({ attributes: hand, name: "cy" }),
    y,
  );
  assert.ok(markup.indexOf(hand) > markup.indexOf(body));
  const cover = SvgAttributes.fromMarker({ markup, marker: "folio-cover" });
  assert.equal(
    SvgAttributes.getNumberFromMarkup({ attributes: cover, name: "width" }),
    0,
  );
  const arm = SvgAttributes.fromMarker({ markup, marker: "owner-arm" });
  assert.ok(arm.includes(`L${x + 120} ${y}`));
}
