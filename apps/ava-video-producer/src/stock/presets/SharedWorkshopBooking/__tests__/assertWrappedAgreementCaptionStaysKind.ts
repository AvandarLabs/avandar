import assert from "node:assert/strict";
import { fixtures } from "../SharedWorkshopBooking.fixtures";
import { inputSchema } from "../SharedWorkshopBooking.schema";
import {
  _render,
  _assertAgreementClearance,
} from "./SharedWorkshopBookingTestHelpers";

/**
 * Asserts wrapped agreement caption stays clear of names, heads, hands and
 * returning people.
 */
export function assertWrappedAgreementCaptionStaysKind(
  kind: "sewing-machine" | "workbench",
): void {
  Array.from(fixtures).forEach(({ input }) => {
    const candidate = {
      ...input,
      machine: { ...input.machine, kind },
      labels: { ...input.labels, agreed: "語".repeat(30) },
    };
    inputSchema.parse(candidate);
    [
      24,
      36,
      49.5,
      66,
      ...Array.from({ length: 165 }, (_, index) => {
        return 75 + index / 2;
      }),
      167,
    ].forEach((frame) => {
      return _assertAgreementClearance({ input: candidate, frame });
    });
    assert.match(
      _render({ frame: 150, input: candidate }),
      /data-agreed-caption-guide=/,
    );
  });
}
