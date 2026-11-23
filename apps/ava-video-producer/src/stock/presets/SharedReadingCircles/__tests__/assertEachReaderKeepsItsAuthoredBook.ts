import assert from "node:assert/strict";
import { denseInput } from "../SharedReadingCircles.fixtures";

/** Asserts each reader retains exactly one authored group-book association. */
export function assertEachReaderKeepsItsAuthoredBook({
  input,
  markup,
}: Readonly<{ input: typeof denseInput; markup: string }>): void {
  input.learners.forEach((learner) => {
    const group = input.readingGroups.find((candidate) => {
      return candidate.learnerIds.includes(learner.id);
    })!;
    assert.equal(
      markup.split(
        `data-reader-id="${learner.id}" data-reader-book="${group.bookId}"`,
      ).length - 1,
      1,
    );
  });
}
