import { PrivateCaseConversationTestState } from "./PrivateCaseConversationTestState";

const { render: _render } = PrivateCaseConversationTestState;

import assert from "node:assert/strict";
import { SvgAttributes } from "../../../../../../tests/helpers/SvgAttributes";
import { DEFAULT_INPUT } from "../../PrivateCaseConversation.fixtures";

/**
 * Asserts both partitions close behind the fully exited supporter with
 * either inset choice.
 */
export function assertBothPartitionsCloseBehindShowWaitingSupporter({
  showWaitingSupporter,
  partition,
}: Readonly<{
  showWaitingSupporter: boolean;
  partition: "door" | "screen";
}>): void {
  const input = { ...DEFAULT_INPUT, partition, showWaitingSupporter };
  [20, 44, 64, 84, 86, 97, 108, 150].forEach((frame) => {
    const markup = _render({ frame: frame, input: input });
    assert.ok(
      markup.indexOf("data-partition=") < markup.indexOf("data-person="),
      "room strokes stay behind person labels",
    );
    const anchors = [
      ...markup.matchAll(/<circle data-person-anchor="([^"]*)"[^>]*>/g),
    ];
    anchors.forEach(([attributes, id]) => {
      const x = SvgAttributes.getNumberFromMarkup({ attributes, name: "cx" });
      const y = SvgAttributes.getNumberFromMarkup({ attributes, name: "cy" });
      if (id === "p" || id === "w") {
        assert.equal(x, id === "p" ? 220 : 460);
        assert.equal(y, 290);
      } else if (frame >= 84) {
        assert.equal(x, 780);
        assert.ok(x - 12 > 631);
      }
    });
    if (frame === 84) {
      assert.match(markup, /data-closed="false"/);
    }
    if (frame >= 108) {
      assert.match(markup, /data-closed="true"/);
    }
  });
  const hold = _render({ frame: 150, input: input });
  assert.match(hold, /data-person="s" data-space="waiting"/);
  assert.match(
    hold,
    new RegExp(`data-person="s"[^>]*opacity="${showWaitingSupporter ? 1 : 0}"`),
  );
}
