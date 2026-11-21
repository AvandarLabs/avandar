import assert from "node:assert/strict";
import { type AssertConcentratedPapersPreserveIdentitiesPapersOptions } from "./ResidentBudgetBallotsTestState";

/**
 * Asserts concentrated papers preserve all identities and disjoint final
 * envelopes.
 */
export function assertConcentratedPapersPreserveIdentitiesPapers({
  papers,
  input,
  hold,
  projectId,
}: Readonly<AssertConcentratedPapersPreserveIdentitiesPapersOptions>): void {
  assert.equal(papers.length, 8);
  papers.forEach((paper, index) => {
    assert.ok(paper.x >= 48 && paper.x + paper.width <= 912);
    assert.ok(paper.y >= 294 && paper.y + paper.height < 553);
    papers.slice(index + 1).forEach((other) => {
      return assert.ok(
        paper.x + paper.width <= other.x ||
          other.x + other.width <= paper.x ||
          paper.y + paper.height <= other.y ||
          other.y + other.height <= paper.y,
      );
    });
  });
  input.ballots.forEach((ballot) => {
    return assert.ok(hold.includes(`aria-label="${ballot.id}"`));
  });
  const totals = [...hold.matchAll(/data-total="(\d+)"/g)].reduce(
    (sum, match) => {
      return sum + Number(match[1]);
    },
    0,
  );
  assert.equal(totals + (projectId === null ? 8 : 0), 8);
}
