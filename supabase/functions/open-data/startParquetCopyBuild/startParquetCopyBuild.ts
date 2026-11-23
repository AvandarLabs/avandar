/**
 * Where a copy build is sent, and the project it builds in: the pipeline
 * server, its secret, and this edge function's own Supabase project.
 */
export type PipelineServerTarget = Readonly<{
  serverUrl: string;
  serverSecret: string;
  /** This project's API URL, as the pipeline server can reach it. */
  supabaseUrl: string;
  serviceRoleKey: string;
}>;

/** How long the pipeline server has to accept a build. It answers at once. */
const START_TIMEOUT_MS = 10_000;

/**
 * How long a build that carries a complete sample has to be accepted: the
 * sample, up to tens of megabytes, is uploaded with the request.
 */
const SAMPLE_START_TIMEOUT_MS = 60_000;

function _read(
  getEnv: (name: string) => string | undefined,
  name: string,
): string | undefined {
  const value = getEnv(name)?.trim();
  return value === undefined || value === "" ? undefined : value;
}

/**
 * Reads where copy builds go from the environment: `AVA_PIPELINE_SERVER_URL`
 * and `AVA_PIPELINE_SERVER_SECRET`, and this project's `SUPABASE_URL` and
 * `SB_SECRET_KEY`. Locally, the edge runtime sees its project as
 * `http://kong:8000`, which a pipeline server on the host cannot reach, so
 * `AVA_PIPELINE_SERVER_SUPABASE_URL` overrides the URL sent to it.
 *
 * @param getEnv - Reads one environment variable.
 * @returns The target, or `undefined` when no pipeline server is configured.
 */
export function readPipelineServerTarget(
  getEnv: (name: string) => string | undefined,
): PipelineServerTarget | undefined {
  const serverUrl = _read(getEnv, "AVA_PIPELINE_SERVER_URL");
  const serverSecret = _read(getEnv, "AVA_PIPELINE_SERVER_SECRET");
  const supabaseUrl =
    _read(getEnv, "AVA_PIPELINE_SERVER_SUPABASE_URL") ??
    _read(getEnv, "SUPABASE_URL");
  const serviceRoleKey = _read(getEnv, "SB_SECRET_KEY");
  if (
    serverUrl === undefined ||
    serverSecret === undefined ||
    supabaseUrl === undefined ||
    serviceRoleKey === undefined
  ) {
    return undefined;
  }
  return { serverUrl, serverSecret, supabaseUrl, serviceRoleKey };
}

/**
 * Asks the pipeline server to run a claimed build of a listing's Parquet
 * copy. The server answers as soon as the build is queued. The project's
 * key travels in a header, never in the body, and no error repeats it.
 *
 * @param args.target Where the build goes, and the project it builds in.
 * @param args.catalogListingId The listing.
 * @param args.buildId The build id the claim returned.
 * @param args.completeSampleCsv A column type sample that holds the whole
 *   source, which the server copies instead of reading the source again.
 * @param args.fetchImpl Replaces `fetch`, for tests.
 * @throws When the server cannot be reached or does not accept the build.
 */
export async function startParquetCopyBuild(
  args: Readonly<{
    target: PipelineServerTarget;
    catalogListingId: string;
    buildId: string;
    completeSampleCsv?: string;
    fetchImpl?: typeof fetch;
  }>,
): Promise<void> {
  const { target } = args;
  const fetchImpl = args.fetchImpl ?? fetch;
  const serverUrl = target.serverUrl.replace(/\/+$/, "");
  const listingPath = encodeURIComponent(args.catalogListingId);
  const response = await fetchImpl(
    `${serverUrl}/open-data-cache/${listingPath}/build`,
    {
      method: "POST",
      headers: {
        authorization: `Bearer ${target.serverSecret}`,
        "content-type": "application/json",
        "x-ava-supabase-url": target.supabaseUrl,
        "x-ava-supabase-service-role-key": target.serviceRoleKey,
      },
      body: JSON.stringify({
        buildId: args.buildId,
        ...(args.completeSampleCsv === undefined
          ? {}
          : { completeSampleCsv: args.completeSampleCsv }),
      }),
      signal: AbortSignal.timeout(
        args.completeSampleCsv === undefined
          ? START_TIMEOUT_MS
          : SAMPLE_START_TIMEOUT_MS,
      ),
    },
  );
  if (!response.ok) {
    throw new Error(
      `The pipeline server did not accept the build: ${response.status}`,
    );
  }
}
