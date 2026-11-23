import assert from "node:assert/strict";
import test from "node:test";
import { prop } from "@avandar/utils";
import { makeOntologyStageFromFrame } from "../makeOntologyStageFromFrame/makeOntologyStageFromFrame";

// A wrong threshold or retained selection would inspect the wrong concept.
test("concept inspection changes from response fields to facility fields", () => {
  assert.equal(makeOntologyStageFromFrame(0).conceptKey, "response");
  assert.equal(makeOntologyStageFromFrame(337).conceptKey, "response");
  assert.equal(makeOntologyStageFromFrame(338).conceptKey, "facility");
  assert.deepEqual(makeOntologyStageFromFrame(599).fields, [
    { name: "facility_id", source: "facilities", isIdentifier: true },
    { name: "facility_name", source: "facilities", isLabel: true },
    { name: "district_name", source: "facilities" },
    { name: "supply_kits_available", source: "facilities" },
  ]);
});

test("rewinding inspection restores the response attributes", () => {
  makeOntologyStageFromFrame(599);
  assert.deepEqual(makeOntologyStageFromFrame(0).fields.map(prop("name")), [
    "case_id",
    "case_label",
    "district_name",
    "referral_status",
  ]);
});
