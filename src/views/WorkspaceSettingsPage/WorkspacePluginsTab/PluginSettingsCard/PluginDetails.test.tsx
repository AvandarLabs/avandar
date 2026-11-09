import { describe, expect, it } from "vitest";
import { render, screen } from "@/test-utils";
import { PluginDetails } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginSettingsCard/PluginDetails";
import type { PluginManifest } from "@avandar/plugin-manifest/runtime";

function _makeManifest(options: {
  toolbarItemCount: number;
  permissions: string[];
}): PluginManifest {
  const { toolbarItemCount, permissions } = options;
  return {
    id: "avandar.epidemiology",
    permissions,
    contributes: {
      commands: [],
      menus: {
        "dataExplorer.toolbar": Array.from(
          { length: toolbarItemCount },
          (_, index) => {
            return { command: `command-${index}` };
          },
        ),
      },
    },
  } as unknown as PluginManifest;
}

describe("PluginDetails", () => {
  it("uses the singular when a plugin adds one toolbar button", () => {
    render(
      <PluginDetails
        manifest={_makeManifest({ toolbarItemCount: 1, permissions: [] })}
      />,
    );

    expect(
      screen.getByText("Adds 1 button to Data Explorer"),
    ).toBeInTheDocument();
  });

  it("uses the plural when a plugin adds several toolbar buttons", () => {
    render(
      <PluginDetails
        manifest={_makeManifest({ toolbarItemCount: 3, permissions: [] })}
      />,
    );

    expect(
      screen.getByText("Adds 3 buttons to Data Explorer"),
    ).toBeInTheDocument();
  });

  it("describes each permission the plugin asks for in plain language", () => {
    render(
      <PluginDetails
        manifest={_makeManifest({
          toolbarItemCount: 1,
          permissions: ["data:context"],
        })}
      />,
    );

    expect(screen.getByRole("listitem")).toHaveTextContent(
      "Reads the query result you run it on",
    );
    expect(
      screen.queryByText("Uses no workspace data."),
    ).not.toBeInTheDocument();
  });

  it("says the plugin uses no workspace data when it asks for no permissions", () => {
    render(
      <PluginDetails
        manifest={_makeManifest({ toolbarItemCount: 1, permissions: [] })}
      />,
    );

    expect(screen.getByText("Uses no workspace data.")).toBeInTheDocument();
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
  });
});
