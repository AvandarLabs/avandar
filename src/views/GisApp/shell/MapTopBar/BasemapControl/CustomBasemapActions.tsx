import { useLingui } from "@lingui/react/macro";
import { Button, Group } from "@mantine/core";
import type { ReactNode } from "react";

type Props = {
  isSubmittable: boolean;
  onClose: () => void;
  onSubmit: () => void;
};

/** Renders custom basemap cancellation and submission actions. */
export function CustomBasemapActions({
  isSubmittable,
  onClose,
  onSubmit,
}: Props): ReactNode {
  const { t } = useLingui();
  return (
    <Group justify="flex-end">
      <Button variant="default" onClick={onClose}>
        {t`Cancel`}
      </Button>
      <Button disabled={!isSubmittable} onClick={onSubmit}>
        {t`Use this basemap`}
      </Button>
    </Group>
  );
}
