import { Model } from "@models/Model/Model.ts";
import { describe, expect, it } from "vitest";

describe("Model.make", () => {
  it("creates a model with the given type and props", () => {
    const model = Model.make("User", { id: "abc", name: "Alice" });

    expect(model).toEqual({
      __type: "User",
      id: "abc",
      name: "Alice",
    });
  });

  it("sets __type to the given model type", () => {
    const model = Model.make("Admin", { role: "superadmin" });

    expect(model.__type).toBe("Admin");
  });
});

describe("Model.getTypedId", () => {
  it("returns an object with __type and id only", () => {
    type Item = Model.Base<"Item", { id: string; data: number }>;
    const item: Item = {
      __type: "Item",
      id: "item-1",
      data: 42,
    };

    const typedId = Model.getTypedId(item);

    expect(typedId).toEqual({
      __type: "Item",
      id: "item-1",
    });
  });

  it("does not include other model properties", () => {
    type Thing = Model.Base<"Thing", { id: string; extra: string }>;
    const thing: Thing = {
      __type: "Thing",
      id: "t-1",
      extra: "should not appear",
    };

    const typedId = Model.getTypedId(thing);

    expect(typedId).not.toHaveProperty("extra");
  });
});
