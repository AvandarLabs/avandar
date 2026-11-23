import { removeAtIndex } from "@avandar/utils";
import { useState } from "react";
import { VideoCssValues } from "../../../videoTheme/VideoCssValues/VideoCssValues";
import { useTokenEditor } from "../../TokenEditorContext";
import { DEFAULT_SHADOW_LAYER } from "../effectControls.constants";
import { ShadowLayerActions } from "./ShadowLayerActions";
import { ShadowLayers } from "./ShadowLayers";
import css from "./ShadowValueControl.module.css";
import type {
  ShadowLayer,
  ShadowValue,
} from "../../../videoTheme/videoTheme.types";
import type { ValueControlProps } from "../valueControl.types";
import type { ReactNode } from "react";

type Props = ValueControlProps;

const MAX_SHADOW_LAYERS = 4;

/**
 * A shadow token: up to four layers, previewed in the theme's shadow colour.
 */
function useShadowLayers({
  value,
  onChange,
}: Readonly<Pick<Props, "value" | "onChange">>): Readonly<{
  layerIds: readonly string[];
  layers: readonly ShadowLayer[];
  setLayers: (layers: readonly ShadowLayer[]) => void;
  removeLayer: (index: number) => void;
}> {
  const [layerIds, setLayerIds] = useState(() => {
    return Array.from({ length: MAX_SHADOW_LAYERS }, () => {
      return crypto.randomUUID();
    });
  });
  const layers = (value as ShadowValue | undefined)?.layers ?? [];
  const setLayers = (nextLayers: readonly ShadowLayer[]) => {
    return onChange({ layers: nextLayers });
  };
  const removeLayer = (index: number) => {
    setLayerIds((current) => {
      return [...removeAtIndex(current, index), crypto.randomUUID()];
    });
    setLayers(removeAtIndex(layers, index));
  };
  return { layerIds, layers, setLayers, removeLayer };
}
/** Edits the ordered shadow layers and previews their combined appearance. */
export function ShadowValueControl({
  label,
  value,
  onChange,
}: Readonly<Props>): ReactNode {
  const { theme } = useTokenEditor();
  const { layerIds, layers, setLayers, removeLayer } = useShadowLayers({
    value,
    onChange,
  });
  const boxShadow = VideoCssValues.makeBoxShadowFromElevation({
    layers,
    color: theme.semantic.color.shadowColor,
  });
  return (
    <div
      className={css.shadowValueControlLayers}
      role="group"
      aria-label={label}
    >
      <ShadowLayers
        layers={layers}
        layerIds={layerIds}
        onChange={setLayers}
        onRemove={removeLayer}
      />
      <ShadowLayerActions
        canAdd={layers.length < MAX_SHADOW_LAYERS}
        boxShadow={boxShadow}
        onAdd={() => {
          return setLayers([...layers, DEFAULT_SHADOW_LAYER]);
        }}
      />
    </div>
  );
}
