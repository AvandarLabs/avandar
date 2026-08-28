import { describe, expect, it } from "vitest";
import { Permissions } from "$/models/Permissions/Permissions.ts";
import type { WorkspaceId } from "$/models/Workspace/Workspace.types.ts";
import type { AvaSupabaseDBClient } from "$/types/AvaSupabaseDbClient.types.ts";

const WORKSPACE_ID = "00000000-0000-4000-8000-000000000001" as WorkspaceId;

/**
 * Minimal chain mock matching `buildInitialCustomRoleGroupName` queries.
 */
function _createMockRoleGroupsDb(options: {
  nonBuiltinCount: number | null;
  isNameTaken: (name: string) => boolean;
}): AvaSupabaseDBClient {
  return {
    from(table: string) {
      if (table !== "role_groups") {
        throw new Error(`Unexpected table: ${table}`);
      }
      return {
        select(columns: string, opts?: { count?: string; head?: boolean }) {
          const isCountHead =
            columns === "*" && opts?.count === "exact" && opts?.head === true;
          if (isCountHead) {
            return {
              eq() {
                return {
                  eq() {
                    return {
                      async throwOnError() {
                        return {
                          count: options.nonBuiltinCount,
                          data: null,
                          error: null,
                        };
                      },
                    };
                  },
                };
              },
            };
          }
          return {
            eq() {
              return {
                eq(_column: string, name: string) {
                  return {
                    maybeSingle() {
                      return {
                        async throwOnError() {
                          return {
                            data: options.isNameTaken(name)
                              ? { id: "existing" }
                              : null,
                            error: null,
                          };
                        },
                      };
                    },
                  };
                },
              };
            },
          };
        },
      };
    },
  } as unknown as AvaSupabaseDBClient;
}

describe("Permissions.buildInitialCustomRoleGroupName", () => {
  it("uses Custom Role Group 1 when no non-built-in groups exist", async () => {
    const db = _createMockRoleGroupsDb({
      nonBuiltinCount: 0,
      isNameTaken: () => {
        return false;
      },
    });
    const name = await Permissions.buildInitialCustomRoleGroupName({
      db,
      workspaceId: WORKSPACE_ID,
    });
    expect(name).toBe("Custom Role Group 1");
  });

  it("bumps N while the candidate name collides", async () => {
    const taken = new Set(["Custom Role Group 1", "Custom Role Group 2"]);
    const db = _createMockRoleGroupsDb({
      nonBuiltinCount: 0,
      isNameTaken: (candidate) => {
        return taken.has(candidate);
      },
    });
    const name = await Permissions.buildInitialCustomRoleGroupName({
      db,
      workspaceId: WORKSPACE_ID,
    });
    expect(name).toBe("Custom Role Group 3");
  });

  it("starts after existing non-built-in groups when names are free", async () => {
    const db = _createMockRoleGroupsDb({
      nonBuiltinCount: 2,
      isNameTaken: () => {
        return false;
      },
    });
    const name = await Permissions.buildInitialCustomRoleGroupName({
      db,
      workspaceId: WORKSPACE_ID,
    });
    expect(name).toBe("Custom Role Group 3");
  });
});
