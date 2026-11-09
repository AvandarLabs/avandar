import { z } from "zod";
import {
  buildOpenDataListingUrl,
  readOpenDataAccessToken,
} from "@/lib/openData/fetchOpenDataColumnTypeSample/fetchOpenDataColumnTypeSample";
import type { DataCatalogListing } from "$/models/data-catalog-listings/DataCatalogListing/DataCatalogListing";
import type { OpenDataCompleteSample } from "@/lib/openData/fetchOpenDataColumnTypeSample/fetchOpenDataColumnTypeSample";

/**
 * What the open-data edge function says about an ODC listing's Parquet copy.
 *
 * - `ready`: the copy's parts in the public `opendata` bucket, in row order.
 *   `isStale` means the source changed since it was built, and a rebuild is
 *   running.
 * - `building`: a build runs. Ask again later.
 * - `failed`: the last build failed and is not retried yet, or never will be.
 * - `unavailable`: this Avandar instance builds no copies.
 */
export type OpenDataParquetCopyAnswer =
  | Readonly<{
      status: "ready";
      partPaths: readonly string[];
      sourceVersion: string | undefined;
      isStale: boolean;
    }>
  | Readonly<{ status: "building" }>
  | Readonly<{ status: "failed"; failureCode: string }>
  | Readonly<{
      status: "unavailable";
      reason: "not-api-backed" | "copies-unavailable";
    }>;

const AnswerSchema = z.discriminatedUnion("status", [
  z.object({
    status: z.literal("ready"),
    partPaths: z.array(z.string()).min(1),
    sourceVersion: z.string().optional(),
    isStale: z.boolean(),
  }),
  z.object({ status: z.literal("building") }),
  z.object({ status: z.literal("failed"), failureCode: z.string() }),
  z.object({
    status: z.literal("unavailable"),
    reason: z.enum(["not-api-backed", "copies-unavailable"]),
  }),
]);

/** The statuses the route answers with one of its JSON answers. */
const ANSWER_STATUSES: ReadonlySet<number> = new Set([200, 202, 409, 503]);

async function _readAnswer(
  response: Response,
): Promise<OpenDataParquetCopyAnswer | undefined> {
  if (!ANSWER_STATUSES.has(response.status)) {
    return undefined;
  }
  try {
    const parsed = AnswerSchema.safeParse(await response.json());
    if (!parsed.success) {
      return undefined;
    }
    return parsed.data.status === "ready"
      ? { ...parsed.data, sourceVersion: parsed.data.sourceVersion }
      : parsed.data;
  } catch {
    return undefined;
  }
}

/**
 * Asks the open-data edge function for an ODC listing's Parquet copy. Asking
 * starts a build when the listing has no copy, or a rebuild when its copy is
 * stale, so this is also how a copy is first requested.
 *
 * A complete column type sample, handed back with the token it was served
 * with, is copied instead of the source, so the source is not read again.
 *
 * @param catalogListingId The listing.
 * @param options.accessToken The caller's token, when it is already read.
 * @param options.completeSample A sample that holds the whole source.
 * @returns The copy's state.
 * @throws When the route answers with anything but a copy answer, such as a
 *   listing the caller cannot see.
 */
export async function requestOpenDataParquetCopy(
  catalogListingId: DataCatalogListing.Id,
  options: {
    accessToken?: string;
    completeSample?: OpenDataCompleteSample;
  } = {},
): Promise<OpenDataParquetCopyAnswer> {
  const accessToken = options.accessToken ?? (await readOpenDataAccessToken());
  const response = await fetch(
    `${buildOpenDataListingUrl(catalogListingId)}/parquet-cache`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      // The route parses a JSON body on every POST, so it gets an empty one
      // when there is no sample to hand back.
      body: JSON.stringify(
        options.completeSample === undefined
          ? {}
          : { completeSample: options.completeSample },
      ),
    },
  );
  const answer = await _readAnswer(response);
  if (answer === undefined) {
    throw new Error(
      `Open data Parquet copy request failed: ${response.status}`,
    );
  }
  return answer;
}
