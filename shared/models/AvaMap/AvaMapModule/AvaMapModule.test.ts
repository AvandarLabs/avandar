import { AvaMap } from "$/models/AvaMap/AvaMap.ts";
import { describe, expect, it } from "vitest";

describe("AvaMap.makeEmpty", () => {
  it("starts with no layers and the avandar basemap", () => {
    const avaMap = AvaMap.makeEmpty("Cholera cases");
    expect(avaMap.layers).toEqual([]);
    expect(avaMap.basemap).toEqual({ type: "builtIn", style: "avandar" });
    expect(avaMap.name).toBe("Cholera cases");
    expect(avaMap.view).toEqual(AvaMap.defaultViewState);
  });

  it("gives each map a distinct id", () => {
    const first = AvaMap.makeEmpty("A");
    const second = AvaMap.makeEmpty("B");
    expect(first.id).not.toBe(second.id);
  });
});
