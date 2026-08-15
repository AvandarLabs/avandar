import { useLingui } from "@lingui/react/macro";
import { Button, Group } from "@mantine/core";
import type { ReactNode } from "react";

type Props = {
  isSubmittable: boolean;
  onClose: () => void;
  onSubmit: () => void;
};

/** Renders custom basemap cancellation and submission actions. */
export function CustomBasemapActions(props: Props): ReactNode {
  const { t } = useLingui();
  return (
    <Group justify="flex-end">
      <Button variant="default" onClick={props.onClose}>
        {t`Cancel`}
      </Button>
      <Button disabled={!props.isSubmittable} onClick={props.onSubmit}>
        {t`Use this basemap`}
      </Button>
    </Group>
  );
}
