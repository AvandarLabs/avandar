/** Tests the adapter from DuckDB SQL analysis to referenced relations. */

import { describe, expect, it } from "vitest";

import { extractReferencedRelations } from "@/clients/qetl/wrappers/extractReferencedRelations/extractReferencedRelations";

const DATASET_ID = "0f2c9f3e-1111-4222-8333-a1b2c3d4e5f6";
const CONCEPT_ID = "9a8b7c6d-2222-4333-8444-f6e5d4c3b2a1";

describe("extractReferencedRelations", () => {
  it("returns the relations a read statement touches", () => {
    const result = extractReferencedRelations(
      `SELECT * FROM "${DATASET_ID}" JOIN "concept_${CONCEPT_ID}" USING (id)`,
    );

    expect(result).toEqual({
      outcome: "ok",
      relations: [
        { kind: "dataset", id: DATASET_ID },
        { kind: "concept", id: CONCEPT_ID },
      ],
    });
  });

  it("reports unsupported for a mutating statement, never an empty list", () => {
    const result = extractReferencedRelations(
      `CREATE TABLE "${DATASET_ID}" AS SELECT 1`,
    );

    expect(result.outcome).toBe("unsupported");
    expect(result).not.toHaveProperty("relations");
  });

  it("reports unsupported for SQL it cannot analyze safely", () => {
    const result = extractReferencedRelations(
      `SELECT * FROM read_csv('${DATASET_ID}.csv')`,
    );

    expect(result.outcome).toBe("unsupported");
    expect(result).not.toHaveProperty("relations");
  });

  it("reports unsupported for an empty statement", () => {
    expect(extractReferencedRelations("").outcome).toBe("unsupported");
  });
});
