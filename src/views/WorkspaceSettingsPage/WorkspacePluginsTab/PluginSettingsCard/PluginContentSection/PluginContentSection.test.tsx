import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@/test-utils";
import { PluginContentSection } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginSettingsCard/PluginContentSection/PluginContentSection";
import type { PluginManifestModule } from "@/lib/plugins/PluginIndex.types";
import type { ReactNode } from "react";

const mocks = vi.hoisted(() => {
  return {
    imports: [] as unknown[],
    importPluginContentItem: vi.fn(),
  };
});

vi.mock("@/hooks/workspaces/useCurrentWorkspace", () => {
  return {
    useCurrentWorkspace: () => {
      return { id: "workspace-id", slug: "workspace-slug" };
    },
  };
});
vi.mock("@/hooks/users/useCurrentUser", () => {
  return {
    useCurrentUser: () => {
      return { id: "user-id" };
    },
  };
});
vi.mock(
  "@/clients/plugins/PluginContentImportClient/PluginContentImportClient",
  () => {
    return {
      PluginContentImportClient: {
        QueryKeys: {
          getAll: () => {
            return ["PluginContentImportClient", "getAll"];
          },
        },
        useGetAll: () => {
          return [mocks.imports, false, {}];
        },
      },
    };
  },
);
vi.mock(
  "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/pluginContent/importPluginContentItem/importPluginContentItem",
  () => {
    return { importPluginContentItem: mocks.importPluginContentItem };
  },
);
vi.mock("@/lib/plugins/pluginIndexHelpers", () => {
  return {
    getPluginIndexEntry: () => {
      return {
        loadContentUrls: () => {
          return Promise.resolve({
            provinces: "/assets/mz-adm1.csv",
            districts: "/assets/mz-adm2.csv",
          });
        },
      };
    },
  };
});
// Renders the link target into `href`, so a test can assert it without a
// router.
vi.mock("@avandar/ui", async (importOriginal) => {
  const { createElement } = await import("react");
  const actual = await importOriginal<typeof import("@avandar/ui")>();
  return {
    ...actual,
    Link: (props: {
      children: ReactNode;
      to: string;
      params: Record<string, string>;
    }) => {
      const href = Object.entries(props.params).reduce(
        (path, [name, value]) => {
          return path.replace(`$${name}`, value);
        },
        props.to,
      );
      return createElement("a", { href }, props.children);
    },
  };
});

const DISTRICTS = {
  id: "districts",
  kind: "dataset",
  title: "%content.districts.title%",
  description: "%content.districts.description%",
  file: "content/mz-adm2.csv",
};

const MANIFEST_MODULE = {
  manifest: {
    id: "avandar.mozambique",
    contributes: {
      content: [
        {
          id: "provinces",
          kind: "dataset",
          title: "%content.provinces.title%",
          description: "%content.provinces.description%",
          file: "content/mz-adm1.csv",
        },
        DISTRICTS,
      ],
    },
  },
  strings: {
    en: {
      "content.provinces.title": "Mozambique provinces",
      "content.districts.title": "Mozambique districts",
    },
  },
  icons: {},
} as unknown as PluginManifestModule;

let queryClient: QueryClient;

function QueryWrapper({ children }: { children: ReactNode }): JSX.Element {
  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

function _renderSection(canManage = true): void {
  render(
    <PluginContentSection
      manifestModule={MANIFEST_MODULE}
      canManage={canManage}
    />,
    { wrapper: QueryWrapper },
  );
}

describe("PluginContentSection", () => {
  beforeEach(() => {
    cleanup();
    queryClient = new QueryClient();
    mocks.imports = [
      { contentId: "provinces", datasetId: "dataset-provinces" },
    ];
    mocks.importPluginContentItem.mockReset();
  });

  it("links an imported dataset to its page in Data Sources", () => {
    _renderSection();

    expect(
      screen.getByRole("link", { name: "Mozambique provinces" }),
    ).toHaveAttribute("href", "/workspace-slug/data-manager/dataset-provinces");
  });

  it("says a dataset the workspace lacks is not imported", () => {
    _renderSection();

    expect(screen.getByText("Not imported")).toBeInTheDocument();
  });

  it("imports a missing dataset with Import, then links to it", async () => {
    mocks.importPluginContentItem.mockResolvedValue("dataset-districts");
    _renderSection();

    fireEvent.click(
      screen.getByRole("button", { name: "Import Mozambique districts" }),
    );

    expect(
      await screen.findByRole("link", { name: "Mozambique districts" }),
    ).toHaveAttribute("href", "/workspace-slug/data-manager/dataset-districts");
    expect(mocks.importPluginContentItem).toHaveBeenCalledWith(
      expect.objectContaining({ item: DISTRICTS, url: "/assets/mz-adm2.csv" }),
    );
  });

  it("shows why an import failed and offers Retry", async () => {
    mocks.importPluginContentItem.mockRejectedValue(
      new Error("permission denied"),
    );
    _renderSection();

    fireEvent.click(
      screen.getByRole("button", { name: "Import Mozambique districts" }),
    );

    expect(await screen.findByText("permission denied")).toHaveAttribute(
      "lang",
      "en",
    );
    expect(screen.getByText("Failed")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Retry Mozambique districts" }),
    ).toBeInTheDocument();
  });

  it("offers no Import to members who cannot manage plugins", () => {
    _renderSection(false);

    expect(screen.getByText("Not imported")).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});
