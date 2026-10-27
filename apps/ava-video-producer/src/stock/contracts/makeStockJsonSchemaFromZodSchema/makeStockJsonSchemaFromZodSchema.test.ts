/** Runtime-versus-structural acceptance witnesses for tuple export. */
import assert from "node:assert/strict";
import test from "node:test";
import { prop } from "@avandar/utils";
import { z } from "zod";
import { stockContracts } from "../../registry/stockContracts";
import { makeStockJsonSchemaFromZodSchema } from "./makeStockJsonSchemaFromZodSchema";
import type { StockJsonSchema } from "../StockContract.types";

function _acceptsArray({
  schema,
  value,
}: {
  schema: Readonly<StockJsonSchema>;
  value: unknown;
}): boolean {
  if (
    !Array.isArray(value) ||
    value.length < (schema.minItems ?? 0) ||
    value.length > (schema.maxItems ?? Infinity)
  ) {
    return false;
  }
  return value.every((item, index) =>
    _accepts({
      schema:
        schema.prefixItems?.[index] ??
        (schema.items as StockJsonSchema | boolean) ??
        true,
      value: item,
    }),
  );
}

// Evaluate the JSON Schema keywords these tuple witnesses exercise. Importing
// through Zod would restore implicit tuple bounds and hide missing JSON bounds.
function _accepts({
  schema,
  value,
}: {
  schema: StockJsonSchema | boolean;
  value: unknown;
}): boolean {
  if (typeof schema === "boolean") {
    return schema;
  }
  if (schema.anyOf) {
    return schema.anyOf.some((branch) => _accepts({ schema: branch, value }));
  }
  if (schema.type === "array") {
    return _acceptsArray({ schema, value });
  }
  if (schema.type === "object") {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      return false;
    }
    const record = value as Record<string, unknown>;
    return (
      (schema.required ?? []).every((key) => Object.hasOwn(record, key)) &&
      Object.entries(schema.properties ?? {}).every(
        ([key, child]) =>
          !Object.hasOwn(record, key) ||
          _accepts({ schema: child, value: record[key] }),
      )
    );
  }
  if (schema.type === "null") {
    return value === null;
  }
  if (
    schema.type === "string" ||
    schema.type === "number" ||
    schema.type === "boolean"
  ) {
    return typeof value === schema.type;
  }
  throw new Error(
    `Unsupported tuple witness schema: ${JSON.stringify(schema)}`,
  );
}

const CASES = [
  {
    name: "fixed heterogeneous",
    schema: z.tuple([z.string(), z.number()]),
    values: [[], ["a"], ["a", 2], [2, "a"], ["a", 2, 3]],
  },
  {
    name: "optional tail",
    schema: z.tuple([z.string(), z.number().optional()]),
    values: [[], ["a"], ["a", 2], ["a", null], ["a", 2, 3]],
  },
  {
    name: "optional prefix before required",
    schema: z.tuple([z.string().optional(), z.number()]),
    values: [[], ["a"], ["a", 2], ["a", 2, 3]],
  },
  {
    name: "typed rest",
    schema: z.tuple([z.string()], z.number()),
    values: [[], ["a"], ["a", 2, 3], ["a", "b"]],
  },
  {
    name: "optional tail with typed rest",
    schema: z.tuple([z.string(), z.number().optional()], z.boolean()),
    values: [[], ["a"], ["a", 2], ["a", 2, true], ["a", 2, "b"]],
  },
  { name: "empty", schema: z.tuple([]), values: [[], [1]] },
  {
    name: "empty prefix with typed rest",
    schema: z.tuple([]).rest(z.number()),
    values: [[], [1], [1, 2], ["a"], [1, "a"]],
  },
  {
    name: "nested nullable",
    schema: z.object({
      points: z.array(z.tuple([z.number(), z.number()])).nullable(),
    }),
    values: [
      { points: null },
      { points: [[1, 2]] },
      { points: [[1]] },
      { points: [[1, 2, 3]] },
    ],
  },
] satisfies Array<{ name: string; schema: z.ZodType; values: unknown[] }>;

CASES.forEach(({ name, schema, values }) => {
  test(`structural ${name} tuples preserve JSON input acceptance`, () => {
    const structural = makeStockJsonSchemaFromZodSchema(schema);
    values.forEach((value) =>
      assert.equal(
        _accepts({ schema: structural, value }),
        schema.safeParse(value).success,
        JSON.stringify(value),
      ),
    );
  });
});

