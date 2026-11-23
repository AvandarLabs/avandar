import { Button } from "@mantine/core";
import {
  DEFAULT_SHADOW_LAYER,
  EFFECT_FIELDS,
} from "../effectControls.constants";
import { NumberFields } from "../NumberFields/NumberFields";
import type { ShadowLayer } from "../../../videoTheme/videoTheme.types";
import type { ReactNode } from "react";

type Props = Readonly<{
  layers: readonly ShadowLayer[];
  layerIds: readonly string[];
  onChange: (layers: readonly ShadowLayer[]) => void;
  onRemove: (index: number) => void;
}>;

function _getLayerEntries({
  layers,
  layerIds,
}: Readonly<Pick<Props, "layers" | "layerIds">>): ReadonlyArray<
  Readonly<{
    id: string;
    layer: ShadowLayer;
    position: number;
    layerNumber: number;
  }>
> {
  return layers.map((layer, position) => {
    return {
      id: layerIds[position] ?? `layer-${position + 1}`,
      layer,
      position,
      layerNumber: position + 1,
    };
  });
}
/** The editable layers of a shadow, each with its own remove action. */
export function ShadowLayers({
  layers,
  layerIds,
  onChange,
  onRemove,
}: Props): ReactNode {
  const entries = _getLayerEntries({ layers, layerIds });
  return entries.map(({ id, layer, position, layerNumber }) => {
    return (
      <NumberFields
        key={id}
        legend={`Layer ${layerNumber}`}
        fields={EFFECT_FIELDS.shadow}
        values={layer}
        fallback={DEFAULT_SHADOW_LAYER}
        onChange={(layerValues) => {
          return onChange(
            layers.map((current, currentIndex) => {
              return currentIndex === position
                ? { ...DEFAULT_SHADOW_LAYER, ...layerValues }
                : current;
            }),
          );
        }}
        action={
          <Button
            size="compact-xs"
            variant="subtle"
            onClick={() => {
              return onRemove(position);
            }}
          >
            {`Remove layer ${layerNumber}`}
          </Button>
        }
      />
    );
  });
}
