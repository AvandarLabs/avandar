/**
 * The run options `ava pipeline run` forwards, as the user typed them. The
 * pipeline server and the local runner validate them.
 */
export type PipelineRunRequestOptions = Readonly<{
  incremental?: boolean;
  since?: string;
  until?: string;
  limit?: number;
}>;
