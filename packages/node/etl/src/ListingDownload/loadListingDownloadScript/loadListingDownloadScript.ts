import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import type { PipelineDownloadConfig } from "@etl/EtlConfig/PipelineConfig.types";
import type { ListingDownloadScript } from "@etl/ListingDownload/ListingDownload.types";

/**
 * Imports the download script a pipeline config's `download` block names.
 *
 * @param args.download - The config's `download` block.
 * @param args.configDir - The config file's directory. The script's path is
 *   relative to it.
 * @returns The script.
 * @throws When the script cannot be imported or does not default-export a
 *   function.
 */
export async function loadListingDownloadScript(
  args: Readonly<{ download: PipelineDownloadConfig; configDir: string }>,
): Promise<ListingDownloadScript> {
  const absolutePath = resolve(args.configDir, args.download.script);
  const module = (await import(
    /* @vite-ignore */ pathToFileURL(absolutePath).href
  )) as { default?: unknown };
  if (typeof module.default !== "function") {
    throw new Error(
      `${absolutePath} must default-export a function ({ listing, pageRows }) => download.`,
    );
  }
  return module.default as ListingDownloadScript;
}
