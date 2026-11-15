/**
 * Search semantics stay independent from fixture values and object ordering.
 */
import assert from "node:assert/strict";
import test from "node:test";
import { makeStockSearchTextFromMetadata } from "./makeStockSearchTextFromMetadata";

test("semantic text follows the public order and normalizes whitespace only", () => {
  assert.equal(
    makeStockSearchTextFromMetadata({
      name: "  Name ",
      description: "Many\n\t words",
      intent: " Intent ",
      creativeDirection: " Creative ",
      goodFor: [" second  use", "first use", "   "],
      domains: ["Domain"],
      aliases: ["Alias"],
      tags: ["Tag"],
      notFor: ["Avoid"],
      distinction: " Distinct ",
    }),
    "Name\nMany words\nIntent\nCreative\nsecond use\nfirst use\nDomain\nAlias\nTag\nAvoid\nDistinct",
  );
});
