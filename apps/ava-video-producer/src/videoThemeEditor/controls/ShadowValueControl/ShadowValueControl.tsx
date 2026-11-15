import { Button, Group } from "@mantine/core";
import { elevationToBoxShadow } from "../../../videoTheme/cssValueHelpers/cssValueHelpers";
import { useTokenEditor } from "../../TokenEditorContext/TokenEditorContext";
import { DEFAULT_SHADOW_LAYER } from "../effectControls.constants";
import { ShadowLayers } from "./ShadowLayers";
import css from "./ShadowValueControl.module.css";
import type {
  ShadowLayer,
  ShadowValue,
} from "../../../videoTheme/videoTheme.types";
import type { ValueControlProps } from "../valueControl.types";

const MAX_SHADOW_LAYERS = 4;

/** A shadow token: up to four layers, previewed in the theme's shadow colour. */
export function ShadowValueControl({
  label,
  value,
  onChange,
}: ValueControlProps) {
  const { theme } = useTokenEditor();
  const layers = (value as ShadowValue | undefined)?.layers ?? [];
  const setLayers = (nextLayers: readonly ShadowLayer[]) =>
    onChange({ layers: nextLayers });
  const boxShadow = elevationToBoxShadow({
    layers,
    color: theme.semantic.color.shadowColor,
  });
  return (
    <div className={css.shadowLayers} role="group" aria-label={label}>
      <ShadowLayers layers={layers} onChange={setLayers} />
      <Group gap="xs">
        <Button
          size="compact-xs"
          variant="default"
          disabled={layers.length >= MAX_SHADOW_LAYERS}
          onClick={() => setLayers([...layers, DEFAULT_SHADOW_LAYER])}
        >
          {"Add layer"}
        </Button>
        <span
          className={css.shadowPreview}
          style={{ boxShadow }}
          aria-hidden="true"
          data-inherit-dim
        />
      </Group>
    </div>
  );
}
