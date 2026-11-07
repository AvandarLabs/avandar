import { randomUUID } from "node:crypto";
import { createSupabaseDrivesStore } from "@etl/stores/SupabaseDrivesStore/createSupabaseDrivesStore";
import { createClient } from "@supabase/supabase-js";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import type { DriveRow } from "@etl/stores/EtlStores.types";

const DRIVES_TABLE = "data_catalog_drives";
const PIPELINE_NAME = `etl-fixture-${randomUUID()}`;
const DRIVE: DriveRow = {
  pipelineName: PIPELINE_NAME,
  driveKey: "https://etl-fixture.invalid",
  organizationLabels: { 1: "City", 2: "Agency" },
};

const client = createClient(
  process.env.SUPABASE_URL ?? "",
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
  { auth: { persistSession: false } },
);
const store = createSupabaseDrivesStore({
  client,
  drivesTable: DRIVES_TABLE,
});

beforeAll(async () => {
  // Removes what a crashed earlier run left behind.
  const { error } = await client
    .from(DRIVES_TABLE)
    .delete()
    .like("pipeline_name", "etl-fixture-%");
  expect(error).toBeNull();
});

afterEach(async () => {
  const { error } = await client
    .from(DRIVES_TABLE)
    .delete()
    .eq("pipeline_name", PIPELINE_NAME);
  expect(error).toBeNull();
});

describe("createSupabaseDrivesStore", () => {
  it("writes a drive's labels and returns the same id on a rewrite", async () => {
    const firstId = await store.upsert(DRIVE);
    const secondId = await store.upsert({
      ...DRIVE,
      organizationLabels: { 1: "State" },
    });

    expect(secondId).toBe(firstId);
    const { data } = await client
      .from(DRIVES_TABLE)
      .select("organization1_label, organization2_label")
      .eq("id", firstId)
      .single();
    expect(data).toEqual({
      organization1_label: "State",
      organization2_label: null,
    });
  });

  it("gives another drive of the pipeline its own id", async () => {
    const firstId = await store.upsert(DRIVE);
    const secondId = await store.upsert({
      ...DRIVE,
      driveKey: "https://other.etl-fixture.invalid",
    });

    expect(secondId).not.toBe(firstId);
  });

  it("names the table when a request fails", async () => {
    const brokenStore = createSupabaseDrivesStore({
      client,
      drivesTable: "no_such_table",
    });

    await expect(brokenStore.upsert(DRIVE)).rejects.toThrow(
      "Supabase failed writing drive https://etl-fixture.invalid to no_such_table",
    );
  });
});
