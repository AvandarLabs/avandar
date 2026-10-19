/** Options every pipeline's `run()` accepts. */
export type PipelineRunOptions = Readonly<{
  /**
   * Process at most this many datasets, to try a pipeline against a real
   * source without a full run. A pipeline that cannot honor it throws.
   */
  limit?: number;
}>;
