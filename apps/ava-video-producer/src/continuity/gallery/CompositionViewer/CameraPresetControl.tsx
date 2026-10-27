import { useLingui } from "@lingui/react/macro";
import { ActionIcon, Tooltip } from "@mantine/core";
import { IconInfoCircle } from "@tabler/icons-react";
import { useState } from "react";
import { AtlasSelect } from "../../../gallery/AtlasSelect/AtlasSelect";
import { continuityAppearanceSchema } from "../../continuityAppearance";
import css from "./CameraPresetControl.module.css";
import { useCameraPresetOptions } from "./useCameraPresetOptions";
import type { useCompositionAppearance } from "./useCompositionAppearance";

type Props = { appearance: ReturnType<typeof useCompositionAppearance> };

/** Camera profiles with in-menu explanations of their settings and intent. */
export function CameraPresetControl({ appearance }: Props) {
  const { t } = useLingui();
  const options = useCameraPresetOptions();
  const [activeInfo, setActiveInfo] = useState<string | null>(null);
  return (
    <AtlasSelect
      label={t`Camera motion preset`}
      data={options}
      value={appearance.draft.cameraPreset}
      disabled={!appearance.draft.cameraMotion}
      onDropdownClose={() => setActiveInfo(null)}
      onChange={(value) =>
        appearance.update({
          cameraPreset:
            continuityAppearanceSchema.shape.cameraPreset.parse(value),
        })
      }
      renderOption={({ option }) => (
        <span className={css.option}>
          <span>{option.label}</span>
          <Tooltip
            label={options.find((item) => item.value === option.value)?.details}
            opened={activeInfo === option.value}
            multiline
            w={300}
            withinPortal={false}
            position="left"
            withArrow
            transitionProps={{ duration: 0 }}
            classNames={{ tooltip: css.tooltip }}
          >
            <ActionIcon
              variant="subtle"
              size={24}
              color="var(--muted)"
              aria-label={t`About ${option.label}`}
              onMouseEnter={() => setActiveInfo(option.value)}
              onMouseLeave={() => setActiveInfo(null)}
              onFocus={() => setActiveInfo(option.value)}
              onBlur={() => setActiveInfo(null)}
              onMouseDown={(event) => event.stopPropagation()}
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                setActiveInfo(option.value);
              }}
            >
              <IconInfoCircle size={16} />
            </ActionIcon>
          </Tooltip>
        </span>
      )}
    />
  );
}
