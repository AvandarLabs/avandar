import { matchLiteral } from "@avandar/utils";
import { msg } from "@lingui/core/macro";
import { useLingui } from "@lingui/react/macro";
import { useState } from "react";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import { PluginModuleCache } from "@/lib/plugins/makePluginModuleCache/makePluginModuleCache";
import { loadRunPluginCommand } from "@/lib/plugins/PluginMenuSlot/loadRunPluginCommand/loadRunPluginCommand";
import { Logger } from "@/utils/Logger";
import { notifyError } from "@/utils/notifications/notify";
import type { DataExplorerBridge } from "@/lib/plugins/DataExplorerBridge.types";
import type { PluginMenuItem } from "@/lib/plugins/getMenuItemsFromActivePlugins/getMenuItemsFromActivePlugins";
import type { PluginCommandFailure } from "@/lib/plugins/runPluginCommand/runPluginCommand";
import type { PluginInvocationContext } from "@avandar/plugin-sdk";
import type { I18n } from "@lingui/core";

type LazyCommandRun = Readonly<{
  item: PluginMenuItem;
  context: PluginInvocationContext;
  dataExplorerBridge: DataExplorerBridge | undefined;
  workspace: { id: string; slug: string; locale: string };
}>;

function _runCommandWithLazyRunner(
  options: LazyCommandRun,
): Promise<PluginCommandFailure | undefined> {
  const { item, context, dataExplorerBridge, workspace } = options;
  return loadRunPluginCommand().then(
    (runCommand) => {
      return runCommand({
        plugin: item.plugin,
        pluginName: item.pluginName,
        commandId: item.commandId,
        context,
        workspace,
        dataExplorerBridge,
        loadCode: PluginModuleCache.loadCode,
      });
    },
    (error: unknown): PluginCommandFailure => {
      return { kind: "load_failed", error };
    },
  );
}

function _reportFailure(options: {
  item: PluginMenuItem;
  failure: PluginCommandFailure;
  i18n: I18n;
}): void {
  const { item, failure, i18n } = options;
  const { pluginName } = item;
  Logger.error("Plugin command failed", {
    key: item.key,
    kind: failure.kind,
    error: failure.error,
  });
  notifyError(
    matchLiteral(failure.kind, {
      load_failed: () => {
        return {
          title: i18n._(msg`Could not load ${pluginName}`),
          message: i18n._(
            msg`Check your connection and click the button again to retry.`,
          ),
        };
      },
      missing_handler: () => {
        return {
          title: i18n._(msg`${pluginName}: this command is not available`),
          message: i18n._(
            msg`The plugin may be out of date. Ask an admin to check Settings → Plugins.`,
          ),
        };
      },
      command_failed: () => {
        return {
          title: i18n._(msg`${pluginName}: the command failed`),
          message: i18n._(
            msg`Try again. If it keeps failing, contact the plugin's publisher.`,
          ),
        };
      },
    }),
  );
}

/**
 * Runs the plugin commands a slot offers and reports failures to the user in
 * a notification. `runningKey` is the key of the item whose command has not
 * finished yet, so a slot can show it as loading. Each run builds its
 * invocation context with `getContext`, and its Data Explorer bridge with
 * `getDataExplorerBridge` when there is one, at that moment. Nothing runs
 * when there is no `getContext`.
 */
export function usePluginCommandRunner(
  options: Readonly<{
    getContext: (() => PluginInvocationContext) | undefined;
    getDataExplorerBridge?: (() => DataExplorerBridge) | undefined;
  }>,
): Readonly<{
  runningKey: string | undefined;
  run: (item: PluginMenuItem) => Promise<void>;
}> {
  const { i18n } = useLingui();
  const workspace = useCurrentWorkspace();
  const [runningKey, setRunningKey] = useState<string>();

  const run = async (item: PluginMenuItem): Promise<void> => {
    const { getContext, getDataExplorerBridge } = options;
    if (getContext === undefined) {
      return;
    }
    const context = getContext();
    const dataExplorerBridge = getDataExplorerBridge?.();
    setRunningKey(item.key);
    let failure: PluginCommandFailure | undefined;
    try {
      failure = await _runCommandWithLazyRunner({
        item,
        context,
        dataExplorerBridge,
        workspace: {
          id: workspace.id,
          slug: workspace.slug,
          locale: i18n.locale,
        },
      });
    } finally {
      setRunningKey(undefined);
    }
    if (failure !== undefined) {
      _reportFailure({ item, failure, i18n });
    }
  };

  return { runningKey, run };
}
