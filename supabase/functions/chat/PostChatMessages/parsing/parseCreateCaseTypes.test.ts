/**
 * createCaseTypes tool args must round-trip into the client payload, and
 * malformed JSON must be ignored rather than throwing.
 */
import { parseCreateCaseTypes } from "@sbfn/chat/PostChatMessages/parsing/parseCreateCaseTypes.ts";
import { describe, expect, it } from "vitest";

const DATASET_ID = "0f2c9f3e-aaaa-4bbb-8ccc-ddddeeeeffff";
const PK_COLUMN_ID = "1a2b3c4d-aaaa-4bbb-8ccc-ddddeeeeffff";

describe("parseCreateCaseTypes", () => {
  it("parses a case type with join keys and attributes", () => {
    const parsed = parseCreateCaseTypes(
      JSON.stringify({
        cases: [
          {
            name: "COVID case",
            description: "A COVID-19 case",
            identities: [
              {
                datasetId: DATASET_ID,
                primaryKeyColumnId: PK_COLUMN_ID,
              },
            ],
            attributes: [
              {
                name: "Status",
                kind: "dataset_column",
                datasetId: DATASET_ID,
                columnId: PK_COLUMN_ID,
                isLabel: true,
              },
            ],
          },
        ],
      }),
    );

    expect(parsed).toEqual([
      {
        name: "COVID case",
        description: "A COVID-19 case",
        allowManualCreation: false,
        identities: [
          {
            datasetId: DATASET_ID,
            primaryKeyColumnId: PK_COLUMN_ID,
          },
        ],
        attributes: [
          {
            name: "Status",
            kind: "dataset_column",
            datasetId: DATASET_ID,
            columnId: PK_COLUMN_ID,
            isLabel: true,
          },
        ],
      },
    ]);
  });

  it("returns undefined for malformed JSON", () => {
    expect(parseCreateCaseTypes("{not json")).toBeUndefined();
  });
});
