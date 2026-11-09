import { AvandarProvider, makePluginTranslator } from "@avandar/plugin-sdk";
import { t } from "@lingui/core/macro";
import { modals } from "@mantine/modals";
import { notifications } from "@mantine/notifications";
import { fetchRowsForInvocation } from "@/lib/plugins/fetchRowsForInvocation/fetchRowsForInvocation";
import { PluginDrawerStore } from "@/lib/plugins/PluginDrawerHost/PluginDrawerStore";
import { PluginErrorBoundary } from "@/lib/plugins/PluginErrorBoundary/PluginErrorBoundary";
import type {
  AvandarApi,
  PluginInvocationContext,
  PluginMessages,
} from "@avandar/plugin-sdk";
import type { ReactNode } from "react";

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

function _makeUiApi(
  options: Readonly<{
    pluginName: string;
    wrapContent: (content: ReactNode) => ReactNode;

    /** The drawer host generation the API was made in. */
    hostGeneration: number;
  }>,
): AvandarApi["ui"] {
  const { pluginName, wrapContent, hostGeneration } = options;
  // A command can outlive the workspace it started in. Its modal or drawer
  // must not appear in the next workspace.
  const isFromCurrentHost = (): boolean => {
    return PluginDrawerStore.getGeneration() === hostGeneration;
  };
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
 * switch cannot open a modal or a drawer in the next workspace.
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
  }>,
): AvandarApi {
  const { pluginName, context, workspace, messages } = options;
  // Overlay content renders after this function returns, so it can read
  // `api` through the closure to give plugin UI its own scoped API.
  const wrapContent = (content: ReactNode): ReactNode => {
    return (
      <PluginErrorBoundary pluginName={pluginName}>
        <AvandarProvider api={api}>{content}</AvandarProvider>
      </PluginErrorBoundary>
    );
  };
  const api: AvandarApi = {
    context,
    workspace,
    data: _makeDataApi(context),
    ui: _makeUiApi({
      pluginName,
      wrapContent,
      hostGeneration: PluginDrawerStore.getGeneration(),
    }),
    i18n: {
      t: makePluginTranslator({ locale: workspace.locale, messages }),
    },
  };
  return api;
}
