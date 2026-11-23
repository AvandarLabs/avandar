import test from "node:test";
import { fixtures } from "../UtteranceToModelDraft.fixtures";
import { assertOnlyOnePhraseCopyInput as _assertOnlyOnePhraseCopyInput } from "./assertOnlyOnePhraseCopyInput";
import { assertOriginalSourceCaptionPaintInput as _assertOriginalSourceCaptionPaintInput } from "./assertOriginalSourceCaptionPaintInput";

test("original source and caption paint over copies with full opaque clearance", () => {
  fixtures.forEach(({ input }) => {
    return _assertOriginalSourceCaptionPaintInput(input);
  });
});

test("only one phrase copy travels and role captions wait until all copies finish", () => {
  fixtures.forEach(({ input }) => {
    return _assertOnlyOnePhraseCopyInput(input);
  });
});
