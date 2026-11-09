import { describe, expect, it } from "vitest";
import { validatePlaceInput } from "@/clients/places/validatePlaceInput/validatePlaceInput";

const DRAFT = {
  name: "  Restaurant, W 46th St  ",
  address: "",
  latitude: 40.7603,
  longitude: -73.9885,
  startsAt: "2026-10-02T18:00",
  endsAt: "2026-10-02T22:00",
  notes: "",
};

describe("validatePlaceInput", () => {
  it("trims the name and stores empty text as undefined", () => {
    expect(validatePlaceInput(DRAFT)).toEqual({
      type: "valid",
      input: {
        name: "Restaurant, W 46th St",
        address: undefined,
        latitude: 40.7603,
        longitude: -73.9885,
        startsAt: "2026-10-02T18:00",
        endsAt: "2026-10-02T22:00",
        notes: undefined,
      },
    });
  });

  it("drops the seconds a datetime-local input may add", () => {
    const result = validatePlaceInput({
      ...DRAFT,
      startsAt: "2026-10-02T18:00:30",
    });
    expect(result.type === "valid" ? result.input.startsAt : undefined).toBe(
      "2026-10-02T18:00",
    );
  });

  it("removes NUL characters a pasted name may carry", () => {
    const result = validatePlaceInput({ ...DRAFT, name: "Caf\u0000é" });
    expect(result.type === "valid" ? result.input.name : undefined).toBe(
      "Café",
    );
  });

  it.each([
    [{ name: "   " }, "nameRequired"],
    [{ name: "x".repeat(201) }, "nameTooLong"],
    [{ address: "x".repeat(501) }, "addressTooLong"],
    [{ notes: "x".repeat(2001) }, "notesTooLong"],
    [{ latitude: 90.0001 }, "latitudeOutOfRange"],
    [{ latitude: Number.NaN }, "latitudeOutOfRange"],
    [{ longitude: -180.5 }, "longitudeOutOfRange"],
    [{ startsAt: "10/02/2026" }, "invalidDateTime"],
    [{ endsAt: "2026-10-02T17:00" }, "endsBeforeStarts"],
  ])("refuses %o as %s", (override, reason) => {
    expect(validatePlaceInput({ ...DRAFT, ...override })).toEqual({
      type: "invalid",
      reason,
    });
  });
});
