import { useLingui } from "@lingui/react/macro";
import { ColorPicker, Popover, TextInput, UnstyledButton } from "@mantine/core";
import { GraduatedRamps } from "@/views/GisApp/layers/GraduatedRamps/GraduatedRamps";
import css from "@/views/GisApp/panels/LayerInspector/ClassificationEditor/GraduatedControls/GraduatedClassList/GraduatedClassList.module.css";
import type { ReactNode } from "react";

type Props = {
  /** The class's 1-based position, used in its accessible names. */
  classNumber: number;
  color: string;
  label: string | undefined;

  /** The interval label the legend shows while `label` is unset. */
  generatedLabel: string;
  onColorChange: (color: string) => void;
  onLabelChange: (label: string) => void;
};

/**
 * One graduated class: a swatch that opens a color picker offering the
 * preset colors, and a text input for the class's legend label.
 */
export function GraduatedClassRow({
  classNumber,
  color,
  label,
  generatedLabel,
  onColorChange,
  onLabelChange,
}: Readonly<Props>): ReactNode {
  const { t } = useLingui();
  return (
    <div className={css.graduatedClassRow}>
      <Popover position="bottom-start" trapFocus>
        <Popover.Target>
          <UnstyledButton
            className={css.graduatedClassSwatch}
            aria-label={t`Class ${classNumber} color`}
            style={{ backgroundColor: color }}
          />
        </Popover.Target>
        <Popover.Dropdown p="xs">
          <ColorPicker
            format="hex"
            defaultValue={color}
            swatches={[...GraduatedRamps.swatchColors]}
            swatchesPerRow={7}
            onChangeEnd={onColorChange}
          />
        </Popover.Dropdown>
      </Popover>
      <TextInput
        className={css.graduatedClassLabel}
        aria-label={t`Class ${classNumber} label`}
        placeholder={generatedLabel}
        value={label ?? ""}
        onChange={(event) => {
          onLabelChange(event.currentTarget.value);
        }}
      />
    </div>
  );
}
