import { useLingui } from "@lingui/react/macro";
import { Select } from "@mantine/core";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { Concept } from "$/models/ontology/Concept/Concept";
import type { PluginDataSlotBinding } from "$/models/PluginDataSlotBinding/PluginDataSlotBinding";
import type { DataSlotSourceOptions } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/DataSlotBinding/useDataSlotSourceOptions";
import type { PluginDataSlot } from "@avandar/plugin-manifest/runtime";

type Props = Readonly<{
  slotId: string;
  slot: PluginDataSlot;
  sourceOptions: DataSlotSourceOptions;
  draft: PluginDataSlotBinding.Draft | undefined;
  onDraftChange: (draft: PluginDataSlotBinding.Draft | undefined) => void;
}>;

/** Case types named like the slot's `concept` hint first, any case. */
function _sortConceptsByHint(
  concepts: readonly Concept.T[],
  conceptHint: string | undefined,
): Concept.T[] {
  const isHinted = (concept: Concept.T): boolean => {
    return concept.name.toLowerCase() === conceptHint?.toLowerCase();
  };
  return [
    ...concepts.filter(isHinted),
    ...concepts.filter((concept) => {
      return !isHinted(concept);
    }),
  ];
}

function _makeDraftFromValue(
  slotId: string,
  value: string,
): PluginDataSlotBinding.Draft {
  const [sourceType, id] = value.split(":") as ["concept" | "dataset", string];
  return {
    slotId,
    sourceType,
    conceptId: sourceType === "concept" ? (id as Concept.Id) : undefined,
    datasetId: sourceType === "dataset" ? (id as Dataset.Id) : undefined,
    attributeMap: {},
  };
}

/**
 * The picker of a data slot panel that chooses the case type or dataset a
 * slot reads, grouped into "Case types" and "Datasets". Choosing a new
 * source starts the slot's field mapping over.
 */
export function DataSlotSourceSelect(props: Props): JSX.Element {
  const { slotId, slot, sourceOptions, draft, onDraftChange } = props;
  const { t } = useLingui();
  const groups = [
    {
      group: t`Case types`,
      items: _sortConceptsByHint(sourceOptions.concepts, slot.concept).map(
        (concept) => {
          return { value: `concept:${concept.id}`, label: concept.name };
        },
      ),
    },
    {
      group: t`Datasets`,
      items: sourceOptions.datasets.map((dataset) => {
        return { value: `dataset:${dataset.id}`, label: dataset.name };
      }),
    },
  ];
  return (
    <Select
      label={t`Case type or dataset`}
      placeholder={t`Choose where the records come from`}
      searchable
      allowDeselect={false}
      disabled={sourceOptions.isLoading}
      nothingFoundMessage={t`No case types or datasets match`}
      data={groups.filter((group) => {
        return group.items.length > 0;
      })}
      value={
        draft === undefined
          ? null
          : `${draft.sourceType}:${draft.conceptId ?? draft.datasetId}`
      }
      onChange={(value) => {
        onDraftChange(
          value === null ? undefined : _makeDraftFromValue(slotId, value),
        );
      }}
    />
  );
}
