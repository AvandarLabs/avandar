import { describe, expect, it } from "vitest";
import { convertDatesToISOIn } from "@utils/objects/convertDatesToISOIn/convertDatesToISOIn.ts";

describe("convertDatesToISOIn", () => {
  it("converts a Date to an ISO string", () => {
    const date = new Date("2025-06-15T12:00:00.000Z");
    const input = { createdAt: date, name: "test" };

    const result = convertDatesToISOIn(
      input,
      ["createdAt"],
    );

    expect(result.createdAt).toBe(
      "2025-06-15T12:00:00.000Z",
    );
    expect(result.name).toBe("test");
  });

  it("converts multiple Date keys", () => {
    const start = new Date("2025-01-01T00:00:00.000Z");
    const end = new Date("2025-12-31T00:00:00.000Z");
    const input = {
      start,
      end,
      title: "event",
    };

    const result = convertDatesToISOIn(
      input,
      ["start", "end"],
    );

    expect(result.start).toBe(
      "2025-01-01T00:00:00.000Z",
    );
    expect(result.end).toBe(
      "2025-12-31T00:00:00.000Z",
    );
    expect(result.title).toBe("event");
  });

  it("leaves undefined values unchanged", () => {
    const input: {
      date: Date | undefined;
      name: string;
    } = {
      date: undefined,
      name: "test",
    };

    const result = convertDatesToISOIn(
      input,
      ["date"],
    );

    expect(result.date).toBeUndefined();
    expect(result.name).toBe("test");
  });

  it("does not modify keys not in the list", () => {
    const date = new Date("2025-01-01T00:00:00.000Z");
    const otherDate = new Date("2025-06-01T00:00:00.000Z");
    const input = { a: date, b: otherDate };

    const result = convertDatesToISOIn(input, ["a"]);

    expect(typeof result.a).toBe("string");
    expect(result.b).toBe(otherDate);
  });

  it("returns a new object and does not mutate the input", () => {
    const date = new Date("2025-01-01T00:00:00.000Z");
    const input = { createdAt: date, name: "test" };
    const copy = { ...input };

    const result = convertDatesToISOIn(
      input,
      ["createdAt"],
    );

    expect(result).not.toBe(input);
    expect(input).toEqual(copy);
  });

  it("handles an empty keys array", () => {
    const date = new Date("2025-01-01T00:00:00.000Z");
    const input = { a: date, b: 2 };

    const result = convertDatesToISOIn(input, []);

    expect(result.a).toBe(date);
    expect(result.b).toBe(2);
  });
});
