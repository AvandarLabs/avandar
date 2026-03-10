import { describe, expect, it } from "vitest";
import { convertDatesToISOInProps } from "./convertDatesToISOInProps.ts";

describe("convertDatesToISOInProps", () => {
  it("returns a function that converts dates to ISO strings", () => {
    type Item = { createdAt: Date; name: string };
    const convert = convertDatesToISOInProps<Item, "createdAt">(["createdAt"]);

    const result = convert({
      createdAt: new Date("2025-06-15T12:00:00.000Z"),
      name: "test",
    });

    expect(result.createdAt).toBe("2025-06-15T12:00:00.000Z");
    expect(result.name).toBe("test");
  });

  it("leaves undefined values unchanged", () => {
    type Item = {
      date: Date | undefined;
      name: string;
    };
    const convert = convertDatesToISOInProps<Item, "date">(["date"]);

    const result = convert({
      date: undefined,
      name: "test",
    });

    expect(result.date).toBeUndefined();
  });

  it("works as a mapper", () => {
    type Item = { ts: Date; label: string };
    const items: Item[] = [
      {
        ts: new Date("2025-01-01T00:00:00.000Z"),
        label: "a",
      },
      {
        ts: new Date("2025-06-01T00:00:00.000Z"),
        label: "b",
      },
    ];

    const result = items.map(convertDatesToISOInProps<Item, "ts">(["ts"]));

    expect(result[0]?.ts).toBe("2025-01-01T00:00:00.000Z");
    expect(result[1]?.ts).toBe("2025-06-01T00:00:00.000Z");
  });
});
