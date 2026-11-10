import { loadInstalledPluginAiTools } from "@sbfn/chat/PostAgentStream/loadInstalledPluginAiTools.ts";
import { describe, expect, it, vi } from "vitest";
import type { PluginAiToolDeclaration } from "$/agent/dataAgent/pluginAiTools.types.ts";
import type { AvaSupabaseClient } from "@sbfn/_shared/supabase.ts";

const WORKSPACE_ID = "bbbbbbbb-2222-4222-8222-bbbbbbbbbbbb";

const EPIDEMIOLOGY_TOOL: PluginAiToolDeclaration = {
  pluginId: "avandar.epidemiology",
  permissions: ["data:context", "query:addColumns"],
  name: "fitRegression",
  description: "Fits a regression line through two columns.",
  parameters: {
    type: "object",
    additionalProperties: false,
    required: ["xColumn", "yColumn"],
    properties: {
      xColumn: { type: "string", description: "The predictor column." },
      yColumn: { type: "string", description: "The response column." },
    },
  },
};

function _buildFakeClient(rows: readonly unknown[]): {
  client: AvaSupabaseClient;
  from: ReturnType<typeof vi.fn>;
  select: ReturnType<typeof vi.fn>;
  eq: ReturnType<typeof vi.fn>;
} {
  const throwOnError = vi.fn(async () => {
    return { data: rows };
  });
  const eq = vi.fn(() => {
    return { throwOnError };
  });
  const select = vi.fn(() => {
    return { eq };
  });
  const from = vi.fn(() => {
    return { select };
  });
  return {
    client: { from } as unknown as AvaSupabaseClient,
    from,
    select,
    eq,
  };
}

describe("loadInstalledPluginAiTools", () => {
  it("returns the tool of an enabled install that granted every permission", async () => {
    const fake = _buildFakeClient([
      {
        plugin_id: "avandar.epidemiology",
        is_enabled: true,
        granted_permissions: ["data:context", "query:addColumns"],
      },
    ]);

    const tools = await loadInstalledPluginAiTools({
      supabaseClient: fake.client,
      workspaceId: WORKSPACE_ID,
      tools: [EPIDEMIOLOGY_TOOL],
    });

    expect(fake.from).toHaveBeenCalledWith("plugin_installations");
    expect(fake.select).toHaveBeenCalledWith(
      "plugin_id, is_enabled, granted_permissions",
    );
    expect(fake.eq).toHaveBeenCalledWith("workspace_id", WORKSPACE_ID);
    expect(tools).toEqual([EPIDEMIOLOGY_TOOL]);
  });

  it("returns no tools for a disabled install", async () => {
    const fake = _buildFakeClient([
      {
        plugin_id: "avandar.epidemiology",
        is_enabled: false,
        granted_permissions: ["data:context", "query:addColumns"],
      },
    ]);

    const tools = await loadInstalledPluginAiTools({
      supabaseClient: fake.client,
      workspaceId: WORKSPACE_ID,
      tools: [EPIDEMIOLOGY_TOOL],
    });

    expect(tools).toEqual([]);
  });
});
