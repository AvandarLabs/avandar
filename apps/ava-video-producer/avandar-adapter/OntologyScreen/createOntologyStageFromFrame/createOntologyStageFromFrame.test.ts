import assert from "node:assert/strict";
import test from "node:test";
import { prop } from "@avandar/utils";
import { createOntologyStageFromFrame } from "./createOntologyStageFromFrame";

// A wrong threshold or retained selection would inspect the wrong concept.
test("concept inspection changes from response fields to facility fields", () => {
  assert.equal(createOntologyStageFromFrame(0).conceptKey, "response");
  assert.equal(createOntologyStageFromFrame(337).conceptKey, "response");
  assert.equal(createOntologyStageFromFrame(338).conceptKey, "facility");
  assert.deepEqual(createOntologyStageFromFrame(599).fields, [
    { name: "facility_id", source: "facilities", isIdentifier: true },
    { name: "facility_name", source: "facilities", isLabel: true },
    { name: "district_name", source: "facilities" },
    { name: "supply_kits_available", source: "facilities" },
  ]);
});

test("rewinding inspection restores the response attributes", () => {
  createOntologyStageFromFrame(599);
  assert.deepEqual(createOntologyStageFromFrame(0).fields.map(prop("name")), [
    "case_id",
    "case_label",
    "district_name",
    "referral_status",
  ]);
});
