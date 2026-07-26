import { describe, expect, test } from "vitest";
import {
  findAffectedDownstream,
  isSchemaDrift,
} from "@/components/ChatPanel/PlanStateManager/schemaDrift/schemaDrift";
import type { ChatPlan } from "$/types/chat.types";

describe("isSchemaDrift", () => {
  test("no drift when schemas are identical", () => {
    const s = [
      { name: "a", type: "INTEGER" },
      { name: "b", type: "VARCHAR" },
    ];
    expect(isSchemaDrift(s, s)).toBe(false);
  });

  test("no drift when types differ only in case", () => {
    expect(
      isSchemaDrift(
        [{ name: "a", type: "INTEGER" }],
        [{ name: "a", type: "integer" }],
      ),
    ).toBe(false);
  });

  test("drift when a column is added", () => {
    expect(
      isSchemaDrift(
        [{ name: "a", type: "INTEGER" }],
        [
          { name: "a", type: "INTEGER" },
          { name: "b", type: "VARCHAR" },
        ],
      ),
    ).toBe(true);
  });

  test("drift when a column is missing", () => {
    expect(
      isSchemaDrift(
        [
          { name: "a", type: "INTEGER" },
          { name: "b", type: "VARCHAR" },
        ],
        [{ name: "a", type: "INTEGER" }],
      ),
    ).toBe(true);
  });

  test("drift when column names differ", () => {
    expect(
      isSchemaDrift(
        [{ name: "user_id", type: "INTEGER" }],
        [{ name: "id", type: "INTEGER" }],
      ),
    ).toBe(true);
  });

  test("drift when types differ", () => {
    expect(
      isSchemaDrift(
        [{ name: "a", type: "INTEGER" }],
        [{ name: "a", type: "VARCHAR" }],
      ),
    ).toBe(true);
  });

  test("drift when column order differs", () => {
    expect(
      isSchemaDrift(
        [
          { name: "a", type: "INTEGER" },
          { name: "b", type: "VARCHAR" },
        ],
        [
          { name: "b", type: "VARCHAR" },
          { name: "a", type: "INTEGER" },
        ],
      ),
    ).toBe(true);
  });
});

const plan: ChatPlan = {
  rootMessage: "test",
  steps: [
    {
      id: "filter",
      description: "f",
      type: "sql",
      code: "",
      inputs: [],
      predictedSchema: [],
    },
    {
      id: "agg",
      description: "a",
      type: "sql",
      code: "",
      inputs: ["filter"],
      predictedSchema: [],
    },
    {
      id: "rank",
      description: "r",
      type: "sql",
      code: "",
      inputs: ["agg"],
      predictedSchema: [],
    },
    {
      id: "sibling",
      description: "s",
      type: "sql",
      code: "",
      inputs: ["filter"],
      predictedSchema: [],
    },
  ],
};

describe("findAffectedDownstream", () => {
  test("returns all transitive descendants in a linear chain", () => {
    expect(
      findAffectedDownstream({ plan, driftedStepId: "filter" }).sort(),
    ).toEqual(["agg", "rank", "sibling"].sort());
  });

  test("returns only direct + transitive descendants from a middle node", () => {
    expect(findAffectedDownstream({ plan, driftedStepId: "agg" })).toEqual([
      "rank",
    ]);
  });

  test("returns an empty list when the drifted step is a leaf", () => {
    expect(findAffectedDownstream({ plan, driftedStepId: "rank" })).toEqual([]);
  });

  test("returns an empty list when the drifted step id doesn't exist", () => {
    expect(findAffectedDownstream({ plan, driftedStepId: "missing" })).toEqual(
      [],
    );
  });
});
