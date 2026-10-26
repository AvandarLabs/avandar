import { useLingui } from "@lingui/react/macro";
import { Popover, UnstyledButton } from "@mantine/core";
import { useState } from "react";
import { ConceptStatus } from "$/models/ontology/ConceptStatus/ConceptStatus";
import css from "@/components/caseStatuses/StatusColorPicker/StatusColorPicker.module.css";
import { StatusDot } from "@/components/caseStatuses/StatusDot/StatusDot";
import { useStatusColorLabels } from "@/components/caseStatuses/useStatusColorLabels";
import type { ReactNode } from "react";

type Props = {
  /** The status's current color, a `#rrggbb` string. */
  color: string;

  /** The status's name, so the swatch says which status it colors. */
  statusName: string;

  /** Called with the palette hex the user picks. */
  onChange: (color: string) => void;
};

/**
 * A swatch button showing a status's color. It opens the eight-color status
 * palette, and picking a color closes it.
 *
 * A color outside the palette (stored by a future custom-color feature)
 * still shows on the swatch and is announced as "Custom".
 */
export function StatusColorPicker({
  color,
  statusName,
  onChange,
}: Readonly<Props>): ReactNode {
  const { t } = useLingui();
  const colorLabels = useStatusColorLabels();
  const [isOpen, setIsOpen] = useState(false);
  const colorKey = ConceptStatus.getColorKey(color);
  const colorName = colorKey === undefined ? t`Custom` : colorLabels[colorKey];

  return (
    <Popover
      opened={isOpen}
      onChange={setIsOpen}
      position="bottom-start"
      trapFocus
    >
      <Popover.Target>
        <UnstyledButton
          className={css.statusColorPickerSwatch}
          aria-label={t`${statusName} color: ${colorName}`}
          onClick={() => {
            setIsOpen((wasOpen) => {
              return !wasOpen;
            });
          }}
        >
          <StatusDot color={color} size="md" />
        </UnstyledButton>
      </Popover.Target>
      <Popover.Dropdown p="xs">
        <div
          role="group"
          aria-label={t`Colors for ${statusName}`}
          className={css.statusColorPickerPalette}
        >
          {ConceptStatus.PALETTE.map((swatch) => {
            return (
              <UnstyledButton
                key={swatch.key}
                className={css.statusColorPickerSwatch}
                aria-label={colorLabels[swatch.key]}
                aria-pressed={swatch.hex === color.toLowerCase()}
                onClick={() => {
                  onChange(swatch.hex);
                  setIsOpen(false);
                }}
              >
                <StatusDot color={swatch.hex} size="md" />
              </UnstyledButton>
            );
          })}
        </div>
      </Popover.Dropdown>
    </Popover>
  );
}
