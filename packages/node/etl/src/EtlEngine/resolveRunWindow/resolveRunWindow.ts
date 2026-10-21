import type {
  EtlRunOptions,
  EtlRunWindow,
} from "@etl/EtlEngine/EtlEngine.types";

/**
 * Resolves one crawl's window. An explicit `since` wins. Otherwise an
 * incremental run starts at the scope's checkpoint, and a full run has no
 * lower bound. `until` always passes through.
 *
 * @param args.options - The run's options.
 * @param args.checkpoint - The scope's checkpoint, if it was read.
 * @returns The window.
 */
export function resolveRunWindow(args: {
  options: EtlRunOptions;
  checkpoint: Date | undefined;
}): EtlRunWindow {
  const { options, checkpoint } = args;
  const since =
    options.since ??
    (options.mode === "incremental" ? checkpoint : undefined);
  return { since, until: options.until };
}
