import type {
  EtlRunOptions,
  EtlRunWindow,
} from "@etl/EtlEngine/EtlEngine.types";

/**
 * Resolves one drive's crawl window. An explicit `since` wins. Otherwise an
 * incremental run starts at the drive's high-water mark, and a full run has
 * no lower bound. `until` always passes through.
 *
 * @param args.options - The run's options.
 * @param args.highWaterMark - The drive's high-water mark, if it was read.
 * @returns The window.
 */
export function resolveRunWindow(args: {
  options: EtlRunOptions;
  highWaterMark: Date | undefined;
}): EtlRunWindow {
  const { options, highWaterMark } = args;
  const since =
    options.since ??
    (options.mode === "incremental" ? highWaterMark : undefined);
  return { since, until: options.until };
}
