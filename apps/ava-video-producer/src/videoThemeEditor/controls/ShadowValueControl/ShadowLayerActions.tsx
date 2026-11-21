import { Button, Group } from "@mantine/core";
import css from "./ShadowValueControl.module.css";
import type { ReactNode } from "react";

type Props = {
  canAdd: boolean;
  boxShadow: string;
  onAdd: () => void;
};
/** Adds a shadow layer and shows the combined shadow preview. */
export function ShadowLayerActions({
  canAdd,
  boxShadow,
  onAdd,
}: Readonly<Props>): ReactNode {
  return (
    <Group gap="xs">
      <Button
        size="compact-xs"
        variant="default"
        disabled={!canAdd}
        onClick={onAdd}
      >
        {"Add layer"}
      </Button>
      <span
        className={css.shadowValueControlPreview}
        style={{ boxShadow }}
        aria-hidden="true"
        data-inherit-dim
      />
    </Group>
  );
}
