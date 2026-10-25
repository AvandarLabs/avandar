import { describe, expect, it } from "vitest";
import {
  getRelationCallCapValue,
  isWithinRelationCallCaps,
} from "$/models/relations/RelationCapabilities/isWithinRelationCallCaps.ts";
import type { RelationRowDescriptor } from "$/models/relations/RelationCapabilities/RelationCapabilities.types.ts";

const DESCRIPTOR: RelationRowDescriptor = {
  columnCount: 3,
  estimatedRowBytes: 100,
};

describe("getRelationCallCapValue", () => {
  it("passes a flat number through unchanged", () => {
    expect(getRelationCallCapValue(500, DESCRIPTOR)).toBe(500);
  });

  it("passes 'unbounded' through unchanged", () => {
    expect(getRelationCallCapValue("unbounded", DESCRIPTOR)).toBe(
      "unbounded",
    );
  });

  it("returns the function cap's computed value for the descriptor", () => {
    const cap = (descriptor: typeof DESCRIPTOR): number => {
      return descriptor.columnCount * 10;
    };
    expect(getRelationCallCapValue(cap, DESCRIPTOR)).toBe(30);
  });
});

describe("isWithinRelationCallCaps", () => {
  it("passes when both axes are within their caps", () => {
    expect(
      isWithinRelationCallCaps({
        rowCount: 100,
        byteCount: 1000,
        maxRowsPerCall: 200,
        maxBytesPerCall: 2000,
        descriptor: DESCRIPTOR,
      }),
    ).toBe(true);
  });

  it("fails when only the row count exceeds its cap", () => {
    expect(
      isWithinRelationCallCaps({
        rowCount: 300,
        byteCount: 1000,
        maxRowsPerCall: 200,
        maxBytesPerCall: 2000,
        descriptor: DESCRIPTOR,
      }),
    ).toBe(false);
  });

  it("fails when only the byte count exceeds its cap, even if rows are fine", () => {
    expect(
      isWithinRelationCallCaps({
        rowCount: 100,
        byteCount: 5000,
        maxRowsPerCall: 200,
        maxBytesPerCall: 2000,
        descriptor: DESCRIPTOR,
      }),
    ).toBe(false);
  });

  it("never fails on an axis declared 'unbounded', regardless of the count", () => {
    expect(
      isWithinRelationCallCaps({
        rowCount: 10_000_000,
        byteCount: 1000,
        maxRowsPerCall: "unbounded",
        maxBytesPerCall: 2000,
        descriptor: DESCRIPTOR,
      }),
    ).toBe(true);
  });

  it("defers entirely to the byte cap when the row cap function cannot compute a value", () => {
    const rowCapWithNoRowWidthEstimate = (descriptor: {
      estimatedRowBytes?: number;
    }): number | "unbounded" => {
      return descriptor.estimatedRowBytes === undefined
        ? "unbounded"
        : 1_000_000;
    };
    expect(
      isWithinRelationCallCaps({
        rowCount: 10_000_000,
        byteCount: 1000,
        maxRowsPerCall: rowCapWithNoRowWidthEstimate,
        maxBytesPerCall: 2000,
        descriptor: { columnCount: 3 }, // no estimatedRowBytes
      }),
    ).toBe(true);
  });

  it("applies both axes when both resolve to real numbers, failing on whichever is hit", () => {
    const derivedRowCap = (descriptor: {
      estimatedRowBytes?: number;
    }): number | "unbounded" => {
      return descriptor.estimatedRowBytes
        ? Math.floor(2000 / descriptor.estimatedRowBytes)
        : "unbounded";
    };
    // 2000 bytes / 100 bytes-per-row = 20 rows allowed; 25 rows exceeds that,
    // even though the byte count itself (1000) is still under the byte cap.
    expect(
      isWithinRelationCallCaps({
        rowCount: 25,
        byteCount: 1000,
        maxRowsPerCall: derivedRowCap,
        maxBytesPerCall: 2000,
        descriptor: DESCRIPTOR,
      }),
    ).toBe(false);
  });
});
