/**
 * Go-to query parse: coordinates vs P-code vs invalid.
 */
import { describe, expect, it } from "vitest";
import { parseMapGoToQuery } from "@/views/GisApp/tools/parseMapGoToQuery/parseMapGoToQuery";

describe("parseMapGoToQuery", () => {
  it("parses a lat, lng pair when both values can be latitudes", () => {
    expect(parseMapGoToQuery("10, 20")).toEqual({
      type: "coordinate",
      latitude: 10,
      longitude: 20,
    });
  });

  it("parses a whitespace-separated lat, lng pair", () => {
    expect(parseMapGoToQuery("10 20")).toEqual({
      type: "coordinate",
      latitude: 10,
      longitude: 20,
    });
  });

  it("treats a value whose absolute value is greater than 90 as longitude", () => {
    expect(parseMapGoToQuery("120, 10")).toEqual({
      type: "coordinate",
      latitude: 10,
      longitude: 120,
    });
  });

  it("treats 91, 10 as longitude 91 and latitude 10", () => {
    expect(parseMapGoToQuery("91, 10")).toEqual({
      type: "coordinate",
      latitude: 10,
      longitude: 91,
    });
  });

  it("rejects a longitude outside [-180, 180]", () => {
    expect(parseMapGoToQuery("10, 181")).toEqual({
      type: "invalid",
      reason: "outOfRange",
    });
  });

  it("treats a non-coordinate string as a P-code", () => {
    expect(parseMapGoToQuery("COD-NK")).toEqual({
      type: "pcode",
      code: "COD-NK",
    });
  });

  it("rejects an empty query as unparsed", () => {
    expect(parseMapGoToQuery("  ")).toEqual({
      type: "invalid",
      reason: "unparsed",
    });
  });
});
