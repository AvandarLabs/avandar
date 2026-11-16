import { assertIsDefined } from "@avandar/utils";
import { t } from "@lingui/core/macro";
import { uuid } from "$/lib/uuid";
import { ConceptStatus } from "$/models/ontology/ConceptStatus/ConceptStatus";

function _paletteHex(colorKey: ConceptStatus.ColorKey): string {
  const entry = ConceptStatus.PALETTE.find((paletteEntry) => {
    return paletteEntry.key === colorKey;
  });
  assertIsDefined(entry, `The status palette has no ${colorKey} swatch`);
  return entry.hex;
}

/**
 * The status set every new case type starts with: Active, the default, then
 * Inactive. Names and descriptions are translated into the creator's
 * language when the set is built, and stored as data from then on.
 */
export function makeDefaultStatusDrafts(): {
  statuses: ConceptStatus.Draft[];
  defaultStatusId: ConceptStatus.Id;
} {
  const activeStatusId = uuid<ConceptStatus.Id>();
  return {
    statuses: [
      {
        id: activeStatusId,
        name: t`Active`,
        description: t`Open and being worked on.`,
        color: _paletteHex("green"),
      },
      {
        id: uuid<ConceptStatus.Id>(),
        name: t`Inactive`,
        description: t`No longer being worked on.`,
        color: _paletteHex("neutral"),
      },
    ],
    defaultStatusId: activeStatusId,
  };
}
