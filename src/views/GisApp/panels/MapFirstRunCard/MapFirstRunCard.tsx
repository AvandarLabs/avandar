import { Paper } from "@avandar/ui";
import { useLingui } from "@lingui/react/macro";
import { Button, Stack, Text, Title } from "@mantine/core";
import { IconPlus } from "@tabler/icons-react";
import { LayerSourcePicker } from "@/views/GisApp/panels/LayerPanel/LayerSourcePicker/LayerSourcePicker";
import type { QueryDataSource } from "$/models/queries/QueryDataSource/QueryDataSource";
import type { ReactNode } from "react";

type Props = {
  onAddLayerFromSource: (dataSource: QueryDataSource.T) => void;
};

/** Centred over the basemap when the map has no layers yet. */
export function MapFirstRunCard({ onAddLayerFromSource }: Props): ReactNode {
  const { t } = useLingui();
  return (
    <Paper p="lg" w={380} radius="md" shadow="md">
      <Stack gap="xs" align="center" ta="center">
        <Title order={4} size="15px">
          {t`This map has no layers yet`}
        </Title>
        <Text size="sm" c="dimmed">
          {t`Add a layer to plot a dataset, a derived dataset, or a profile. You can add as many as you need and reorder them.`}
        </Text>
        <LayerSourcePicker onSourceSelected={onAddLayerFromSource}>
          {(pickerProps) => {
            return (
              <Button {...pickerProps} leftSection={<IconPlus size={15} />}>
                {t`Add a layer`}
              </Button>
            );
          }}
        </LayerSourcePicker>
      </Stack>
    </Paper>
  );
}
