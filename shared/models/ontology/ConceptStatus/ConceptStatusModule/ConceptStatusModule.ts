import { assertIsDefined } from "@avandar/utils";
import type { ConceptId } from "$/models/ontology/Concept/Concept.types.ts";
import type {
  ConceptStatusColorKey,
  ConceptStatusDraft,
  ConceptStatusId,
  ConceptStatusModel,
  ConceptStatusSaveErrorHint,
  ConceptStatusSavePayload,
  ConceptStatusSetIssue,
  ConceptStatusSetValue,
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

const SAVE_ERROR_HINTS: readonly ConceptStatusSaveErrorHint[] = [
  "case_types_editor_required",
  "status_set_empty",
  "status_name_required",
  "status_names_not_unique",
  "status_color_invalid",
  "status_not_in_case_type",
  "status_default_not_in_set",
  "status_replacement_required",
  "status_replacement_not_in_set",
];

type Replacements = Readonly<Partial<Record<ConceptStatusId, ConceptStatusId>>>;

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

function _toNameKey(name: string): string {
  return name.trim().toLowerCase();
}

function _findNameIssues(
  statuses: readonly ConceptStatusDraft[],
): ConceptStatusSetIssue[] {
  const countsByName = new Map<string, number>();
  statuses.forEach((status) => {
    const nameKey = _toNameKey(status.name);
    countsByName.set(nameKey, (countsByName.get(nameKey) ?? 0) + 1);
  });
  return statuses.flatMap((status): ConceptStatusSetIssue[] => {
    const nameKey = _toNameKey(status.name);
    if (nameKey === "") {
      return [{ type: "name_required", statusId: status.id }];
    }
    if ((countsByName.get(nameKey) ?? 0) > 1) {
      return [{ type: "name_not_unique", statusId: status.id }];
    }
    return [];
  });
}

function _findReplacementIssues(options: {
  statuses: readonly ConceptStatusDraft[];
  savedStatusIds: readonly ConceptStatusId[];
  recordCounts: Readonly<Partial<Record<ConceptStatusId, number>>>;
  replacements: Replacements;
}): ConceptStatusSetIssue[] {
  const keptIds = new Set(
    options.statuses.map((status) => {
      return status.id;
    }),
  );
  return getRemovedStatusIds(options)
    .filter((statusId) => {
      const replacementId = options.replacements[statusId];
      const hasRecords = (options.recordCounts[statusId] ?? 0) > 0;
      return (
        hasRecords &&
        (replacementId === undefined || !keptIds.has(replacementId))
      );
    })
    .map((statusId): ConceptStatusSetIssue => {
      return { type: "replacement_required", statusId };
    });
}

/**
 * Every reason the edited status set cannot be saved yet, in display order.
 * Empty when it can be saved. Record counts, saved ids, and replacements
 * only apply when editing a saved set.
 */
function findSetIssues(options: {
  value: ConceptStatusSetValue;
  recordCounts?: Readonly<Partial<Record<ConceptStatusId, number>>>;
  savedStatusIds?: readonly ConceptStatusId[];
  replacements?: Replacements;
}): ConceptStatusSetIssue[] {
  const {
    value,
    recordCounts = {},
    savedStatusIds = [],
    replacements = {},
  } = options;
  if (value.statuses.length === 0) {
    return [{ type: "empty_set" }];
  }
  const hasDefault = value.statuses.some((status) => {
    return status.id === value.defaultStatusId;
  });
  return [
    ..._findNameIssues(value.statuses),
    ...(hasDefault ? [] : [{ type: "default_required" } as const]),
    ..._findReplacementIssues({
      statuses: value.statuses,
      savedStatusIds,
      recordCounts,
      replacements,
    }),
  ];
}

/**
 * The save RPC's payload for an edited status set: positions follow the
 * set's order, names are trimmed, blank descriptions are dropped, and only
 * removed statuses keep a replacement.
 *
 * @throws When the set has no default status. Check `findSetIssues` first.
 */
function buildSavePayload(options: {
  conceptId: ConceptId;
  value: ConceptStatusSetValue;
  savedStatusIds: readonly ConceptStatusId[];
  replacements: Replacements;
}): ConceptStatusSavePayload {
  const { conceptId, value, savedStatusIds, replacements } = options;
  assertIsDefined(
    value.defaultStatusId,
    "A status set needs a default status before it can be saved",
  );
  const removedReplacements: Partial<Record<ConceptStatusId, ConceptStatusId>> =
    {};
  getRemovedStatusIds({ savedStatusIds, statuses: value.statuses }).forEach(
    (statusId) => {
      const replacementId = replacements[statusId];
      if (replacementId) {
        removedReplacements[statusId] = replacementId;
      }
    },
  );
  return {
    conceptId,
    statuses: value.statuses.map((status, index) => {
      return {
        id: status.id,
        name: status.name.trim(),
        description: status.description.trim() || undefined,
        color: status.color,
        position: index,
      };
    }),
    defaultStatusId: value.defaultStatusId,
    replacements: removedReplacements,
  };
}

/**
 * The save RPC's `hint` on a thrown database error, when it is one the
 * client knows how to explain.
 */
function toSaveErrorHint(
  error: unknown,
): ConceptStatusSaveErrorHint | undefined {
  if (typeof error !== "object" || error === null || !("hint" in error)) {
    return undefined;
  }
  const { hint } = error;
  return SAVE_ERROR_HINTS.find((knownHint) => {
    return knownHint === hint;
  });
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
  findSetIssues,
  buildSavePayload,
  toSaveErrorHint,
};
