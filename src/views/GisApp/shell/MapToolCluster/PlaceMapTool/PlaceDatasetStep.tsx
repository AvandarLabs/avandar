import { useLingui } from "@lingui/react/macro";
import { Button, Group, Select, Stack, Text, TextInput } from "@mantine/core";
import { useState } from "react";
import type { PlaceToolController } from "@/views/GisApp/places/PlaceTool.types";
import type { ReactNode } from "react";

type Props = { controller: PlaceToolController };

/** Picks a places dataset that is not on this map yet and adds it. */
function ExistingPlacesDatasetPicker({ controller }: Props) {
  const { t } = useLingui();
  const [selectedValue, setSelectedValue] = useState<string | null>(null);
  const selectedOption = controller.placesDatasetOptions.find((option) => {
    return option.value === selectedValue;
  });
  return (
    <Group align="flex-end" gap="xs" wrap="nowrap">
      <Select
        size="xs"
        label={t`Places dataset`}
        data={[...controller.placesDatasetOptions]}
        value={selectedValue}
        onChange={setSelectedValue}
      />
      <Button
        size="xs"
        variant="default"
        disabled={!selectedOption}
        onClick={() => {
          if (selectedOption) {
            controller.addPlacesLayer(selectedOption.value);
          }
        }}
      >
        {t`Add to map`}
      </Button>
    </Group>
  );
}

/** Chooses the places dataset this map saves to, or creates one. */
export function PlaceDatasetStep({ controller }: Props): ReactNode {
  const { t } = useLingui();
  const [datasetName, setDatasetName] = useState(() => {
    return t`Exposure sites`;
  });
  return (
    <Stack gap="sm">
      <Text size="xs">
        {t`Places are saved in a dataset, so any map, chart, or query can use them.`}
      </Text>
      {controller.placesDatasetOptions.length > 0 ? (
        <ExistingPlacesDatasetPicker controller={controller} />
      ) : null}
      <Group align="flex-end" gap="xs" wrap="nowrap">
        <TextInput
          size="xs"
          label={t`New places dataset name`}
          value={datasetName}
          onChange={(event) => {
            setDatasetName(event.currentTarget.value);
          }}
        />
        <Button
          size="xs"
          loading={controller.isSaving}
          disabled={datasetName.trim() === ""}
          onClick={() => {
            controller.createPlacesDataset(datasetName.trim());
          }}
        >
          {t`Create places dataset`}
        </Button>
      </Group>
    </Stack>
  );
}
