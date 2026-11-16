import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@/test-utils";
import { PluginInstallWizard } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginInstallWizard/PluginInstallWizard";
import type { PluginManifestModule } from "@/lib/plugins/PluginIndex.types";
import type { ReactNode } from "react";

type InstallOptions = {
  onSuccess: (installation: unknown) => void;
  onError: (error: Error) => void;
};

const mocks = vi.hoisted(() => {
  return {
    install: vi.fn(),
    installOptions: undefined as InstallOptions | undefined,
    notifySuccess: vi.fn(),
    notifyError: vi.fn(),
  };
});

vi.mock("@/hooks/workspaces/useCurrentWorkspace", () => {
  return {
    useCurrentWorkspace: () => {
      return { id: "workspace-id", slug: "workspace-slug" };
    },
  };
});
vi.mock(
  "@/clients/plugins/PluginInstallationClient/PluginInstallationClient",
  () => {
    return {
      PluginInstallationClient: {
        QueryKeys: {
          getAll: () => {
            return ["PluginInstallationClient", "getAll"];
          },
        },
        useInstall: (options: InstallOptions) => {
          mocks.installOptions = options;
          return [mocks.install, false, {}];
        },
      },
    };
  },
);
vi.mock("@/utils/notifications/notify", () => {
  return {
    notifySuccess: mocks.notifySuccess,
    notifyError: mocks.notifyError,
  };
});

const INSTALLATION = {
  id: "installation-id",
  pluginId: "avandar.epidemiology",
};

let queryClient: QueryClient;
let onClose: ReturnType<typeof vi.fn>;

function _makeManifestModule(
  manifestOverrides: Record<string, unknown> = {},
): PluginManifestModule {
  return {
    manifest: {
      id: "avandar.epidemiology",
      name: "%name%",
      description: "%description%",
      version: "1.2.0",
      license: "MIT",
      icon: "chart-dots",
      permissions: ["data:context"],
      dataSlots: {},
      contributes: {
        commands: [{ id: "run", title: "%run.title%", icon: "chart-dots" }],
        menus: { "dataExplorer.toolbar": [{ command: "run" }] },
        vizTypes: [],
        aiTools: [],
        content: [],
      },
      ...manifestOverrides,
    },
    strings: {
      en: {
        name: "Epidemiology",
        description: "Charts disease spread.",
        "run.title": "Linear regression",
      },
    },
    icons: {},
  } as unknown as PluginManifestModule;
}

function QueryWrapper({ children }: { children: ReactNode }): JSX.Element {
  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

function _renderWizard(manifestModule = _makeManifestModule()): void {
  render(
    <PluginInstallWizard
      pluginName="Epidemiology"
      manifestModule={manifestModule}
      onClose={onClose}
    />,
    { wrapper: QueryWrapper },
  );
}

function _clickButton(name: string): void {
  fireEvent.click(screen.getByRole("button", { name }));
}

function _succeedInstall(): void {
  mocks.install.mockImplementation(() => {
    mocks.installOptions?.onSuccess(INSTALLATION);
  });
}

describe("PluginInstallWizard", () => {
  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
    mocks.install.mockReset();
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    onClose = vi.fn();
  });

  it("opens on Review with the plugin's version, license, and additions", () => {
    _renderWizard();

    expect(
      screen.getByRole("heading", { name: "About this plugin" }),
    ).toHaveFocus();
    expect(
      screen.getByText("avandar · version 1.2.0 · MIT license"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Data Explorer toolbar: Linear regression"),
    ).toBeInTheDocument();
  });

  it("marks only Review and Confirm in the stepper for a plugin with no data slots or content", () => {
    _renderWizard();

    expect(screen.getByText("Review")).toBeInTheDocument();
    expect(screen.getByText("Confirm")).toBeInTheDocument();
    expect(screen.queryByText("Records")).not.toBeInTheDocument();
    expect(screen.queryByText("Datasets")).not.toBeInTheDocument();
  });

  it("moves focus to the Summary heading when Next is pressed on Review", () => {
    _renderWizard();

    _clickButton("Next");

    expect(screen.getByRole("heading", { name: "Summary" })).toHaveFocus();
  });

  it("moves focus back to the Review heading when Back is pressed", () => {
    _renderWizard();
    _clickButton("Next");

    _clickButton("Back");

    expect(
      screen.getByRole("heading", { name: "About this plugin" }),
    ).toHaveFocus();
  });

  it("offers no Back on the first page", () => {
    _renderWizard();

    expect(
      screen.queryByRole("button", { name: "Back" }),
    ).not.toBeInTheDocument();
  });

  it("installs with the manifest's version, every permission, and no bindings", () => {
    _renderWizard();
    _clickButton("Next");

    _clickButton("Install");

    expect(mocks.install).toHaveBeenCalledWith({
      workspaceId: "workspace-id",
      pluginId: "avandar.epidemiology",
      installedVersion: "1.2.0",
      grantedPermissions: ["data:context"],
      bindings: [],
    });
  });

  it("refreshes every plugin installs query once installed", () => {
    _renderWizard();

    expect(mocks.installOptions).toMatchObject({
      queriesToInvalidate: [["PluginInstallationClient", "getAll"]],
    });
  });

  it("shows the installed notification and status once the install succeeds", () => {
    _succeedInstall();
    _renderWizard();
    _clickButton("Next");

    _clickButton("Install");

    expect(mocks.notifySuccess).toHaveBeenCalledWith("Epidemiology installed");
    expect(screen.getByRole("status")).toHaveTextContent(
      "Epidemiology is installed.",
    );
  });

  it("swaps Install and Back for Done once installed, and Done closes the wizard", () => {
    _succeedInstall();
    _renderWizard();
    _clickButton("Next");
    _clickButton("Install");

    expect(
      screen.queryByRole("button", { name: "Install" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Back" }),
    ).not.toBeInTheDocument();
    _clickButton("Done");

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("keeps Install available and reports the error when the install fails", () => {
    mocks.install.mockImplementation(() => {
      mocks.installOptions?.onError(new Error("permission denied"));
    });
    _renderWizard();
    _clickButton("Next");

    _clickButton("Install");

    expect(mocks.notifyError).toHaveBeenCalledWith({
      title: "Could not install Epidemiology",
      message: "permission denied",
    });
    expect(screen.getByRole("button", { name: "Install" })).toBeEnabled();
  });
});
