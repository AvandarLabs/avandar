import { describe, expect, it } from "vitest";
import { Model } from "@models/Model/Model.ts";

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

describe("Model.match", () => {
  type User = Model.Base<"User", { id: string; name: string }>;
  type Admin = Model.Base<"Admin", { id: string; level: number }>;

  const user: User = {
    __type: "User",
    id: "u1",
    name: "Alice",
  };

  const admin: Admin = {
    __type: "Admin",
    id: "a1",
    level: 3,
  };

  it("calls the function matching the model type", () => {
    const result = Model.match(user as User | Admin, {
      User: (m) => {
        return `user:${m.name}`;
      },
      Admin: (m) => {
        return `admin:${m.level}`;
      },
    });

    expect(result).toBe("user:Alice");
  });

  it("calls the correct branch for each type", () => {
    const result = Model.match(admin as User | Admin, {
      User: (m) => {
        return `user:${m.name}`;
      },
      Admin: (m) => {
        return `admin:${m.level}`;
      },
    });

    expect(result).toBe("admin:3");
  });

  it("throws when no match is found", () => {
    const unknown = { __type: "Unknown" };

    expect(() => {
      return Model.match(unknown, {
        User: () => {
          return "user";
        },
        Admin: () => {
          return "admin";
        },
      });
    }).toThrow("No match found for model type: Unknown");
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
