/** Stale generations must not run offline SQL validation. */
import { describe, expect, it, vi } from "vitest";
import { createGenerationAwareExecuteSql } from "./createGenerationAwareExecuteSql";

describe("createGenerationAwareExecuteSql", () => {
  it("delegates when generation is current", async () => {
    const executeSql = vi.fn(async () => {
      return { ok: true as const };
    });
    const wrapped = createGenerationAwareExecuteSql(executeSql, () => {
      return false;
    });

    await expect(wrapped("select 1")).resolves.toEqual({ ok: true });
    expect(executeSql).toHaveBeenCalledWith("select 1");
  });

  it("skips the executor when generation is stale", async () => {
    const executeSql = vi.fn(async () => {
      return { ok: true as const };
    });
    const wrapped = createGenerationAwareExecuteSql(executeSql, () => {
      return true;
    });

    await expect(wrapped("select 1")).resolves.toEqual({ ok: true });
    expect(executeSql).not.toHaveBeenCalled();
  });
});
