import { describe, expect, it } from "vitest";
import { coerceDatesIn } from "@utils/objects/coerceDatesIn/coerceDatesIn.ts";

describe("coerceDatesIn", () => {
  it("coerces an ISO string into a Date", () => {
    const input = { createdAt: "2025-01-15T00:00:00.000Z", name: "test" };

    const result = coerceDatesIn(input, ["createdAt"]);

    expect(result.createdAt).toBeInstanceOf(Date);
    expect(result.createdAt.toISOString()).toBe(
      "2025-01-15T00:00:00.000Z",
    );
    expect(result.name).toBe("test");
  });

  it("coerces a numeric timestamp into a Date", () => {
    const timestamp = 1705276800000;
    const input = { ts: timestamp, label: "event" };

    const result = coerceDatesIn(input, ["ts"]);

    expect(result.ts).toBeInstanceOf(Date);
    expect(result.ts.getTime()).toBe(timestamp);
    expect(result.label).toBe("event");
  });

  it("coerces multiple keys", () => {
    const input = {
      start: "2025-01-01T00:00:00.000Z",
      end: "2025-12-31T00:00:00.000Z",
      title: "event",
    };

    const result = coerceDatesIn(
      input,
      ["start", "end"],
    );

    expect(result.start).toBeInstanceOf(Date);
    expect(result.end).toBeInstanceOf(Date);
    expect(result.title).toBe("event");
  });

  it("leaves undefined values as undefined", () => {
    const input: { date: string | undefined; name: string } = {
      date: undefined,
      name: "test",
    };

    const result = coerceDatesIn(input, ["date"]);

    expect(result.date).toBeUndefined();
    expect(result.name).toBe("test");
  });

  it("does not modify keys not in the list", () => {
    const input = {
      a: "2025-01-01T00:00:00.000Z",
      b: "not-a-date",
    };

    const result = coerceDatesIn(input, ["a"]);

    expect(result.a).toBeInstanceOf(Date);
    expect(result.b).toBe("not-a-date");
  });

  it("returns a new object and does not mutate the input", () => {
    const input = { createdAt: "2025-01-01T00:00:00.000Z" };
    const copy = { ...input };

    const result = coerceDatesIn(input, ["createdAt"]);

    expect(result).not.toBe(input);
    expect(input).toEqual(copy);
  });

  it("handles an empty keys array", () => {
    const input = { a: "2025-01-01", b: 2 };

    const result = coerceDatesIn(input, []);

    expect(result).toEqual({ a: "2025-01-01", b: 2 });
  });
});
