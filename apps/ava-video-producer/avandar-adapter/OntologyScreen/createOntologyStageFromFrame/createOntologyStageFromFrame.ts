type OntologyField = Readonly<{
  name: string;
  source: "cases" | "facilities";
  isIdentifier?: boolean;
  isLabel?: boolean;
}>;

const RESPONSE_FIELDS: readonly OntologyField[] = [
  { name: "case_id", source: "cases", isIdentifier: true },
  { name: "case_label", source: "cases", isLabel: true },
  { name: "district_name", source: "cases" },
  { name: "referral_status", source: "cases" },
];
const FACILITY_FIELDS: readonly OntologyField[] = [
  { name: "facility_id", source: "facilities", isIdentifier: true },
  { name: "facility_name", source: "facilities", isLabel: true },
  { name: "district_name", source: "facilities" },
  { name: "supply_kits_available", source: "facilities" },
];

/** Concept inspection state depends only on the requested body frame. */
export function createOntologyStageFromFrame(frame: number) {
  const conceptKey = frame < 338 ? "response" : "facility";
  return {
    conceptKey,
    fields: conceptKey === "response" ? RESPONSE_FIELDS : FACILITY_FIELDS,
  } as const;
}

/** The complete inspection sequence, followed by a resolved reading hold. */
export const ONTOLOGY_DURATION = 600;

/** Body-local product targets measured after the component stage renders. */
export const ONTOLOGY_BEATS = [
  { frame: 90, target: "ontology-response-label", action: "point" },
  { frame: 210, target: "ontology-response-source", action: "point" },
  { frame: 330, target: "ontology-facility", action: "click" },
  { frame: 450, target: "ontology-facility-identifier", action: "point" },
] as const;
