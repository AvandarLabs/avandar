import { Trans, useLingui } from "@lingui/react/macro";
import { Stack, Text, Title } from "@mantine/core";
import { useLayoutEffect, useRef } from "react";
import { ConceptCreatorStore } from "../../../../src/views/OntologyDesignerApp/ConceptCreatorView/ConceptCreatorStore";
import css from "./AttributeMappingScreen.module.css";
import { createMappingStageFromFrame } from "./createMappingStageFromFrame/createMappingStageFromFrame";
import { MappingFields } from "./MappingFields";

type Props = { frame: number; width: number; height: number };

export {
  ATTRIBUTE_MAPPING_BEATS,
  ATTRIBUTE_MAPPING_DURATION,
} from "./createMappingStageFromFrame/createMappingStageFromFrame";

/** Original dataset mapping and manual field leaves with frame-owned values. */
export function AttributeMappingScreen({ frame, width, height }: Props) {
  const { t } = useLingui();
  const root = useRef<HTMLDivElement>(null);
  useMappingTargets(root, frame);
  return (
    <ConceptCreatorStore.Provider
      initialStateOverrides={{
        conceptName: t`Response case`,
        singularConceptName: t`response case`,
        pluralConceptName: t`response cases`,
      }}
    >
      <div
        ref={root}
        className={css.attributeMappingScreen}
        style={{ width, height }}
      >
        <Stack className={css.attributeMappingScreenContent} gap="lg">
          <Stack gap="xs">
            <Title order={2} fw={650}>
              <Trans>New case type</Trans>
            </Title>
            <Text c="dimmed" size="sm">
              <Trans>Video - Harborfield visits</Trans>
            </Text>
          </Stack>
          <MappingFields frame={frame} />
        </Stack>
      </div>
    </ConceptCreatorStore.Provider>
  );
}

function _selectManualFieldName(options: {
  nameInput: HTMLInputElement | null | undefined;
  frame: number;
}) {
  const { nameInput, frame } = options;
  if (!nameInput) {
    return;
  }
  if (frame < 350) {
    nameInput.blur();
    return;
  }
  const isSelected =
    createMappingStageFromFrame(frame).manualField?.isNameSelected;
  nameInput.focus({ preventScroll: true });
  nameInput.setSelectionRange(
    isSelected ? 0 : nameInput.value.length,
    nameInput.value.length,
  );
}

function useMappingTargets(
  root: React.RefObject<HTMLDivElement | null>,
  frame: number,
) {
  useLayoutEffect(() => {
    const checkboxes = root.current?.querySelectorAll('input[type="checkbox"]');
    checkboxes?.[1]?.setAttribute("data-video-target", "mapping-single-value");
    root.current
      ?.querySelector(
        '[data-video-target="mapping-dataset-controls"] input:not([type="checkbox"]):not([type="hidden"])',
      )
      ?.setAttribute("data-video-target", "mapping-value-rule");
    root.current
      ?.querySelectorAll('[data-video-target="mapping-add-manual"]')
      .forEach((button) => button.removeAttribute("data-video-target"));
    const manualButtons = root.current?.querySelectorAll(
      '[data-video-target="mapping-manual-controls"] button',
    );
    manualButtons?.[manualButtons.length - 1]?.setAttribute(
      "data-video-target",
      "mapping-add-manual",
    );
    const nameInput = root.current?.querySelector<HTMLInputElement>(
      '[data-video-target="mapping-manual-controls"] input:not([type="checkbox"])',
    );
    nameInput?.setAttribute("data-video-target", "mapping-manual-name");
    _selectManualFieldName({ nameInput, frame });
    root.current
      ?.querySelector(
        '[role="option"][value="sum"], [role="option"][data-combobox-option][data-value="sum"]',
      )
      ?.setAttribute("data-video-target", "mapping-sum-option");
  }, [root, frame]);
}
