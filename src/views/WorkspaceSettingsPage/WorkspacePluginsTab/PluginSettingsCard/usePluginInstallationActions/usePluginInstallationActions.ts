import { Model } from "@avandar/models";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import { usePluginInstallationMutations } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginSettingsCard/usePluginInstallationActions/usePluginInstallationMutations";
import type { PluginInstallation } from "$/models/PluginInstallation/PluginInstallation";
import type { Workspace } from "$/models/Workspace/Workspace";
import type { PluginManifest } from "@avandar/plugin-manifest/runtime";

/**
 * What a settings card can do to one plugin in the current workspace. Each
 * action does nothing when it lacks what it needs, such as `install` without
 * a manifest or `uninstall` without an install.
 */
export type PluginInstallationActions = Readonly<{
  /** True while any action is saving, so the card can disable its buttons. */
  isPending: boolean;
  install: () => void;
  setIsEnabled: (isEnabled: boolean) => void;
  approvePermissions: () => void;
  uninstall: () => void;
}>;

/** Everything the actions of one plugin read, gathered by the hook. */
type ActionContext = Readonly<{
  workspaceId: Workspace.Id;
  manifest: PluginManifest | undefined;
  installation: PluginInstallation.T | undefined;
  mutations: ReturnType<typeof usePluginInstallationMutations>;
}>;

/**
 * The install row for a manifest, granting every permission it asks for.
 * `installedBy` is left out on purpose: the database fills it from the
 * signed-in user, and its insert policy rejects any other value.
 */
function _makeInstallationFromManifest(options: {
  workspaceId: Workspace.Id;
  manifest: PluginManifest;
}): PluginInstallation.T<"Insert"> {
  const { workspaceId, manifest } = options;
  return Model.make("PluginInstallation", {
    workspaceId,
    pluginId: manifest.id,
    installedVersion: manifest.version,
    grantedPermissions: [...manifest.permissions],
  });
}

/** Builds the actions that add a plugin to the workspace or remove it. */
function _makeInstallActionsFromContext(
  context: ActionContext,
): Pick<PluginInstallationActions, "install" | "uninstall"> {
  const { workspaceId, manifest, installation, mutations } = context;
  return {
    install: () => {
      if (manifest === undefined) {
        return;
      }
      mutations.insertInstallation({
        data: _makeInstallationFromManifest({ workspaceId, manifest }),
      });
    },
    uninstall: () => {
      if (installation !== undefined) {
        mutations.deleteInstallation({ id: installation.id });
      }
    },
  };
}

/** Builds the actions that change an install the workspace already has. */
function _makeUpdateActionsFromContext(
  context: ActionContext,
): Pick<PluginInstallationActions, "setIsEnabled" | "approvePermissions"> {
  const { manifest, installation, mutations } = context;
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
  manifest: PluginManifest | undefined;
  installation: PluginInstallation.T | undefined;
}): PluginInstallationActions {
  const { pluginName, manifest, installation } = options;
  const workspace = useCurrentWorkspace();
  const mutations = usePluginInstallationMutations(pluginName);
  return _makeActionsFromContext({
    workspaceId: workspace.id,
    manifest,
    installation,
    mutations,
  });
}
