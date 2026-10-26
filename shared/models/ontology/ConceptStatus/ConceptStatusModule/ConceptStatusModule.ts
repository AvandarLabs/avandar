import { assertIsDefined } from "@avandar/utils";
import type {
  ConceptStatusColorKey,
  ConceptStatusDraft,
  ConceptStatusId,
  ConceptStatusModel,
} from "$/models/ontology/ConceptStatus/ConceptStatus.types.ts";

/**
 * The swatches a status color comes from, in the order new statuses take
 * them. `neutral` comes from the `neutral` ramp because DESIGN.md bans stock
 * gray. The other seven are the categorical chart swatches.
 */
const PALETTE: ReadonlyArray<{ key: ConceptStatusColorKey; hex: string }> = [
  { key: "neutral", hex: "#637c95" },
  { key: "green", hex: "#40c057" },
  { key: "blue", hex: "#228be6" },
  { key: "teal", hex: "#12b886" },
  { key: "yellow", hex: "#fab005" },
  { key: "orange", hex: "#fd7e14" },
  { key: "red", hex: "#fa5252" },
  { key: "grape", hex: "#be4bdb" },
];

/** The attribute name the built-in `status` column owns. */
const RESERVED_ATTRIBUTE_NAME = "status";

/**
 * The first palette color not in `usedColors`, ignoring case. Once every
 * color is used it wraps around the palette.
 */
function getNextFreeColor(usedColors: readonly string[]): string {
  const usedHexes = new Set(
    usedColors.map((color) => {
      return color.toLowerCase();
    }),
  );
  const nextEntry =
    PALETTE.find((entry) => {
      return !usedHexes.has(entry.hex);
    }) ?? PALETTE[usedColors.length % PALETTE.length];
  assertIsDefined(nextEntry, "The status palette is empty");
  return nextEntry.hex;
}

/** The palette swatch of a hex color, ignoring case, if it has one. */
function getColorKey(hex: string): ConceptStatusColorKey | undefined {
  const normalizedHex = hex.toLowerCase();
  return PALETTE.find((entry) => {
    return entry.hex === normalizedHex;
  })?.key;
}

/** Statuses in display order: ascending position, then name. */
function sortByPosition<S extends { position: number; name: string }>(
  statuses: readonly S[],
): S[] {
  return [...statuses].sort((statusA, statusB) => {
    return (
      statusA.position - statusB.position ||
      statusA.name.localeCompare(statusB.name)
    );
  });
}

/** Saved statuses as editable drafts, in display order. */
function toDrafts(
  statuses: ReadonlyArray<ConceptStatusModel["Read"]>,
): ConceptStatusDraft[] {
  return sortByPosition(statuses).map((status) => {
    return {
      id: status.id,
      name: status.name,
      description: status.description ?? "",
      color: status.color,
    };
  });
}

/** Ids of saved statuses that are no longer in the edited set. */
function getRemovedStatusIds(options: {
  savedStatusIds: readonly ConceptStatusId[];
  statuses: readonly ConceptStatusDraft[];
}): ConceptStatusId[] {
  const keptIds = new Set(
    options.statuses.map((status) => {
      return status.id;
    }),
  );
  return options.savedStatusIds.filter((statusId) => {
    return !keptIds.has(statusId);
  });
}

/**
 * Whether an attribute name collides with the built-in `status` column,
 * ignoring case and surrounding whitespace.
 */
function isReservedAttributeName(name: string): boolean {
  return name.trim().toLowerCase() === RESERVED_ATTRIBUTE_NAME;
}

/**
 * Renames a reserved attribute name to `<name> (attribute)`, the rename the
 * status backfill migration applied. Any other name is returned unchanged.
 */
function toNonReservedAttributeName(name: string): string {
  return isReservedAttributeName(name) ? `${name.trim()} (attribute)` : name;
}

/**
 * Pure helpers for a case type's status set: the color palette, display
 * order, validation, and turning an edited set into the save RPC's payload.
 */
export const ConceptStatusModule = {
  PALETTE,
  getNextFreeColor,
  getColorKey,
  sortByPosition,
  toDrafts,
  getRemovedStatusIds,
  isReservedAttributeName,
  toNonReservedAttributeName,
};
