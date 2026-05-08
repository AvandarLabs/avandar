import { matchModel } from "@models/Model/matchModel/matchModel.ts";
import { Model } from "@models/Model/Model.ts";
import { describe, expect, it } from "vitest";

describe("matchModel", () => {
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
    const result = matchModel(user as User | Admin, {
      User: (model) => {
        return `user:${model.name}`;
      },
      Admin: (model) => {
        return `admin:${model.level}`;
      },
    });

    expect(result).toBe("user:Alice");
  });

  it("calls the correct branch for each type", () => {
    const result = matchModel(admin as User | Admin, {
      User: (model) => {
        return `user:${model.name}`;
      },
      Admin: (model) => {
        return `admin:${model.level}`;
      },
    });

    expect(result).toBe("admin:3");
  });

  it("returns static string values when configured", () => {
    const result = matchModel(user as User | Admin, {
      User: "user",
      Admin: "admin",
    });

    expect(result).toBe("user");
  });

  it("returns static number values when configured", () => {
    const result = matchModel(admin as User | Admin, {
      User: 10,
      Admin: 20,
    });

    expect(result).toBe(20);
  });

  it("returns static object values when configured", () => {
    const userValue = {
      isElevated: false,
      tag: "user",
    };
    const adminValue = {
      isElevated: true,
      tag: "admin",
    };

    const result = matchModel(admin as User | Admin, {
      User: userValue,
      Admin: adminValue,
    });

    expect(result).toEqual(adminValue);
  });

  it("supports mixing functions and static values", () => {
    const result = matchModel(user as User | Admin, {
      User: (model) => {
        return model.name.length;
      },
      Admin: 0,
    });

    expect(result).toBe(5);
  });

  it("throws when no match is found", () => {
    const unknown = { __type: "Unknown" };

    expect(() => {
      return matchModel(unknown, {
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
