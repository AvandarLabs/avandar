import test from "node:test";
import { fixtures } from "../StormwaterStorageSpill.fixtures";
import { REVIEW_FIXTURES } from "../StormwaterStorageSpill.reviewFixtures";
import { assertDestinationKeysClearCompleteInput as _assertDestinationKeysClearCompleteInput } from "./assertDestinationKeysClearCompleteInput";
import { assertPhysicalDestinationKeysNeverInput as _assertPhysicalDestinationKeysNeverInput } from "./assertPhysicalDestinationKeysNeverInput";

test("physical destination keys never cover an unrelated positive-volume pool", () => {
  REVIEW_FIXTURES.forEach(({ input }) => {
    return _assertPhysicalDestinationKeysNeverInput(input);
  });
});

test("destination keys clear the complete visible overflow crest", () => {
  [...REVIEW_FIXTURES, ...fixtures].forEach(({ input }) => {
    return _assertDestinationKeysClearCompleteInput(input);
  });
});
