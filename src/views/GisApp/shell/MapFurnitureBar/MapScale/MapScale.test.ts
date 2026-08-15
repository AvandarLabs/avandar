import { describe, expect, it } from "vitest";
import { MapScale } from "@/views/GisApp/shell/MapFurnitureBar/MapScale/MapScale";

describe("getMapScaleFromMetersPerPixel", () => {
  it("rounds the bar down to a 1, 2, or 5 times a power of ten", () => {
    expect(
      MapScale.getFromMetersPerPixel({
        metersPerPixel: 100,
        zoom: 10,
        maxWidthPx: 80,
      }),
    ).toEqual({ kind: "bar", widthPx: 50, meters: 5000 });
  });

  it("uses metres below one kilometre", () => {
    expect(
      MapScale.getFromMetersPerPixel({
        metersPerPixel: 2,
        zoom: 16,
        maxWidthPx: 80,
      }),
    ).toEqual({ kind: "bar", widthPx: 50, meters: 100 });
  });

  it("reports varying scale below zoom 4 instead of a bar", () => {
    expect(
      MapScale.getFromMetersPerPixel({
        metersPerPixel: 20000,
        zoom: 3,
        maxWidthPx: 80,
      }),
    ).toEqual({ kind: "varies" });
  });

  it("reports varying scale for non-positive or non-finite inputs", () => {
    expect(
      MapScale.getFromMetersPerPixel({
        metersPerPixel: 0,
        zoom: 10,
        maxWidthPx: 80,
      }),
    ).toEqual({ kind: "varies" });
    expect(
      MapScale.getFromMetersPerPixel({
        metersPerPixel: Number.POSITIVE_INFINITY,
        zoom: 10,
        maxWidthPx: 80,
      }),
    ).toEqual({ kind: "varies" });
    expect(
      MapScale.getFromMetersPerPixel({
        metersPerPixel: 2,
        zoom: 10,
        maxWidthPx: 0,
      }),
    ).toEqual({ kind: "varies" });
  });

  it("reports varying scale when the maximum distance overflows", () => {
    expect(
      MapScale.getFromMetersPerPixel({
        metersPerPixel: Number.MAX_VALUE,
        zoom: 10,
        maxWidthPx: 2,
      }),
    ).toEqual({ kind: "varies" });
  });

  it("reports varying scale when the maximum distance underflows", () => {
    expect(
      MapScale.getFromMetersPerPixel({
        metersPerPixel: Number.MIN_VALUE,
        zoom: 10,
        maxWidthPx: Number.MIN_VALUE,
      }),
    ).toEqual({ kind: "varies" });
  });
});
