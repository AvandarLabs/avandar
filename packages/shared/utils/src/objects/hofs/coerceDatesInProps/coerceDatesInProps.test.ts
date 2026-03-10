import { describe, expect, it } from "vitest";
import { coerceDatesInProps } from "./coerceDatesInProps.ts";

describe("coerceDatesInProps", () => {
  it("returns a function that coerces keys to dates", () => {
    type Item = { createdAt: string; name: string };
    const coerce = coerceDatesInProps<Item, "createdAt">(
      ["createdAt"],
    );

    const result = coerce({
      createdAt: "2025-01-15T00:00:00.000Z",
      name: "test",
    });

    expect(result.createdAt).toBeInstanceOf(Date);
    expect(result.name).toBe("test");
  });

  it("leaves undefined values as undefined", () => {
    type Item = {
      date: string | undefined;
      name: string;
    };
    const coerce = coerceDatesInProps<Item, "date">(
      ["date"],
    );

    const result = coerce({
      date: undefined,
      name: "test",
    });

    expect(result.date).toBeUndefined();
  });

  it("works as a mapper", () => {
    type Item = { ts: string; label: string };
    const items: Item[] = [
      { ts: "2025-01-01T00:00:00.000Z", label: "a" },
      { ts: "2025-06-01T00:00:00.000Z", label: "b" },
    ];

    const result = items.map(
      coerceDatesInProps<Item, "ts">(["ts"]),
    );

    result.forEach((item) => {
      expect(item.ts).toBeInstanceOf(Date);
    });
  });
});
