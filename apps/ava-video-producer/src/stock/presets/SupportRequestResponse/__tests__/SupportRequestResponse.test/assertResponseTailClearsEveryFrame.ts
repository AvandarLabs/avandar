import { SupportRequestResponseTestState } from "./SupportRequestResponseTestState";

const { render } = SupportRequestResponseTestState;
import assert from "node:assert/strict";
import { SvgAttributes } from "../../../../../../tests/helpers/SvgAttributes";
import { fixtures } from "../../SupportRequestResponse.fixtures";
import { inputSchema } from "../../SupportRequestResponse.schema";
import { assertResponseTailClearsEveryText as _assertResponseTailClearsEveryText } from "./assertResponseTailClearsEveryText";

/**
 * Asserts response tail clears every painted line of accepted dense
 * colleague names.
 */
export function assertResponseTailClearsEveryFrame({
  frame,
  colleague,
  state,
}: Readonly<{ frame: number; colleague: string; state: string }>): void {
  const input = inputSchema.parse({
    ...fixtures[2].input,
    people: { ...fixtures[2].input.people, colleague },
    response: { ...fixtures[2].input.response, state },
  });
  const markup = render({ frame: frame, input: input });
  const tail = SvgAttributes.fromMarker({ markup, marker: "response-tail" });
  const coordinates = tail.match(
    / d="M([^ ]+) ([^ ]+) l([^ ]+) ([^ ]+) l([^ ]+) ([^"]+)"/,
  );
  assert.ok(coordinates);
  const [x, y, dx, dy, endX, endY] = coordinates.slice(1).map(Number);
  const tailBox = {
    left: Math.min(x, x + dx, x + dx + endX) - 0.5,
    right: Math.max(x, x + dx, x + dx + endX) + 0.5,
    top: Math.min(y, y + dy, y + dy + endY) - 0.5,
    bottom: Math.max(y, y + dy, y + dy + endY) + 0.5,
  };
  const group = markup.match(
    /<g data-colleague-name="true">([\s\S]*?)<\/g>/,
  )?.[1];
  assert.ok(group);
  const text = group.match(/<text([^>]*)>([\s\S]*?)<\/text>/);
  assert.ok(text);
  _assertResponseTailClearsEveryText({ text, colleague, tailBox });
}
