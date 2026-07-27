import { makeParserRegistry } from "@clients/makeParserRegistry.ts";
import { describe, expect, it } from "vitest";
import { z } from "zod";

type UnionRow =
  | { id: string; kind: "text"; text: string }
  | { id: string; kind: "point"; x: number; y: number };

type UnionModelSpec = {
  modelName: "UnionModel";
  modelPrimaryKeyType: string;
  DBRead: UnionRow;
  DBInsert: UnionRow;
  DBUpdate: Partial<UnionRow>;
  Read: UnionRow;
  Insert: UnionRow;
  Update: Partial<UnionRow>;
};

const TextSchema = z
  .object({
    id: z.string(),
    kind: z.literal("text"),
    text: z.string(),
  })
  .strict();

const PointSchema = z
  .object({
    id: z.string(),
    kind: z.literal("point"),
    x: z.number(),
    y: z.number(),
  })
  .strict();

const DBReadSchema = z.discriminatedUnion("kind", [TextSchema, PointSchema]);

describe("makeParserRegistry", () => {
  it("supports an explicit key list for discriminated-union schemas", () => {
    const parsers = makeParserRegistry<UnionModelSpec>().build({
      modelName: "UnionModel",
      DBReadSchema,
      dbKeys: ["id", "kind", "text", "x", "y"],
      fromDBReadToModelRead: (row) => {
        return row;
      },
      fromModelInsertToDBInsert: (row) => {
        return row;
      },
      fromModelUpdateToDBUpdate: (update) => {
        return update;
      },
    });
    const point: UnionRow = {
      id: "point-1",
      kind: "point",
      x: 10,
      y: 20,
    };

    expect(parsers.fromDBReadToModelRead(point)).toEqual(point);
    expect(parsers.fromModelInsertToDBInsert(point)).toEqual(point);
    expect(
      parsers.fromModelUpdateToDBUpdate({ kind: "point", x: 30, y: 40 }),
    ).toEqual({ kind: "point", x: 30, y: 40 });
  });

  it("keeps discriminated-union reads strict", () => {
    const parsers = makeParserRegistry<UnionModelSpec>().build({
      modelName: "UnionModel",
      DBReadSchema,
      dbKeys: ["id", "kind", "text", "x", "y"],
      fromDBReadToModelRead: (row) => {
        return row;
      },
      fromModelInsertToDBInsert: (row) => {
        return row;
      },
      fromModelUpdateToDBUpdate: (update) => {
        return update;
      },
    });

    expect(() => {
      parsers.fromDBReadToModelRead({
        id: "text-1",
        kind: "text",
        text: "hello",
        x: 10,
      } as UnionRow);
    }).toThrow();
  });
});
