import { makePluginTranslator, PluginVizProvider } from "@avandar/plugin-sdk";
import { Box } from "@mantine/core";
import { useElementSize } from "@mantine/hooks";
import { useMemo } from "react";
import { PluginErrorBoundary } from "@/lib/plugins/PluginErrorBoundary/PluginErrorBoundary";
import type {
  PluginMessages,
  PluginVizDefinition,
  PluginVizInput,
} from "@avandar/plugin-sdk";
import type { ReactNode } from "react";

function _getComponentFromDefinition(
  definition: PluginVizDefinition,
): PluginVizDefinition["Component"] {
  // Plugin code is untrusted, so reading the component can throw.
  try {
    return definition.Component;
  } catch {
    return undefined;
  }
}

type Props = {
  definition: PluginVizDefinition;
  vizId: string;
  input: PluginVizInput;
  messages: PluginMessages;
  locale: string;

  /** The plugin's display name, which the error boundary logs a crash under. */
  pluginName: string;

  /**
   * Shown in place of the chart when it has no component or its component
   * throws.
   */
  errorFallback: ReactNode;
};

/**
 * Draws a plugin chart's component at the size of the area it fills, with
 * the plugin's strings available through `useT()`. The component renders
 * only once the area has a size, and a crash inside it, or in reading it,
 * shows `errorFallback` without affecting the rest of the page.
 * `PluginVizRuntime` is its only importer, so it loads with the plugin chart
 * runtime.
 */
export function PluginVizComponentView({
  definition,
  vizId,
  input,
  messages,
  locale,
  pluginName,
  errorFallback,
}: Props): ReactNode {
  const { ref, width, height } = useElementSize<HTMLDivElement>();
  const t = useMemo(() => {
    return makePluginTranslator({ locale, messages });
  }, [locale, messages]);
  const Component = _getComponentFromDefinition(definition);
  if (Component === undefined) {
    return errorFallback;
  }
  return (
    <Box ref={ref} h="100%" w="100%">
      {width > 0 && height > 0 ? (
        <PluginErrorBoundary pluginName={pluginName} fallback={errorFallback}>
          <PluginVizProvider vizId={vizId} t={t}>
            <Component {...input} width={width} height={height} />
          </PluginVizProvider>
        </PluginErrorBoundary>
      ) : null}
    </Box>
  );
}
