import { describe, expect, it } from "vitest";
import {
  makeRelationId,
  splitRelationId,
} from "$/connectors/postgres/postgresRelationId/postgresRelationId.ts";

describe("makeRelationId / splitRelationId", () => {
  it("round-trips a plain schema and table name", () => {
    const id = makeRelationId("public", "customers");
    expect(id).toBe("public.customers");
    expect(splitRelationId(id)).toEqual({
      schemaName: "public",
      tableName: "customers",
    });
  });

  it("round-trips a schema name containing a literal dot", () => {
    const id = makeRelationId("my.schema", "customers");
    expect(splitRelationId(id)).toEqual({
      schemaName: "my.schema",
      tableName: "customers",
    });
  });

  it("round-trips a table name containing a literal dot", () => {
    const id = makeRelationId("public", "my.table");
    expect(splitRelationId(id)).toEqual({
      schemaName: "public",
      tableName: "my.table",
    });
  });

  it("round-trips when both halves contain a literal dot", () => {
    const id = makeRelationId("my.schema", "my.table");
    expect(splitRelationId(id)).toEqual({
      schemaName: "my.schema",
      tableName: "my.table",
    });
  });

  it("round-trips a literal backslash in either half", () => {
    const id = makeRelationId("back\\slash", "my.table");
    expect(splitRelationId(id)).toEqual({
      schemaName: "back\\slash",
      tableName: "my.table",
    });
  });

  it("is not fooled by splitting on only the first or only the last dot", () => {
    // "my.schema" + "simple" would read as "my" / "schema.simple" if split
    // on the first dot, and "simple" + "my.table" would read as
    // "simple.my" / "table" if split on the last - neither positional rule
    // is correct in general, which is the whole reason this is an escaped
    // encoding rather than a split heuristic.
    expect(splitRelationId(makeRelationId("my.schema", "simple"))).toEqual({
      schemaName: "my.schema",
      tableName: "simple",
    });
    expect(splitRelationId(makeRelationId("simple", "my.table"))).toEqual({
      schemaName: "simple",
      tableName: "my.table",
    });
  });

  it("returns undefined for a relation id with no separator", () => {
    expect(splitRelationId("no-separator-here")).toBeUndefined();
  });

  it("returns undefined for an empty half", () => {
    expect(splitRelationId(".table")).toBeUndefined();
    expect(splitRelationId("schema.")).toBeUndefined();
  });
});
