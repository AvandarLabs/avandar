import { describe, expect, it } from "vitest";
import { stripPostgresIsms } from "./transpile";

describe("stripPostgresIsms", () => {
  it("keeps a cast literal default as the bare literal", () => {
    expect(
      stripPostgresIsms(
        `ALTER TABLE "t" ADD COLUMN "v" JSONB NOT NULL DEFAULT CAST('[]' AS JSONB)`,
      ),
    ).toBe(`ALTER TABLE "t" ADD COLUMN "v" JSONB NOT NULL DEFAULT '[]'`);
  });

  it("keeps a cast literal that holds quotes and parentheses", () => {
    expect(
      stripPostgresIsms(
        `CREATE TABLE t (a TEXT DEFAULT CAST('it''s (here)' AS TEXT), b INTEGER)`,
      ),
    ).toBe(`CREATE TABLE t (a TEXT DEFAULT 'it''s (here)', b INTEGER)`);
  });

  it("stores an empty array default as an empty JSON array", () => {
    expect(
      stripPostgresIsms(
        `ALTER TABLE "t" ADD COLUMN "v" ARRAY<TEXT> NOT NULL DEFAULT CAST('{}' AS ARRAY<TEXT>)`,
      ),
    ).toBe(`ALTER TABLE "t" ADD COLUMN "v" TEXT NOT NULL DEFAULT '[]'`);
  });

  it("still drops a function default", () => {
    expect(
      stripPostgresIsms(`CREATE TABLE t (id UUID NOT NULL DEFAULT UUID())`),
    ).toBe(`CREATE TABLE t (id UUID NOT NULL)`);
  });
});
