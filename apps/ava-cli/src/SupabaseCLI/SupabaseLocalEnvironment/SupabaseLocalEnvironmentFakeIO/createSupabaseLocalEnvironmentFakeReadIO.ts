import path from "node:path";
import type { SupabaseLocalEnvironmentIO } from "@ava-cli/SupabaseCLI/SupabaseLocalEnvironment/SupabaseLocalEnvironment.types";
import type { FakeFactoryOptions } from "@ava-cli/SupabaseCLI/SupabaseLocalEnvironment/SupabaseLocalEnvironmentFakeIO/SupabaseLocalEnvironmentFakeIO";

/** Creates the read-only filesystem portion of the local-environment fake. */
export function createSupabaseLocalEnvironmentFakeReadIO(
  factoryOptions: Readonly<FakeFactoryOptions>,
): Pick<
  SupabaseLocalEnvironmentIO,
  "readTextFile" | "readDirectory" | "isDirectory" | "isFile"
> {
  const { state } = factoryOptions;
  return {
    readTextFile: async (filePath) => {
      const contents = state.files.get(filePath);
      if (contents === undefined) {
        throw new Error(`Missing fake file ${filePath}`);
      }
      return contents;
    },
    readDirectory: async (directoryPath) => {
      return [
        ...new Set([
          ...[...state.files.keys()]
            .filter((filePath) => {
              return path.dirname(filePath) === directoryPath;
            })
            .map((filePath) => {
              return path.basename(filePath);
            }),
          ...[...state.directories]
            .filter((nestedDirectoryPath) => {
              return path.dirname(nestedDirectoryPath) === directoryPath;
            })
            .map((nestedDirectoryPath) => {
              return path.basename(nestedDirectoryPath);
            }),
        ]),
      ].sort();
    },
    isDirectory: async (targetPath) => {
      return state.directories.has(targetPath);
    },
    isFile: async (targetPath) => {
      return state.files.has(targetPath);
    },
  };
}
