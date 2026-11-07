import type { Gadget } from "$/models/gadgets/Gadget/Gadget";
import type { GadgetSearchResult } from "@/clients/gadgets/searchGadgets/searchGadgets";
import type { MentionCandidate } from "@/components/RichText/UserMention/filterMentionCandidates";

/**
 * One row of the `@` menu. `id` is stable across searches and unique in the
 * menu: the user id for a person, and type, id, and tile id for a gadget.
 * A gadget's `detail` is undefined when the search gave no sub-label, so the
 * list shows the gadget's translated type name instead.
 */
export type MentionMenuItem =
  | {
      kind: "person";
      id: string;
      label: string;
      detail: string;
      candidate: MentionCandidate;
    }
  | {
      kind: "gadget";
      id: string;
      label: string;
      detail: string | undefined;
      result: GadgetSearchResult;
    };

/** Which heading a group of `@` menu rows sits under. */
export type MentionMenuGroupKey =
  | "dashboards"
  | "datasets"
  | "maps"
  | "caseTypes"
  | "cases"
  | "people";

/** One titled run of `@` menu rows. The list supplies the title. */
export type MentionMenuGroup = {
  key: MentionMenuGroupKey;
  items: MentionMenuItem[];
};

const MAX_ITEMS_PER_GROUP = 5;

// People come first because they filter in the browser and show at once,
// while gadget groups arrive after a search. Appending them below keeps the
// default highlight from shifting.
const GROUP_ORDER: readonly MentionMenuGroupKey[] = [
  "people",
  "dashboards",
  "datasets",
  "maps",
  "caseTypes",
  "cases",
];

const GROUP_KEY_BY_GADGET_TYPE: Readonly<
  Record<Gadget.Type, MentionMenuGroupKey>
> = {
  dashboard: "dashboards",
  dashboard_tile: "dashboards",
  dataset: "datasets",
  map: "maps",
  concept: "caseTypes",
  individual: "cases",
};

function _buildGadgetItem(result: GadgetSearchResult): MentionMenuItem {
  const { gadgetType, gadgetId, subId } = result.ref;
  return {
    kind: "gadget",
    id: `${gadgetType}:${gadgetId}:${subId ?? ""}`,
    label: result.label,
    detail: result.subLabel,
    result,
  };
}

function _buildPersonItem(candidate: MentionCandidate): MentionMenuItem {
  return {
    kind: "person",
    id: candidate.userId,
    label: candidate.displayName,
    detail: candidate.email,
    candidate,
  };
}

/**
 * Sorts the `@` menu's people and gadget search results into its groups:
 * People, then Dashboards (with their tiles), Datasets, Maps, Case types,
 * and Cases. Keeps each group's search order, caps each group at five rows,
 * and leaves out empty groups. Used by the mention menu
 * suggestion every time its people or gadget results change.
 */
export function buildMentionMenuGroups(
  options: Readonly<{
    gadgets: readonly GadgetSearchResult[];
    people: readonly MentionCandidate[];
  }>,
): MentionMenuGroup[] {
  const items = [
    ...options.gadgets.map(_buildGadgetItem),
    ...options.people.map(_buildPersonItem),
  ];
  return GROUP_ORDER.map((key) => {
    return {
      key,
      items: items
        .filter((item) => {
          return item.kind === "person"
            ? key === "people"
            : GROUP_KEY_BY_GADGET_TYPE[item.result.ref.gadgetType] === key;
        })
        .slice(0, MAX_ITEMS_PER_GROUP),
    };
  }).filter((group) => {
    return group.items.length > 0;
  });
}
