import { randomUUID } from "node:crypto";
import { createSupabaseObjectStore } from "@etl/stores/SupabaseObjectStore/createSupabaseObjectStore";
import { createClient } from "@supabase/supabase-js";
import { afterEach, beforeAll, describe, expect, it } from "vitest";

const BUCKET = "opendata";
const FIXTURE_FOLDER = "etl-fixture";
const OBJECT_PATH = `${FIXTURE_FOLDER}/${randomUUID()}.parquet`;

const client = createClient(
  process.env.SUPABASE_URL ?? "",
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
  { auth: { persistSession: false } },
);
const store = createSupabaseObjectStore({ client, bucket: BUCKET });

beforeAll(async () => {
  // Removes what a crashed earlier run left behind in the fixture folder.
  const { data, error } = await client.storage
    .from(BUCKET)
    .list(FIXTURE_FOLDER, { limit: 1000 });
  expect(error).toBeNull();
  const leftoverPaths = (data ?? []).map((object) => {
    return `${FIXTURE_FOLDER}/${object.name}`;
  });
  if (leftoverPaths.length > 0) {
    const { error: removeError } = await client.storage
      .from(BUCKET)
      .remove(leftoverPaths);
    expect(removeError).toBeNull();
  }
});

afterEach(async () => {
  const { error } = await client.storage.from(BUCKET).remove([OBJECT_PATH]);
  expect(error).toBeNull();
});

describe("createSupabaseObjectStore", () => {
  it("replaces an existing object at the same path", async () => {
    await store.upload({
      path: OBJECT_PATH,
      bytes: new Uint8Array([1]),
      contentType: "application/octet-stream",
    });
    await store.upload({
      path: OBJECT_PATH,
      bytes: new Uint8Array([2, 3]),
      contentType: "application/octet-stream",
    });

    const { data } = await client.storage.from(BUCKET).download(OBJECT_PATH);
    expect([
      ...new Uint8Array((await data?.arrayBuffer()) ?? new ArrayBuffer(0)),
    ]).toEqual([2, 3]);
  });

  it("serves objects from the bucket's public URL", () => {
    expect(store.getPublicUrl(OBJECT_PATH)).toContain(
      `/${BUCKET}/${OBJECT_PATH}`,
    );
  });
});
