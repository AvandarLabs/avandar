import { createRequire } from "node:module";
import path from "node:path";

/** Resolve utility package source aliases while retaining Remotion defaults.
 * @param {import("@remotion/bundler").WebpackConfiguration} configuration
 * @returns {import("@remotion/bundler").WebpackConfiguration}
 */
export function withWorkspaceAliases(configuration) {
  return {
    ...configuration,
    module: {
      ...configuration.module,
      rules: [
        ...(configuration.module?.rules ?? []),
        {
          test: /\.ya?ml$/,
          type: "javascript/auto",
          use: [path.resolve("scripts/yaml/yamlLoader.cjs")],
        },
      ],
    },
    resolve: {
      ...configuration.resolve,
      alias: {
        ...configuration.resolve?.alias,
        "@utils": path.dirname(
          createRequire(path.join(process.cwd(), "package.json")).resolve(
            "@avandar/utils",
          ),
        ),
      },
    },
  };
}
