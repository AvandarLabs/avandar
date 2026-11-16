import { Button } from "@mantine/core";
import {
  DEFAULT_SHADOW_LAYER,
  EFFECT_FIELDS,
} from "../effectControls.constants";
import { NumberFields } from "../NumberFields/NumberFields";
import type { ShadowLayer } from "../../../videoTheme/videoTheme.types";

type Props = Readonly<{
  layers: readonly ShadowLayer[];
  onChange: (layers: readonly ShadowLayer[]) => void;
}>;

/** The editable layers of a shadow, each with its own remove action. */
export function ShadowLayers({ layers, onChange }: Props) {
  return layers.map((layer, index) => {
    const layerNumber = index + 1;
    return (
      <NumberFields
        // A layer has no identity apart from its position in the stack.
        key={`layer-${String(layerNumber)}`}
        legend={`Layer ${layerNumber}`}
        fields={EFFECT_FIELDS.shadow}
        values={layer}
        fallback={DEFAULT_SHADOW_LAYER}
        onChange={(layerValues) =>
          onChange(
            layers.map((current, position) =>
              position === index
                ? { ...DEFAULT_SHADOW_LAYER, ...layerValues }
                : current,
            ),
          )
        }
        action={
          <Button
            size="compact-xs"
            variant="subtle"
            onClick={() =>
              onChange(layers.filter((_, position) => position !== index))
            }
          >
            {`Remove layer ${layerNumber}`}
          </Button>
        }
      />
    );
  });
}
