import {
  AvandarProvider,
  PluginError,
  makePluginTranslator,
} from "@avandar/plugin-sdk";
import { t } from "@lingui/core/macro";
import { modals } from "@mantine/modals";
import { notifications } from "@mantine/notifications";
import { addColumnsForInvocation } from "@/lib/plugins/derivedColumns/addColumnsForInvocation/addColumnsForInvocation";
import { fetchRowsForInvocation } from "@/lib/plugins/fetchRowsForInvocation/fetchRowsForInvocation";
import { PluginDrawerStore } from "@/lib/plugins/PluginDrawerHost/PluginDrawerStore";
import { PluginErrorBoundary } from "@/lib/plugins/PluginErrorBoundary/PluginErrorBoundary";
import type { DataExplorerBridge } from "@/lib/plugins/DataExplorerBridge.types";
import type {
  AvandarApi,
  PluginInvocationContext,
  PluginMessages,
} from "@avandar/plugin-sdk";
import type { ReactNode } from "react";

/**
 * Whether the drawer host generation is still `hostGeneration`. A command can
 * outlive the workspace or view it started in, so its API checks this before
 * it opens anything or changes the Data Explorer.
 */
function _makeIsFromCurrentHost(hostGeneration: number): () => boolean {
  return () => {
    return PluginDrawerStore.getGeneration() === hostGeneration;
  };
}

function _makeDataApi(context: PluginInvocationContext): AvandarApi["data"] {
  return {
    // `async` turns a thrown `PluginError` into a rejected promise, which is
    // how a plugin receives it.
    fetchRows: async (queryHandle, fetchOptions) => {
      return fetchRowsForInvocation({
        invocationHandle: context.queryHandle,
        queryHandle,
        columns: fetchOptions.columns,
        limit: fetchOptions.limit,
      });
    },
  };
}

function _makeDataExplorerApi(
  options: Readonly<{
    context: PluginInvocationContext;
    bridge: DataExplorerBridge | undefined;
    isFromCurrentHost: () => boolean;
  }>,
): AvandarApi["dataExplorer"] {
  const { context, bridge, isFromCurrentHost } = options;
  if (context.slotId !== "dataExplorer.toolbar" || bridge === undefined) {
    return undefined;
  }
  return {
    // `async` turns a thrown `PluginError` into a rejected promise, which is
    // how a plugin receives it.
    addColumns: async (columns) => {
      if (!isFromCurrentHost()) {
        throw new PluginError(
          "InvalidHandle",
          "The Data Explorer this command ran in is no longer open. Run the command again.",
        );
      }
      return addColumnsForInvocation({ context, bridge, columns });
    },
  };
}

function _makeModalApi(
  options: Readonly<{
    wrapContent: (content: ReactNode) => ReactNode;
    isFromCurrentHost: () => boolean;
  }>,
): Pick<AvandarApi["ui"], "openModal" | "closeModal"> {
  const { wrapContent, isFromCurrentHost } = options;
  // The id of the modal this invocation opened last, which `closeModal`
  // closes. Other invocations' modals are never touched.
  let lastModalId: string | undefined;
  return {
    openModal: ({ title, content }) => {
      if (!isFromCurrentHost()) {
        return;
      }
      lastModalId = modals.open({
        title,
        size: "lg",
        children: wrapContent(content),
        closeButtonProps: { "aria-label": t`Close` },
      });
    },
    closeModal: () => {
      if (lastModalId !== undefined) {
        modals.close(lastModalId);
        lastModalId = undefined;
      }
    },
  };
}

function _makeUiApi(
  options: Readonly<{
    pluginName: string;
    wrapContent: (content: ReactNode) => ReactNode;

    /**
     * Whether the drawer host is the one the API was made in. A command's
     * modal or drawer must not appear in the next workspace.
     */
    isFromCurrentHost: () => boolean;
  }>,
): AvandarApi["ui"] {
  const { pluginName, wrapContent, isFromCurrentHost } = options;
  return {
    ..._makeModalApi({ wrapContent, isFromCurrentHost }),
    openDrawer: ({ title, content }) => {
      if (!isFromCurrentHost()) {
        return;
      }
      PluginDrawerStore.open({ title, content: wrapContent(content) });
    },
    notify: ({ title, message, color }) => {
      notifications.show({
        title: title ?? pluginName,
        message,
        color: color ?? "blue",
      });
    },
  };
}

/**
 * Makes the `avandar` object one command invocation receives, scoped to the
 * plugin, the workspace, and the query result the command was invoked on.
 * `runPluginCommand` calls it once per invocation and passes the result to the
 * plugin's command handler. Its `openModal` and `openDrawer` do nothing once
 * the drawer host has unmounted, so a command left running by a workspace
 * switch cannot open a modal or a drawer in the next workspace. Its
 * `dataExplorer` is set only for a Data Explorer toolbar invocation that came
 * with a `dataExplorerBridge`, and its `addColumns` rejects with
 * `PluginError("InvalidHandle")` once the drawer host has unmounted.
 *
 * It pulls in the plugin SDK runtime and Lingui's message compiler, so import
 * it lazily, at the time a command runs, to keep them out of the main bundle.
 */
export function makePluginApi(
  options: Readonly<{
    pluginName: string;
    context: PluginInvocationContext;
    workspace: AvandarApi["workspace"];
    messages: PluginMessages;
    dataExplorerBridge?: DataExplorerBridge;
  }>,
): AvandarApi {
  const { pluginName, context, workspace, messages, dataExplorerBridge } =
    options;
  // Overlay content renders after this function returns, so it can read
  // `api` through the closure to give plugin UI its own scoped API.
  const wrapContent = (content: ReactNode): ReactNode => {
    return (
      <PluginErrorBoundary pluginName={pluginName}>
        <AvandarProvider api={api}>{content}</AvandarProvider>
      </PluginErrorBoundary>
    );
  };
  const isFromCurrentHost = _makeIsFromCurrentHost(
    PluginDrawerStore.getGeneration(),
  );
  const api: AvandarApi = {
    context,
    workspace,
    data: _makeDataApi(context),
    ui: _makeUiApi({ pluginName, wrapContent, isFromCurrentHost }),
    i18n: {
      t: makePluginTranslator({ locale: workspace.locale, messages }),
    },
    dataExplorer: _makeDataExplorerApi({
      context,
      bridge: dataExplorerBridge,
      isFromCurrentHost,
    }),
  };
  return api;
}
