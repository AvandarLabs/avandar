import { RecipientConfirmedHandoverTestState } from "./RecipientConfirmedHandoverTestState";

const { render: _render } = RecipientConfirmedHandoverTestState;
import assert from "node:assert/strict";
import test from "node:test";
import { fixtures } from "../RecipientConfirmedHandover.fixtures";
import { assertRecipientIndicatesPullsReleasesHand as _assertRecipientIndicatesPullsReleasesHand } from "./assertRecipientIndicatesPullsReleasesHand";

/**
 * Asserts recipient indicates, pulls and releases each selected unit with a
 * connected hand.
 */
export function assertRecipientIndicatesPullsReleasesInput(
  input: (typeof fixtures)[number]["input"],
): void {
  let ordinal = 0;
  input.contents.forEach((content) => {
    Array.from(
      { length: Math.max(0, Math.ceil((content.selectedUnits - 0) / 1)) },
      (_, sampleIndex) => {
        return 0 + sampleIndex * 1;
      },
    ).forEach((unit) => {
      const frame = 39 + ordinal * 14;
      const markup = _render({ frame, input });
      const hand = markup.match(/<circle data-recipient-hand[^>]*>/);
      const arm = markup.match(/<path data-recipient-arm[^>]*>/);
      const item = [
        ...markup.matchAll(/<g data-good="([^"]*)" data-unit="([^"]*)"[^>]*>/g),
      ].find((match) => {
        return match[1] === content.id && Number(match[2]) === unit;
      });
      assert.ok(hand, "the recipient must pull the counted unit");
      assert.ok(arm && /d="M[^"]+ L[^"]+ L/.test(arm[0]));
      assert.ok(item);
      _assertRecipientIndicatesPullsReleasesHand({
        hand,
        item,
        frame,
        input,
      });
      ordinal += 1;
    });
  });
}
