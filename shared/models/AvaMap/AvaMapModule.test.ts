import { describe, expect, it } from "vitest";
import { AvaMap } from "$/models/AvaMap/AvaMap.ts";

describe("AvaMap.makeEmpty", () => {
  it("starts with no layers and the avandar basemap", () => {
    const avaMap = AvaMap.makeEmpty({ name: "Cholera cases" });
    expect(avaMap.layers).toEqual([]);
    expect(avaMap.basemap).toEqual({ type: "builtIn", style: "avandar" });
    expect(avaMap.name).toBe("Cholera cases");
    expect(avaMap.version).toBe(1);
  });

  it("gives each map a distinct id", () => {
    const first = AvaMap.makeEmpty({ name: "A" });
    const second = AvaMap.makeEmpty({ name: "B" });
    expect(first.id).not.toBe(second.id);
  });
});
