import { PortableWorkTransferTestState } from "./PortableWorkTransferTestState";

const { render } = PortableWorkTransferTestState;
import assert from "node:assert/strict";
import { SvgAttributes } from "../../../../../../tests/helpers/SvgAttributes";
import { type Input } from "../../PortableWorkTransfer.schema";
import { assertUnloadingHandFollowsRigidBody as _assertUnloadingHandFollowsRigidBody } from "./assertUnloadingHandFollowsRigidBody";

/**
 * Asserts the unloading hand follows each rigid copy and stays above the
 * open folio.
 */
export function assertUnloadingHandFollowsRigidId({
  id,
  index,
  input,
}: Readonly<{
  id: Readonly<Input["artifacts"][number]["id"]>;
  index: number;
  input: Readonly<Input>;
}>): void {
  const markup = render({
    frame: 124 + ((index + 0.5) * 6) / input.artifacts.length,
    input,
  });
  const copy = markup.match(
    new RegExp(`<g data-transfer-copy="${id}">([\\s\\S]*?)<\\/g>`),
  )?.[1];
  assert.ok(copy);
  const body = SvgAttributes.fromMarker({
    markup: copy,
    marker: "artifact-body",
  });
  const hand = SvgAttributes.fromMarker({ markup, marker: "owner-hand" });
  const x = SvgAttributes.getNumberFromMarkup({ attributes: body, name: "x" }),
    y = SvgAttributes.getNumberFromMarkup({ attributes: body, name: "y" });
  _assertUnloadingHandFollowsRigidBody({
    body,
    hand,
    x,
    y,
    markup,
  });
}
