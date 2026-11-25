import { useLingui } from "@lingui/react/macro";
import { Button, Group, Text } from "@mantine/core";
import { modals } from "@mantine/modals";
import type {
  PlaceFeatureActionHandlers,
  PlaceFeatureTarget,
} from "@/views/GisApp/places/PlaceTool.types";
import type { ReactNode } from "react";

type Props = {
  target: PlaceFeatureTarget;
  handlers: PlaceFeatureActionHandlers;
};

/**
 * Edit, Move, and Delete for a place clicked on the map. Every action
 * rewrites the place's dataset, so it changes every map and chart using it.
 */
export function PlaceFeatureActions({
  target,
  handlers,
}: Readonly<Props>): ReactNode {
  const { t } = useLingui();
  const onDeleteClick = (): void => {
    modals.openConfirmModal({
      title: t`Delete this place?`,
      children: (
        <Text size="sm">
          {t`The place is removed from its dataset, so it disappears from every map and chart that uses it.`}
        </Text>
      ),
      labels: { confirm: t`Delete`, cancel: t`Cancel` },
      confirmProps: { color: "danger" },
      onConfirm: () => {
        handlers.onDelete(target);
      },
    });
  };
  return (
    <Group gap="xs">
      <Button
        size="xs"
        variant="default"
        onClick={() => {
          handlers.onEdit(target);
        }}
      >
        {t`Edit place`}
      </Button>
      <Button
        size="xs"
        variant="default"
        onClick={() => {
          handlers.onMove(target);
        }}
      >
        {t`Move place`}
      </Button>
      <Button size="xs" variant="subtle" color="danger" onClick={onDeleteClick}>
        {t`Delete place`}
      </Button>
    </Group>
  );
}
