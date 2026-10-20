import { resolveRunWindow } from "@etl/EtlEngine/resolveRunWindow/resolveRunWindow";
import { describe, expect, it } from "vitest";

const HIGH_WATER_MARK = new Date("2026-10-01T00:00:00.000Z");
const SINCE = new Date("2026-09-01T00:00:00.000Z");
const UNTIL = new Date("2026-10-15T00:00:00.000Z");

describe("resolveRunWindow", () => {
  it("starts an incremental run at the high-water mark", () => {
    expect(
      resolveRunWindow({
        options: { mode: "incremental" },
        highWaterMark: HIGH_WATER_MARK,
      }),
    ).toEqual({ since: HIGH_WATER_MARK, until: undefined });
  });

  it("starts an incremental run with no high-water mark at no lower bound", () => {
    expect(
      resolveRunWindow({
        options: { mode: "incremental" },
        highWaterMark: undefined,
      }),
    ).toEqual({ since: undefined, until: undefined });
  });

  it("starts a full run at no lower bound even when there is a high-water mark", () => {
    expect(
      resolveRunWindow({
        options: { mode: "full" },
        highWaterMark: HIGH_WATER_MARK,
      }),
    ).toEqual({ since: undefined, until: undefined });
  });

  it("lets an explicit since win over the high-water mark", () => {
    expect(
      resolveRunWindow({
        options: { mode: "incremental", since: SINCE },
        highWaterMark: HIGH_WATER_MARK,
      }).since,
    ).toEqual(SINCE);
  });

  it("uses an explicit since as a full run's lower bound", () => {
    expect(
      resolveRunWindow({
        options: { mode: "full", since: SINCE },
        highWaterMark: undefined,
      }).since,
    ).toEqual(SINCE);
  });

  it("passes until through as the upper bound", () => {
    expect(
      resolveRunWindow({
        options: { mode: "full", until: UNTIL },
        highWaterMark: undefined,
      }).until,
    ).toEqual(UNTIL);
  });
});
