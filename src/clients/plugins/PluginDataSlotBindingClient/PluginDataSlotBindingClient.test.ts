import { beforeEach, describe, expect, it, vi } from "vitest";
import { uuid } from "$/lib/uuid";
import type { Concept } from "$/models/ontology/Concept/Concept";
import type { PluginDataSlotBinding } from "$/models/PluginDataSlotBinding/PluginDataSlotBinding";
import type { PluginInstallation } from "$/models/PluginInstallation/PluginInstallation";

const { rpcMock } = vi.hoisted(() => {
  return { rpcMock: vi.fn() };
});

vi.mock("$/db/supabase/AvaSupabase", () => {
  return {
    AvaSupabase: {
      db: () => {
        return { from: vi.fn(), rpc: rpcMock };
      },
    },
  };
});

const { PluginDataSlotBindingClient } =
  await import("./PluginDataSlotBindingClient");

const INSTALLATION_ID = uuid<PluginInstallation.Id>();
const CONCEPT_ID = uuid<Concept.Id>();
const ONSET_ATTRIBUTE_ID = uuid();

const DRAFT: PluginDataSlotBinding.Draft = {
  slotId: "cases",
  sourceType: "concept",
  conceptId: CONCEPT_ID,
  datasetId: undefined,
  attributeMap: { onsetDate: ONSET_ATTRIBUTE_ID },
};

const SAVED_ROW = {
  attribute_map: { onsetDate: ONSET_ATTRIBUTE_ID },
  bound_by: uuid(),
  concept_id: CONCEPT_ID,
  created_at: "2026-11-11T10:00:00+00:00",
  dataset_id: null,
  id: uuid(),
  installation_id: INSTALLATION_ID,
  slot_id: "cases",
  source_type: "concept",
  updated_at: "2026-11-11T10:00:00+00:00",
  workspace_id: uuid(),
};

describe("PluginDataSlotBindingClient.saveBinding", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    rpcMock.mockReturnValue({
      throwOnError: () => {
        return Promise.resolve({ data: SAVED_ROW });
      },
    });
  });

  it("sends the draft to the save RPC under its parameter names", async () => {
    await PluginDataSlotBindingClient.saveBinding({
      installationId: INSTALLATION_ID,
      draft: DRAFT,
    });

    expect(rpcMock).toHaveBeenCalledWith(
      "rpc_plugin_data_slot_bindings__save",
      {
        p_installation_id: INSTALLATION_ID,
        p_slot_id: "cases",
        p_source_type: "concept",
        p_concept_id: CONCEPT_ID,
        p_attribute_map: { onsetDate: ONSET_ATTRIBUTE_ID },
      },
    );
  });

  it("returns the saved row with the plugin's attribute keys unchanged", async () => {
    const binding = await PluginDataSlotBindingClient.saveBinding({
      installationId: INSTALLATION_ID,
      draft: DRAFT,
    });

    expect(binding.attributeMap).toEqual({ onsetDate: ONSET_ATTRIBUTE_ID });
    expect(binding.datasetId).toBeUndefined();
  });
});
