import { useLingui } from "@lingui/react/macro";
import { Badge, Group, Loader } from "@mantine/core";
import { IconCircleX } from "@tabler/icons-react";
import { match } from "ts-pattern";
import { ReadyLayerStatus } from "@/views/GisApp/panels/LayerPanel/LayerRow/LayerStatusBadge/ReadyLayerStatus";
import type { MapLayerViewState } from "@/views/GisApp/layers/MapLayerViewState.types";
import type { ReactNode } from "react";

type Props = { viewState: MapLayerViewState };

/** Reports the current data health inline on a layer row. */
export function LayerStatusBadge({ viewState }: Props): ReactNode {
  const { t } = useLingui();
  const { droppedRowCount, featureCount, status } = viewState;

  return match(status)
    .with("unbound", () => {
      return <>{t`Needs geometry`}</>;
    })
    .with("loading", () => {
      return (
        <Group gap={4} wrap="nowrap">
          <Loader size={11} />
          {t`Loading`}
        </Group>
      );
    })
    .with("error", () => {
      return (
        <Badge
          color="danger"
          variant="light"
          size="xs"
          leftSection={<IconCircleX size={9} stroke={2.4} />}
        >
          {t`Could not load`}
        </Badge>
      );
    })
    .with("empty", () => {
      return (
        <Badge color="neutral" variant="light" size="xs">
          {t`No rows`}
        </Badge>
      );
    })
    .with("ready", () => {
      return (
        <ReadyLayerStatus
          droppedRowCount={droppedRowCount}
          featureCount={featureCount}
        />
      );
    })
    .exhaustive();
}
