import { ModalsProvider } from "@mantine/modals";
import { describe, expect, it, vi } from "vitest";
import { DEFAULT_MODAL_PROPS } from "@/config/Theme";
import { fireEvent, render, screen, within } from "@/test-utils";
import { PluginActions } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginSettingsCard/PluginActions/PluginActions";
import type { PluginInstallStatus } from "@/lib/plugins/getPluginInstallStatusFromInstallation/getPluginInstallStatusFromInstallation";
import type { PluginInstallationActions } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginSettingsCard/usePluginInstallationActions/usePluginInstallationActions";

const HEADING_ID = "plugin-heading";

function _makeActions(
  overrides: Partial<PluginInstallationActions> = {},
): PluginInstallationActions {
  return {
    isPending: false,
    install: vi.fn(),
    setIsEnabled: vi.fn(),
    approvePermissions: vi.fn(),
    uninstall: vi.fn(),
    ...overrides,
  };
}

function _renderActions(options: {
  status: PluginInstallStatus;
  canManage?: boolean;
  actions?: PluginInstallationActions;
}): void {
  const { status, canManage = true, actions = _makeActions() } = options;
  render(
    <ModalsProvider modalProps={DEFAULT_MODAL_PROPS}>
      <h5 id={HEADING_ID}>Epidemiology</h5>
      <PluginActions
        status={status}
        pluginName="Epidemiology"
        headingId={HEADING_ID}
        canManage={canManage}
        actions={actions}
      />
    </ModalsProvider>,
  );
}

function _getButtonLabels(): string[] {
  return screen.getAllByRole("button").map((button) => {
    return button.textContent ?? "";
  });
}

async function _confirmInDialog(confirmLabel: string): Promise<void> {
  const dialog = await screen.findByRole("dialog");
  fireEvent.click(within(dialog).getByRole("button", { name: confirmLabel }));
}

describe("PluginActions", () => {
  it.each([
    ["not_installed", ["Install"]],
    ["installed", ["Disable", "Uninstall"]],
    ["disabled", ["Enable", "Uninstall"]],
    ["needs_review", ["Review new permissions", "Disable", "Uninstall"]],
    ["unavailable", ["Uninstall"]],
  ] as const)("offers the right actions when %s", (status, expected) => {
    _renderActions({ status });

    expect(_getButtonLabels()).toEqual(expected);
  });

  it("describes every action by the plugin heading it belongs to", () => {
    _renderActions({ status: "needs_review" });

    screen.getAllByRole("button").forEach((button) => {
      expect(button).toHaveAccessibleDescription("Epidemiology");
    });
  });

  it("disables every action for users who cannot manage plugins", () => {
    _renderActions({ status: "installed", canManage: false });

    screen.getAllByRole("button").forEach((button) => {
      expect(button).toBeDisabled();
    });
  });

  it("disables every action while a change is saving", () => {
    _renderActions({
      status: "installed",
      actions: _makeActions({ isPending: true }),
    });

    screen.getAllByRole("button").forEach((button) => {
      expect(button).toBeDisabled();
    });
  });

  it("asks before uninstalling and only then uninstalls", async () => {
    const actions = _makeActions();
    _renderActions({ status: "installed", actions });

    fireEvent.click(screen.getByRole("button", { name: "Uninstall" }));

    const dialog = await screen.findByRole("dialog");
    expect(dialog).toHaveTextContent("Uninstall Epidemiology?");
    expect(actions.uninstall).not.toHaveBeenCalled();

    await _confirmInDialog("Uninstall");

    expect(actions.uninstall).toHaveBeenCalledTimes(1);
  });

  it("installs after the user confirms", async () => {
    const actions = _makeActions();
    _renderActions({ status: "not_installed", actions });

    fireEvent.click(screen.getByRole("button", { name: "Install" }));
    await _confirmInDialog("Install");

    expect(actions.install).toHaveBeenCalledTimes(1);
  });

  it("approves the new permissions after the user confirms", async () => {
    const actions = _makeActions();
    _renderActions({ status: "needs_review", actions });

    fireEvent.click(
      screen.getByRole("button", { name: "Review new permissions" }),
    );
    await _confirmInDialog("Approve");

    expect(actions.approvePermissions).toHaveBeenCalledTimes(1);
  });

  it("enables a disabled plugin after the user confirms", async () => {
    const actions = _makeActions();
    _renderActions({ status: "disabled", actions });

    fireEvent.click(screen.getByRole("button", { name: "Enable" }));
    await _confirmInDialog("Enable");

    expect(actions.setIsEnabled).toHaveBeenCalledWith(true);
  });

  it("disables an installed plugin after the user confirms", async () => {
    const actions = _makeActions();
    _renderActions({ status: "installed", actions });

    fireEvent.click(screen.getByRole("button", { name: "Disable" }));
    await _confirmInDialog("Disable");

    expect(actions.setIsEnabled).toHaveBeenCalledWith(false);
  });
});
