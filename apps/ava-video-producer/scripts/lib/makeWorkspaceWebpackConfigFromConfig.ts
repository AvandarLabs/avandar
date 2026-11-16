import { parse } from "yaml";
import { getAvandarUtilsDirectoryFromRoot } from "./getAvandarUtilsDirectoryFromRoot";
import type { WebpackConfiguration } from "@remotion/bundler";

/**
 * Extends Remotion's webpack configuration with the producer's workspace
 * needs: authored YAML imports and the `@utils` source alias. Pass it to
 * `Config.overrideWebpackConfig` or to a programmatic Remotion bundle, for
 * example a preview or export bundle.
 */
export function makeWorkspaceWebpackConfigFromConfig(
  configuration: Readonly<WebpackConfiguration>,
): WebpackConfiguration {
  return {
    ...configuration,
    module: {
      ...configuration.module,
      rules: [
        ...(configuration.module?.rules ?? []),
        // YAML parses as a JSON module, so its default export is the value.
        { test: /\.ya?ml$/, type: "json", parser: { parse } },
      ],
    },
    resolve: {
      ...configuration.resolve,
      alias: {
        ...configuration.resolve?.alias,
        "@utils": getAvandarUtilsDirectoryFromRoot(process.cwd()),
      },
    },
  };
}