test("empty fixed tuples omit the invalid empty prefixItems keyword", () => {
  const structural = makeStockJsonSchemaFromZodSchema(z.tuple([]));
  assert.equal(Object.hasOwn(structural, "prefixItems"), false);
  assert.equal(structural.minItems, 0);
  assert.equal(structural.maxItems, 0);
  assert.equal(structural.items, false);
});

test("empty-prefix rest tuples omit prefixItems while retaining typed items", () => {
  const structural = makeStockJsonSchemaFromZodSchema(
    z.tuple([]).rest(z.number()),
  );
  assert.equal(Object.hasOwn(structural, "prefixItems"), false);
  assert.equal(structural.minItems, 0);
  assert.equal(Object.hasOwn(structural, "maxItems"), false);
  assert.deepEqual(structural.items, { type: "number" });
});

test("unrepresentable transforms fail instead of emitting permissive schemas", () => {
  assert.throws(
    () => makeStockJsonSchemaFromZodSchema(z.string().transform(Number)),
    /transform/i,
  );
});

test("registry tuple dimensions and coordinates reject missing or extra members", () => {
  const checks = [
    {
      id: "nested-drilldown-window" as const,
      field: "dimensions",
      values: [["one"], ["one", "two", "three"]],
    },
    {
      id: "geometry-detail-budget" as const,
      field: "vertices",
      values: [
        [[10], [20, 20], [30, 30]],
        [
          [10, 10, 10],
          [20, 20],
          [30, 30],
        ],
      ],
    },
  ];
  checks.forEach(({ id, field, values }) => {
    const contract = stockContracts[id];
    const structural = contract.jsonSchema;
    assert.equal(
      _accepts({ schema: structural, value: contract.defaultInput }),
      true,
      id,
    );
    values.forEach((value) => {
      const input = { ...contract.defaultInput, [field]: value };
      assert.equal(contract.inputSchema.safeParse(input).success, false, id);
      assert.equal(_accepts({ schema: structural, value: input }), false, id);
    });
  });
});

test("editor coordinate item schemas reject missing and extra coordinates", () => {
  const control = stockContracts["geometry-detail-budget"].controls.find(
    ({ path }) => path === "vertices",
  );
  assert.ok(control?.kind === "collection");
  const structural = control.itemSchema;
  assert.equal(_accepts({ schema: structural, value: [10, 20] }), true);
  assert.equal(_accepts({ schema: structural, value: [10] }), false);
  assert.equal(_accepts({ schema: structural, value: [10, 20, 30] }), false);
});

function _tupleSchemas(value: unknown): StockJsonSchema[] {
  if (!value || typeof value !== "object") {
    return [];
  }
  const record = value as Record<string, unknown>;
  return [
    ...(Array.isArray(record.prefixItems) ? [record as StockJsonSchema] : []),
    ...Object.values(record).flatMap(_tupleSchemas),
  ];
}

test("all 170 contract and recursive editor schemas preserve fixed tuple lengths", () => {
  const withTuples = Object.values(stockContracts).filter((contract) => {
    const tuples = _tupleSchemas([contract.jsonSchema, contract.controls]);
    tuples.forEach((schema) => {
      assert.equal(schema.minItems, schema.prefixItems?.length, contract.id);
      assert.equal(schema.maxItems, schema.prefixItems?.length, contract.id);
    });
    return tuples.length > 0;
  });
  assert.deepEqual(withTuples.map(prop("id")).sort(), [
    "catchment-union-gaps",
    "document-region-drift-check",
    "geometry-detail-budget",
    "gis-layer-intersection-tally",
    "location-uncertainty-boundary",
    "nested-drilldown-window",
    "network-graph",
    "node-traversal",
    "population-normalized-map",
    "stratified-spatial-sample",
  ]);
});

test("the existing document-region box override retains four positional numbers", () => {
  const contract = stockContracts["document-region-drift-check"];
  const [box] = _tupleSchemas(contract.jsonSchema);
  [
    [10, 20, 30],
    [10, 20, 30, 40, 50],
    [10, 20, "30", 40],
    [10, 20, 30, 40],
  ].forEach((coordinates) => {
    const input = {
      ...contract.defaultInput,
      saved: { ...contract.defaultInput.saved, box: coordinates },
    };
    assert.equal(
      _accepts({ schema: box, value: coordinates }),
      contract.inputSchema.safeParse(input).success,
    );
  });
});
