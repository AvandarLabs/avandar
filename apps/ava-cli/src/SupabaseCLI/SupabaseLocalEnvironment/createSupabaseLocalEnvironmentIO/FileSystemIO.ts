import {
  copyFile,
  lstat,
  mkdir,
  readdir,
  readFile,
  realpath,
  rm,
  writeFile,
} from "node:fs/promises";
import path from "node:path";
import { RunLocalCommand } from "@ava-cli/SupabaseCLI/SupabaseLocalEnvironment/createSupabaseLocalEnvironmentIO/RunLocalCommand/RunLocalCommand";
import { propPasses } from "@avandar/utils";
import type { SupabaseLocalEnvironmentIO } from "@ava-cli/SupabaseCLI/SupabaseLocalEnvironment/SupabaseLocalEnvironment.types";

function _getAbsolutePathFromFilePath(filePath: string): string {
  if (!path.isAbsolute(filePath)) {
    throw new Error(`Filesystem path must be absolute: ${filePath}`);
  }
  return filePath;
}

function _createFileReadIO(
  projectRoot: string,
): Pick<
  SupabaseLocalEnvironmentIO,
  "readTextFile" | "readDirectory" | "findDevelopmentEnvFiles"
> {
  return {
    readTextFile: async (filePath) => {
      return await readFile(_getAbsolutePathFromFilePath(filePath), "utf8");
    },
    readDirectory: async (directoryPath) => {
      return (
        await readdir(_getAbsolutePathFromFilePath(directoryPath))
      ).sort();
    },
    findDevelopmentEnvFiles: async () => {
      const directoryEntries = await readdir(projectRoot, {
        withFileTypes: true,
      });
      return directoryEntries
        .filter(
          propPasses("name", (name): name is string => {
            return (
              name === ".env.development" ||
              name.startsWith(".env.development.")
            );
          }),
        )
        .map((entry) => {
          return path.join(projectRoot, entry.name);
        })
        .sort();
    },
  };
}

function _createFileWriteIO(): Pick<
  SupabaseLocalEnvironmentIO,
  | "writeTextFile"
  | "copyFile"
  | "makeDirectory"
  | "reserveDirectory"
  | "removePath"
> {
  return {
    writeTextFile: async ({ filePath, contents }) => {
      await writeFile(_getAbsolutePathFromFilePath(filePath), contents, "utf8");
    },
    copyFile: async ({ sourcePath, targetPath }) => {
      await copyFile(
        _getAbsolutePathFromFilePath(sourcePath),
        _getAbsolutePathFromFilePath(targetPath),
      );
    },
    makeDirectory: async (directoryPath) => {
      await mkdir(_getAbsolutePathFromFilePath(directoryPath), {
        recursive: true,
      });
    },
    reserveDirectory: async (directoryPath) => {
      try {
        await mkdir(_getAbsolutePathFromFilePath(directoryPath));
        return true;
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === "EEXIST") {
          return false;
        }
        throw error;
      }
    },
    removePath: async (targetPath) => {
      await rm(_getAbsolutePathFromFilePath(targetPath), {
        recursive: true,
        force: true,
      });
    },
  };
}

function _createPathIO(): Pick<
  SupabaseLocalEnvironmentIO,
  "isDirectory" | "isFile" | "pathExists" | "realPath" | "isPortAvailable"
> {
  return {
    isDirectory: async (targetPath) => {
      return (
        await lstat(_getAbsolutePathFromFilePath(targetPath))
      ).isDirectory();
    },
    isFile: async (targetPath) => {
      return (await lstat(_getAbsolutePathFromFilePath(targetPath))).isFile();
    },
    pathExists: async (targetPath) => {
      _getAbsolutePathFromFilePath(targetPath);
      try {
        await lstat(targetPath);
        return true;
      } catch {
        return false;
      }
    },
    realPath: async (targetPath) => {
      return await realpath(_getAbsolutePathFromFilePath(targetPath));
    },
    isPortAvailable: RunLocalCommand.isPortAvailable,
  };
}

/** Creates filesystem-backed adapters for local Supabase environment I/O. */
export const FileSystemIO = {
  /** Returns an absolute path or rejects a relative path. */
  getAbsolutePathFromFilePath: _getAbsolutePathFromFilePath,

  /** Creates the filesystem read adapter for a project root. */
  createFileReadIO: _createFileReadIO,

  /** Creates the filesystem write adapter. */
  createFileWriteIO: _createFileWriteIO,

  /** Creates filesystem path and port inspection adapters. */
  createPathIO: _createPathIO,
};
