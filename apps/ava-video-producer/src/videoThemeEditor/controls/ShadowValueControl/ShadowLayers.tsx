import { Button } from "@mantine/core";
import {
  DEFAULT_SHADOW_LAYER,
  EFFECT_FIELDS,
} from "../effectControls.constants";
import { NumberFields } from "../NumberFields/NumberFields";
import type { ShadowLayer } from "../../../videoTheme/videoTheme.types";

type Props = Readonly<{
  layers: readonly ShadowLayer[];
  layerIds: readonly string[];
  onChange: (layers: readonly ShadowLayer[]) => void;
  onRemove: (index: number) => void;
}>;

/** The editable layers of a shadow, each with its own remove action. */
export function ShadowLayers({ layers, layerIds, onChange, onRemove }: Props) {
  const entries = layers.map((layer, position) => ({
    id: layerIds[position] ?? `layer-${position + 1}`,
    layer,
    position,
    layerNumber: position + 1,
  }));
  return entries.map(({ id, layer, position, layerNumber }) => (
    <NumberFields
      key={id}
      legend={`Layer ${layerNumber}`}
      fields={EFFECT_FIELDS.shadow}
      values={layer}
      fallback={DEFAULT_SHADOW_LAYER}
      onChange={(layerValues) =>
        onChange(
          layers.map((current, currentIndex) =>
            currentIndex === position
              ? { ...DEFAULT_SHADOW_LAYER, ...layerValues }
              : current,
          ),
        )
      }
      action={
        <Button
          size="compact-xs"
          variant="subtle"
          onClick={() => onRemove(position)}
        >
          {`Remove layer ${layerNumber}`}
        </Button>
      }
    />
  ));
}
