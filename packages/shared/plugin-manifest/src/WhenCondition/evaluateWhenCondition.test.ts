import { evaluateWhenCondition } from "@plugin-manifest/WhenCondition/evaluateWhenCondition.ts";
import { describe, expect, it } from "vitest";
import type { WhenCondition } from "@plugin-manifest/WhenCondition/WhenCondition.types.ts";

const FACTS = {
  hasResult: true,
  rowCount: 20,
  numericColumnCount: 2,
  label: "cases",
};

describe("evaluateWhenCondition", () => {
  it("is true when there is no condition", () => {
    expect(evaluateWhenCondition(undefined, FACTS)).toBe(true);
  });

  it.each<[WhenCondition, boolean]>([
    [{ rowCount: { eq: 20 } }, true],
    [{ rowCount: { ne: 20 } }, false],
    [{ rowCount: { gt: 19 } }, true],
    [{ rowCount: { gte: 21 } }, false],
    [{ rowCount: { lt: 21 } }, true],
    [{ rowCount: { lte: 19 } }, false],
    [{ rowCount: { gte: 20 } }, true],
    [{ rowCount: { lte: 20 } }, true],
    [{ rowCount: { gt: 20 } }, false],
    [{ rowCount: { lt: 20 } }, false],
    [{ label: { in: ["cases", "deaths"] } }, true],
    [{ label: { in: ["deaths"] } }, false],
    [{ hasResult: { eq: true } }, true],
  ])("evaluates %j as %s", (condition, expected) => {
    expect(evaluateWhenCondition(condition, FACTS)).toBe(expected);
  });

  it("combines conditions with all, any, and not", () => {
    expect(
      evaluateWhenCondition(
        {
          all: [
            { numericColumnCount: { gte: 2 } },
            { any: [{ rowCount: { eq: 0 } }, { hasResult: { eq: true } }] },
            { not: { label: { eq: "deaths" } } },
          ],
        },
        FACTS,
      ),
    ).toBe(true);
  });

  it("is false when one child of an all is false", () => {
    expect(
      evaluateWhenCondition(
        { all: [{ rowCount: { eq: 20 } }, { rowCount: { eq: 0 } }] },
        FACTS,
      ),
    ).toBe(false);
  });

  it("is false for the not of a true condition", () => {
    expect(
      evaluateWhenCondition({ not: { rowCount: { eq: 20 } } }, FACTS),
    ).toBe(false);
  });

  it("is false for a fact the slot did not provide", () => {
    expect(evaluateWhenCondition({ unknownFact: { eq: 1 } }, FACTS)).toBe(
      false,
    );
  });

  it("is false when a numeric operator meets a non-number", () => {
    expect(evaluateWhenCondition({ label: { gt: 1 } }, FACTS)).toBe(false);
  });

  it("is false for a missing fact inside a not", () => {
    expect(evaluateWhenCondition({ not: { missing: { eq: 1 } } }, FACTS)).toBe(
      false,
    );
  });

  it("is false when an any names a missing fact beside a true condition", () => {
    expect(
      evaluateWhenCondition(
        { any: [{ missing: { eq: 1 } }, { hasResult: { eq: true } }] },
        FACTS,
      ),
    ).toBe(false);
  });

  it("is false for a comparison with no operators", () => {
    expect(evaluateWhenCondition({ rowCount: {} }, FACTS)).toBe(false);
  });

  it("is false for a comparison naming more than one fact", () => {
    expect(
      evaluateWhenCondition(
        { rowCount: { eq: 20 }, label: { eq: "cases" } },
        FACTS,
      ),
    ).toBe(false);
  });
});
