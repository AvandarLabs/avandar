import { assertMaySelectDataset } from "@sbfn/_shared/assertMaySelectDataset/assertMaySelectDataset.ts";
import { AvaHTTPError } from "@sbfn/_shared/AvaHTTPError.ts";
import { describe, expect, it, vi } from "vitest";
import type { AvaSupabaseClient } from "@sbfn/_shared/supabase.ts";

const DATASET_ID = "11111111-1111-4111-8111-111111111111";

/** A caller's client whose access check answers `data` and `error`. */
function _makeCallerClient(
  answer: Readonly<{ data: unknown; error: { message: string } | null }>,
): AvaSupabaseClient {
  const rpc = vi.fn(async () => {
    return answer;
  });
  // A partial fake: the access check is the only call this makes.
  return { rpc } as unknown as AvaSupabaseClient;
}

describe("assertMaySelectDataset", () => {
  it("lets a caller through who may see the dataset", async () => {
    await expect(
      assertMaySelectDataset({
        supabaseClient: _makeCallerClient({ data: true, error: null }),
        datasetId: DATASET_ID,
      }),
    ).resolves.toBeUndefined();
  });

  it("refuses a caller who may not see the dataset with a 403", async () => {
    const check = assertMaySelectDataset({
      supabaseClient: _makeCallerClient({ data: false, error: null }),
      datasetId: DATASET_ID,
    });

    await expect(check).rejects.toBeInstanceOf(AvaHTTPError);
    await expect(check).rejects.toHaveProperty("httpCode", 403);
  });

  it("refuses with the same 403 when the check itself fails, so a failure never reads as allowed", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});

    const check = assertMaySelectDataset({
      supabaseClient: _makeCallerClient({
        data: null,
        error: { message: "rpc failed" },
      }),
      datasetId: DATASET_ID,
    });

    await expect(check).rejects.toHaveProperty("httpCode", 403);
    await expect(check).rejects.toThrow(`No dataset '${DATASET_ID}' found`);
  });
});
