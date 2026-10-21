import {
  getAdvancedCheckpoint,
  isCrawlContiguousWithCheckpoint,
} from "@etl/EtlEngine/checkpointRules/checkpointRules";
import { describe, expect, it } from "vitest";

function _at(minute: number): Date {
  return new Date(Date.UTC(2026, 9, 1, 0, minute));
}

describe("isCrawlContiguousWithCheckpoint", () => {
  it("lets a crawl from the start advance, with or without a checkpoint", () => {
    expect([
      isCrawlContiguousWithCheckpoint({
        windowSince: undefined,
        storedCheckpoint: undefined,
      }),
      isCrawlContiguousWithCheckpoint({
        windowSince: undefined,
        storedCheckpoint: _at(5),
      }),
    ]).toEqual([true, true]);
  });

  it("lets a crawl starting at or before the checkpoint advance", () => {
    expect([
      isCrawlContiguousWithCheckpoint({
        windowSince: _at(5),
        storedCheckpoint: _at(5),
      }),
      isCrawlContiguousWithCheckpoint({
        windowSince: _at(1),
        storedCheckpoint: _at(5),
      }),
    ]).toEqual([true, true]);
  });

  it("stops a crawl starting after the checkpoint from advancing", () => {
    expect(
      isCrawlContiguousWithCheckpoint({
        windowSince: _at(9),
        storedCheckpoint: _at(5),
      }),
    ).toBe(false);
  });

  it("stops a crawl from an explicit since from creating a checkpoint", () => {
    expect(
      isCrawlContiguousWithCheckpoint({
        windowSince: _at(9),
        storedCheckpoint: undefined,
      }),
    ).toBe(false);
  });
});

describe("getAdvancedCheckpoint", () => {
  const SYNCED_AT = _at(30);

  it("moves to the page's newest timestamp", () => {
    expect(
      getAdvancedCheckpoint({
        current: _at(1),
        pageTimestamps: [_at(2), _at(4), _at(3)],
        syncedAt: SYNCED_AT,
      }),
    ).toEqual(_at(4));
  });

  it("creates a checkpoint where there was none", () => {
    expect(
      getAdvancedCheckpoint({
        current: undefined,
        pageTimestamps: [_at(2)],
        syncedAt: SYNCED_AT,
      }),
    ).toEqual(_at(2));
  });

  it("ignores a timestamp later than the sync time", () => {
    expect(
      getAdvancedCheckpoint({
        current: undefined,
        pageTimestamps: [_at(2), _at(90)],
        syncedAt: SYNCED_AT,
      }),
    ).toEqual(_at(2));
  });

  it("does not move for a page no later than the checkpoint", () => {
    expect([
      getAdvancedCheckpoint({
        current: _at(5),
        pageTimestamps: [_at(5)],
        syncedAt: SYNCED_AT,
      }),
      getAdvancedCheckpoint({
        current: _at(5),
        pageTimestamps: [_at(2)],
        syncedAt: SYNCED_AT,
      }),
    ]).toEqual([undefined, undefined]);
  });

  it("does not move for an empty page or one of only future timestamps", () => {
    expect([
      getAdvancedCheckpoint({
        current: undefined,
        pageTimestamps: [],
        syncedAt: SYNCED_AT,
      }),
      getAdvancedCheckpoint({
        current: undefined,
        pageTimestamps: [_at(90)],
        syncedAt: SYNCED_AT,
      }),
    ]).toEqual([undefined, undefined]);
  });
});
