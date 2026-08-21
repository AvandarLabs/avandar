import { Link, Paper } from "@avandar/ui";
import { useLingui } from "@lingui/react/macro";
import { Group, Stack, Text, ThemeIcon } from "@mantine/core";
import { IconMap } from "@tabler/icons-react";
import { AppLinks } from "@/config/AppLinks/AppLinks";
import { DeleteMapButton } from "@/views/GisApp/MapListView/DeleteMapButton";
import type { AvaMap } from "$/models/AvaMap/AvaMap";
import type { ReactNode } from "react";

type Props = { avaMap: AvaMap.T; workspaceSlug: string };

/** Renders one map with its layer count and last-saved timestamp. */
export function MapCard({ avaMap, workspaceSlug }: Props): ReactNode {
  const { t, i18n } = useLingui();
  const layerCount = avaMap.config.layers.length;
  const layerText = layerCount === 1 ? t`1 layer` : t`${layerCount} layers`;
  const mapEditorLink = AppLinks.mapEditor({
    workspaceSlug,
    mapId: avaMap.id,
  });
  const updatedDate = i18n.date(new Date(avaMap.updatedAt), {
    dateStyle: "medium",
  });

  return (
    <Paper p="md">
      <Group gap="xs" wrap="nowrap" align="flex-start">
        <Link
          to={mapEditorLink.to}
          params={mapEditorLink.params}
          aria-label={t`Open the map ${avaMap.name}`}
          flex={1}
          miw={0}
        >
          <Group gap="sm" wrap="nowrap">
            <ThemeIcon variant="light" color="neutral" size="lg">
              <IconMap size={18} stroke={1.5} />
            </ThemeIcon>
            <Stack gap={2} miw={0}>
              <Text fw={600} size="sm" truncate>
                {avaMap.name}
              </Text>
              <Text c="dimmed" size="xs">
                {t`${layerText} · ${updatedDate}`}
              </Text>
            </Stack>
          </Group>
        </Link>
        <DeleteMapButton avaMap={avaMap} />
      </Group>
    </Paper>
  );
}
