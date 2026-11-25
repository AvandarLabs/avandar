import { ConceptStatus } from "$/models/ontology/ConceptStatus/ConceptStatus.ts";
import type { ChatCaseStatus } from "$/types/chat.types.ts";

/** The most statuses one proposed case type may carry. */
export const MAX_PROPOSED_STATUSES = 12;

type ProposedStatus = {
  name: string;
  description: string;
  color: string | undefined;
};

function _asTrimmedString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : undefined;
}

/** A palette hex in lowercase, or undefined for anything else. */
function _asPaletteHex(value: unknown): string | undefined {
  const hex =
    typeof value === "string" ? value.trim().toLowerCase() : undefined;
  return ConceptStatus.PALETTE.some((swatch) => {
    return swatch.hex === hex;
  })
    ? hex
    : undefined;
}

function _parseStatus(raw: unknown): ProposedStatus | undefined {
  if (!raw || typeof raw !== "object") {
    return undefined;
  }
  const record = raw as Record<string, unknown>;
  const name = _asTrimmedString(record.name);
  if (!name) {
    return undefined;
  }
  return {
    name,
    description: _asTrimmedString(record.description) ?? "",
    color: _asPaletteHex(record.color),
  };
}

function _hasUniqueNames(statuses: readonly ProposedStatus[]): boolean {
  const names = new Set(
    statuses.map((status) => {
      return status.name.toLowerCase();
    }),
  );
  return names.size === statuses.length;
}

/**
 * Gives every status without a color the first palette color the set does
 * not use yet, counting the colors the model chose itself.
 */
function _fillMissingColors(
  statuses: readonly ProposedStatus[],
): ChatCaseStatus[] {
  const usedColors = statuses.flatMap((status) => {
    return status.color ? [status.color] : [];
  });
  return statuses.map((status) => {
    if (status.color) {
      return { ...status, color: status.color };
    }
    const color = ConceptStatus.getNextFreeColor(usedColors);
    usedColors.push(color);
    return { name: status.name, description: status.description, color };
  });
}

/**
 * Parses the status set a `proposeCaseType` call carries, or returns undefined
 * when it carries none or an unusable one.
 *
 * All or nothing: one unusable status, a repeated name, too many statuses, or
 * a default that names none of them drops the whole set rather than keeping a
 * shortened one. The client then starts the case type with its translated
 * default set, which is a better start than a workflow missing a step.
 */
export function parseProposedCaseStatuses(
  options: Readonly<{ rawStatuses: unknown; rawDefaultStatusName: unknown }>,
): { statuses: ChatCaseStatus[]; defaultStatusName: string } | undefined {
  if (!Array.isArray(options.rawStatuses)) {
    return undefined;
  }
  const parsedStatuses = options.rawStatuses.map(_parseStatus);
  const statuses = parsedStatuses.filter((status): status is ProposedStatus => {
    return status !== undefined;
  });
  if (
    statuses.length === 0 ||
    statuses.length !== parsedStatuses.length ||
    statuses.length > MAX_PROPOSED_STATUSES ||
    !_hasUniqueNames(statuses)
  ) {
    return undefined;
  }

  const requestedDefaultName = _asTrimmedString(
    options.rawDefaultStatusName,
  )?.toLowerCase();
  const defaultStatus =
    requestedDefaultName === undefined
      ? statuses[0]
      : statuses.find((status) => {
          return status.name.toLowerCase() === requestedDefaultName;
        });
  if (!defaultStatus) {
    return undefined;
  }
  return {
    statuses: _fillMissingColors(statuses),
    defaultStatusName: defaultStatus.name,
  };
}
