import { makeParserRegistry } from "@clients/makeParserRegistry/makeParserRegistry.ts";
import { describe, expect, it } from "vitest";
import { z } from "zod";

type UnionRow =
  | { id: string; kind: "text"; text: string }
  | { id: string; kind: "point"; x: number; y: number };

type SparseRow = {
  id: string;
  label: string;
  note: string | undefined;
  count: number | undefined;
};

type SparseModelSpec = {
  modelName: "SparseModel";
  modelPrimaryKeyType: string;
  DBRead: SparseRow;
  DBInsert: SparseRow;
  DBUpdate: Partial<SparseRow>;
  Read: SparseRow;
  Insert: SparseRow;
  Update: Partial<SparseRow>;
};

const SparseDBReadSchema = z.object({
  id: z.string(),
  label: z.string(),
  note: z.union([z.string(), z.undefined()]),
  count: z.union([z.number(), z.undefined()]),
});

function _makeSparseParsers() {
  return makeParserRegistry<SparseModelSpec>().build({
    modelName: "SparseModel",
    DBReadSchema: SparseDBReadSchema,
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
}

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

const TextSchema = z.strictObject({
  id: z.string(),
  kind: z.literal("text"),
  text: z.string(),
});

const PointSchema = z.strictObject({
  id: z.string(),
  kind: z.literal("point"),
  x: z.number(),
  y: z.number(),
});

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

  it("reads a row whose undefinable keys are absent", () => {
    const parsers = _makeSparseParsers();

    // Document stores hold sparse rows: `fromModelInsertToDBInsert` strips
    // `undefined` values on the way in, and Dexie's `Table.update` deletes a
    // property whose new value is `undefined`. Either way the key is gone.
    expect(
      parsers.fromDBReadToModelRead({ id: "a", label: "A" } as SparseRow),
    ).toEqual({
      id: "a",
      label: "A",
      note: undefined,
      count: undefined,
    });
  });

  it("still rejects a row missing a required key", () => {
    const parsers = _makeSparseParsers();

    expect(() => {
      parsers.fromDBReadToModelRead({ id: "a" } as SparseRow);
    }).toThrow();
  });
});
