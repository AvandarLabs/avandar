import { propEq } from "@avandar/utils";
import fixtures from "../fixtures.json";
import type { CaseTypeAttributesList } from "@/views/OntologyDesignerApp/ConceptMetaView/CaseTypeAttributesList";
import type { ComponentProps } from "react";
/** Approved fictional case fixture caseType. */
export const caseType = {
  id: "0239e74b-cd03-4b78-8fa3-5cb10ff02919",
  name: "Video - Harborfield response case - pilot",
  description:
    "Fictional Harborfield response records linked to visit activity by case_id.",
};
const casesSource = "Video - Harborfield cases";
const visitsSource = "Video - Harborfield visits";
/** Approved fictional case fixture record. */
export const record = fixtures.cases.find(propEq("case_id", "HF-0001"))!;
const kits = fixtures.visits
  .filter(propEq("case_id", record.case_id))
  .reduce((total, item) => {
    return total + Number(item.supply_kits_delivered);
  }, 0);
/** Approved fictional case fixture fields. */
export const fields = [
  {
    name: "case_label",
    value: record.case_label,
    sourceName: casesSource,
    isLabel: true,
  },
  {
    name: "district_name",
    value: record.district_name,
    sourceName: casesSource,
  },
  {
    name: "referral_status",
    value: record.referral_status,
    sourceName: casesSource,
  },
  { name: "supply_kits_delivered", value: kits, sourceName: visitsSource },
  {
    name: "case_id",
    value: record.case_id,
    sourceName: casesSource,
    isIdentifier: true,
  },
  {
    name: "case_id",
    value: record.case_id,
    sourceName: visitsSource,
    isIdentifier: true,
  },
];
/** Approved fictional case fixture datasets. */
export const datasets = [
  { id: "cases", name: casesSource },
  { id: "visits", name: visitsSource },
] as unknown as NonNullable<
  ComponentProps<typeof CaseTypeAttributesList>["datasets"]
>;
/** Approved fictional case fixture attributes. */
export const attributes = fields.map((field, index) => {
  return {
    id: `field-${index}`,
    name: field.name,
    description: undefined,
    isLabel: field.isLabel ?? false,
    isIdentifier: field.isIdentifier ?? false,
    mappingType: "dataset_column",
    mapping: {
      type: "dataset_column",
      datasetId: field.sourceName === casesSource ? "cases" : "visits",
    },
  };
}) as unknown as NonNullable<
  ComponentProps<typeof CaseTypeAttributesList>["attributes"]
>;
