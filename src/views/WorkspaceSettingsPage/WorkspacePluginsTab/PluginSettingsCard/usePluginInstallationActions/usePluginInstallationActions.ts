import { openPluginInstallWizard } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginInstallWizard/openPluginInstallWizard";
import { openUninstallPluginModal } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginSettingsCard/UninstallPluginModal/openUninstallPluginModal";
import { usePluginInstallationMutations } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginSettingsCard/usePluginInstallationActions/usePluginInstallationMutations";
import type { PluginInstallation } from "$/models/PluginInstallation/PluginInstallation";
import type { PluginManifestModule } from "@/lib/plugins/PluginIndex.types";

/**
 * What a settings card can do to one plugin in the current workspace. Each
 * action does nothing when it lacks what it needs, such as `install` without
 * a manifest or `uninstall` without an install.
 */
export type PluginInstallationActions = Readonly<{
  /** True while any action is saving, so the card can disable its buttons. */
  isPending: boolean;

  /**
   * Opens the install wizard, which installs the plugin when it finishes.
   * Pass the button that opened it, since a click does not focus a button in
   * every browser, so focus can go back to it afterwards.
   */
  install: (opener: HTMLElement) => void;
  setIsEnabled: (isEnabled: boolean) => void;
  approvePermissions: () => void;
  uninstall: () => void;

  /**
   * Opens the uninstall dialog that lets an admin delete the datasets the
   * plugin imported. The card uses it instead of `uninstall` when the plugin
   * imported datasets into this workspace. Pass the button that opened it,
   * since a click does not focus a button in every browser, so focus can go
   * back to it afterwards.
   */
  uninstallWithImportedDatasets: (opener: HTMLElement) => void;
}>;

/** Everything the actions of one plugin read, gathered by the hook. */
type ActionContext = Readonly<{
  pluginName: string;
  manifestModule: PluginManifestModule | undefined;
  installation: PluginInstallation.T | undefined;

  /** The id of the card's heading, where focus goes if the opener is gone. */
  headingId: string;
  mutations: ReturnType<typeof usePluginInstallationMutations>;
}>;

/** Builds the actions that add a plugin to the workspace or remove it. */
function _makeInstallActionsFromContext(
  context: ActionContext,
): Pick<
  PluginInstallationActions,
  "install" | "uninstall" | "uninstallWithImportedDatasets"
> {
  const { pluginName, manifestModule, installation, mutations } = context;
  const { headingId } = context;
  return {
    install: (opener) => {
      if (manifestModule !== undefined) {
        openPluginInstallWizard({
          pluginName,
          manifestModule,
          opener,
          headingId,
        });
      }
    },
    uninstall: () => {
      if (installation !== undefined) {
        mutations.deleteInstallation({ id: installation.id });
      }
    },
    uninstallWithImportedDatasets: (opener) => {
      if (installation !== undefined) {
        openUninstallPluginModal({
          pluginName,
          pluginId: installation.pluginId,
          installationId: installation.id,
          opener,
          headingId,
        });
      }
    },
  };
}

/** Builds the actions that change an install the workspace already has. */
function _makeUpdateActionsFromContext(
  context: ActionContext,
): Pick<PluginInstallationActions, "setIsEnabled" | "approvePermissions"> {
  const { installation, mutations } = context;
  const manifest = context.manifestModule?.manifest;
  return {
    setIsEnabled: (isEnabled) => {
      if (installation !== undefined) {
        mutations.updateInstallation({
          id: installation.id,
          data: { isEnabled },
        });
      }
    },
    approvePermissions: () => {
      if (installation !== undefined && manifest !== undefined) {
        mutations.updateInstallation({
          id: installation.id,
          data: {
            grantedPermissions: [...manifest.permissions],
            installedVersion: manifest.version,
          },
        });
      }
    },
  };
}

/** Combines every action of one plugin with its saving state. */
function _makeActionsFromContext(
  context: ActionContext,
): PluginInstallationActions {
  return {
    isPending: context.mutations.isPending,
    ..._makeInstallActionsFromContext(context),
    ..._makeUpdateActionsFromContext(context),
  };
}

/**
 * Install, enable, disable, approve, and uninstall for one plugin. The
 * Plugins settings tab gives each plugin card one, so the card's buttons only
 * call the returned actions.
 */
export function usePluginInstallationActions(options: {
  pluginName: string;
  manifestModule: PluginManifestModule | undefined;
  installation: PluginInstallation.T | undefined;
  headingId: string;
}): PluginInstallationActions {
  const mutations = usePluginInstallationMutations(options.pluginName);
  return _makeActionsFromContext({ ...options, mutations });
}
