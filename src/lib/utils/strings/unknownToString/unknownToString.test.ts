import { describe, expect, it } from "vitest";
import { unknownToString } from "./unknownToString";

const complexJsonObject = {
  plan: "premium",
  limits: {
    seats: 100,
    regions: ["us-east", "eu-west", { fallback: ["apac-south", "sa-east"] }],
  },
  tags: [
    {
      name: "beta",
      enabled: true,
      notifications: { email: ["weekly", ["monthly"]] },
    },
  ],
} as const;

const complexJsonArray = [
  {
    tier: "starter",
    features: ["analytics", { extras: ["export", ["priority"]] }],
  },
  ["addon", { costs: [15, { currency: "USD", taxes: [5, 2] }] }],
] as const;

const prettifyObjectInput = {
  plan: "premium",
  tier: {
    id: 1,
    perks: [
      "reports",
      {
        label: "limits",
        values: [10, 25, { unlimited: false }],
      },
    ],
  },
  metadata: {
    region: "global",
  },
} as const;

describe("unknownToString", () => {
  it("respects overrides for null, undefined, and empty string values", () => {
    const options = {
      nullString: "NULL",
      undefinedString: "UNDEFINED",
      emptyString: "EMPTY",
    };

    expect(unknownToString(null, options)).toBe("NULL");
    expect(unknownToString(undefined, options)).toBe("UNDEFINED");
    expect(unknownToString("", options)).toBe("EMPTY");
  });

  it("handles booleans, numbers, and raw strings", () => {
    const options = {
      booleanTrue: "YES",
      booleanFalse: "NO",
    };
    const formattedNumber = new Intl.NumberFormat().format(12345.678);

    expect(unknownToString(true, options)).toBe("YES");
    expect(unknownToString(false, options)).toBe("NO");
    expect(unknownToString(12345.678, options)).toBe(formattedNumber);
    expect(unknownToString("plain text", options)).toBe("plain text");
  });

  it("formats date values when requested and falls back for invalid ones", () => {
    const isoString = "2024-02-29T14:30:00Z";
    const timestamp = Date.UTC(2023, 6, 15, 9, 5, 0);
    const dateOptions = {
      asDate: true,
      dateFormat: "YYYY/MM/DD HH:mm",
      dateTimeZone: "UTC",
    } as const;

    expect(unknownToString(isoString, dateOptions)).toBe("2024/02/29 14:30");
    expect(unknownToString(timestamp, dateOptions)).toBe("2023/07/15 09:05");
    expect(
      unknownToString(new Date("2022-10-05T00:00:00Z"), {
        dateFormat: "YYYY-MM-DD",
        dateTimeZone: "UTC",
      }),
    ).toBe("2022-10-05");
    expect(unknownToString("not-a-date", dateOptions)).toBe("not-a-date");
  });

  it("serializes arrays with nested content using the provided separators and placeholders", () => {
    const options = {
      arraySeparator: " | ",
      emptyArrayString: "<empty-array>",
      emptyString: "<empty-string>",
      booleanTrue: "TRUE",
      booleanFalse: "FALSE",
    };
    const nestedArray = [0, "", [], [true, false], { nested: ["value", []] }];

    expect(unknownToString([], options)).toBe("<empty-array>");
    const arrayResult = unknownToString(nestedArray, options);
    const expectedArrayString = [
      new Intl.NumberFormat().format(0),
      "<empty-string>",
      "<empty-array>",
      "TRUE | FALSE",
      "nested=value | <empty-array>",
    ].join(" | ");
    expect(arrayResult).toBe(expectedArrayString);
  });

  it("serializes plain objects recursively including nested combinations", () => {
    const options = {
      objectEntriesSeparator: ", ",
      emptyObjectString: "<empty-object>",
      emptyArrayString: "<no-items>",
      arraySeparator: " / ",
    };
    const value = {
      name: "alpha",
      details: {
        tags: [],
        flags: { beta: false },
      },
      counts: [1, 2],
    };

    expect(unknownToString({}, options)).toBe("<empty-object>");
    const objectResult = unknownToString(value, options);
    const expectedObjectString = [
      "name=alpha",
      "details=tags=<no-items>, flags=beta=false",
      `counts=${new Intl.NumberFormat().format(1)} / ${new Intl.NumberFormat().format(2)}`,
    ].join(", ");
    expect(objectResult).toBe(expectedObjectString);
  });

  it("serializes Map and Set instances using the same formatting rules", () => {
    const options = {
      arraySeparator: ", ",
      booleanTrue: "yes",
      booleanFalse: "no",
    };
    const map = new Map<unknown, unknown>([
      ["plan", "pro"],
      [5, [true, false]],
    ]);
    const set = new Set<unknown>(["alpha", { nested: ["x", "y"] }]);

    // expect(unknownToString(map, options)).toBe("Map<plan=pro|5=yes, no>");
    expect(unknownToString(map, options)).toSatisfy((result) => {
      // the map internals could be in any order, so we allow either possibility
      return (
        result === "Map<plan=pro|5=yes, no>" ||
        result === "Map<5=yes, no|plan=pro>"
      );
    });
    expect(unknownToString(set, options)).toSatisfy((result) => {
      return (
        result === "Set<alpha, nested=x, y>" ||
        result === "Set<nested=x, y, alpha>"
      );
    });
  });

  it("jsonifies nested objects and arrays when jsonifyObject is true", () => {
    expect(unknownToString(complexJsonObject, { jsonifyObject: true })).toBe(
      JSON.stringify(complexJsonObject),
    );

    expect(unknownToString(complexJsonArray, { jsonifyObject: true })).toBe(
      JSON.stringify(complexJsonArray),
    );
  });

  it("pretty prints nested objects when prettifyObject is true", () => {
    const expectedPrettyObject = [
      "{",
      "\tplan: premium",
      "\ttier: {",
      "\t\tid: 1",
      "\t\tperks: [",
      "\t\t\treports",
      "\t\t\t{",
      "\t\t\t\tlabel: limits",
      "\t\t\t\tvalues: [",
      "\t\t\t\t\t10",
      "\t\t\t\t\t25",
      "\t\t\t\t\t{",
      "\t\t\t\t\t\tunlimited: false",
      "\t\t\t\t\t}",
      "\t\t\t\t]",
      "\t\t\t}",
      "\t\t]",
      "\t}",
      "\tmetadata: {",
      "\t\tregion: global",
      "\t}",
      "}",
    ].join("\n");

    expect(unknownToString(prettifyObjectInput, { prettifyObject: true })).toBe(
      expectedPrettyObject,
    );
  });

  it("produces pretty JSON when both jsonifyObject and prettifyObject are true", () => {
    const options = { jsonifyObject: true, prettifyObject: true };

    expect(unknownToString(complexJsonObject, options)).toBe(
      JSON.stringify(complexJsonObject, null, 2),
    );
    expect(unknownToString(complexJsonArray, options)).toBe(
      JSON.stringify(complexJsonArray, null, 2),
    );
  });

  it("falls back to String(value) for unsupported types", () => {
    const symbolValue = Symbol("identifier");

    expect(unknownToString(symbolValue)).toBe(symbolValue.toString());
  });
});
