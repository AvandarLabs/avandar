import type { Input } from "./ComponentMaterialReturn.schema";
/** A replacement material item with its authored identity and mass. */
type ReplacementMaterialItem = {
  route: "replacement";
  origin: "replacement";
  id: string;
  label: string;
  massKg: number;
};

/** Data for getMaterialItemsFromInput. */
type GetMaterialItemsResult = {
  origin: "returned";
  id: string;
  label: string;
  massKg: number;
  route: "reuse" | "repair" | "recycle" | "residue";
};

/**
 * Canonical identities include source/replacement origin and one destination.
 */
export function getMaterialItemsFromInput(
  input: Readonly<Input>,
): Array<GetMaterialItemsResult | ReplacementMaterialItem> {
  return [
    ...input.parts.map((part) => ({ ...part, origin: "returned" as const })),
    ...input.replacementInputs.map((part) => ({
      ...part,
      route: "replacement" as const,
      origin: "replacement" as const,
    })),
  ];
}
