import { resolveRunWindow } from "@etl/EtlEngine/resolveRunWindow/resolveRunWindow";
import { describe, expect, it } from "vitest";

const CHECKPOINT = new Date("2026-10-01T00:00:00.000Z");
const SINCE = new Date("2026-09-01T00:00:00.000Z");
const UNTIL = new Date("2026-10-15T00:00:00.000Z");

describe("resolveRunWindow", () => {
  it("starts an incremental run at the checkpoint", () => {
    expect(
      resolveRunWindow({
        options: { mode: "incremental" },
        checkpoint: CHECKPOINT,
      }),
    ).toEqual({ since: CHECKPOINT, until: undefined });
  });

  it("starts an incremental run with no checkpoint at no lower bound", () => {
    expect(
      resolveRunWindow({
        options: { mode: "incremental" },
        checkpoint: undefined,
      }),
    ).toEqual({ since: undefined, until: undefined });
  });

  it("starts a full run at no lower bound even when there is a checkpoint", () => {
    expect(
      resolveRunWindow({
        options: { mode: "full" },
        checkpoint: CHECKPOINT,
      }),
    ).toEqual({ since: undefined, until: undefined });
  });

  it("lets an explicit since win over the checkpoint", () => {
    expect(
      resolveRunWindow({
        options: { mode: "incremental", since: SINCE },
        checkpoint: CHECKPOINT,
      }).since,
    ).toEqual(SINCE);
  });

  it("uses an explicit since as a full run's lower bound", () => {
    expect(
      resolveRunWindow({
        options: { mode: "full", since: SINCE },
        checkpoint: undefined,
      }).since,
    ).toEqual(SINCE);
  });

  it("passes until through as the upper bound", () => {
    expect(
      resolveRunWindow({
        options: { mode: "full", until: UNTIL },
        checkpoint: undefined,
      }).until,
    ).toEqual(UNTIL);
  });
});
