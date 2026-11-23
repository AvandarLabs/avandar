import { Stack, Text, Title } from "@mantine/core";
import { useLayoutEffect, useRef } from "react";
import { ConceptCreatorStore } from "../../../../src/views/OntologyDesignerApp/ConceptCreatorView/ConceptCreatorStore";
import css from "./AttributeMappingScreen.module.css";
import { makeMappingStageFromFrame } from "./makeMappingStageFromFrame/makeMappingStageFromFrame";
import { MappingFields } from "./MappingFields";
import type { ReactNode } from "react";

type Props = {
  frame: number;
  width: number;
  height: number;
};
export {
  ATTRIBUTE_MAPPING_BEATS,
  ATTRIBUTE_MAPPING_DURATION,
} from "./makeMappingStageFromFrame/makeMappingStageFromFrame";
/** Original dataset mapping and manual field leaves with frame-owned values. */
export function AttributeMappingScreen({
  frame,
  width,
  height,
}: Props): ReactNode {
  const root = useRef<HTMLDivElement>(null);
  useMappingTargets({
    root,
    frame,
  });
  return (
    <ConceptCreatorStore.Provider
      initialStateOverrides={{
        conceptName: "Response case",
        singularConceptName: "response case",
        pluralConceptName: "response cases",
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
              New case type
            </Title>
            <Text c="dimmed" size="sm">
              Video - Harborfield visits
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
    makeMappingStageFromFrame(frame).manualField?.isNameSelected;
  nameInput.focus({ preventScroll: true });
  nameInput.setSelectionRange(
    isSelected ? 0 : nameInput.value.length,
    nameInput.value.length,
  );
}
function useMappingTargets({
  root,
  frame,
}: Readonly<{
  root: React.RefObject<HTMLDivElement | null>;
  frame: number;
}>) {
  useLayoutEffect(() => {
    // The switch's "One value" segment: the label that names its radio input.
    const singleValueInput = root.current?.querySelector<HTMLInputElement>(
      'input[type="radio"][value="single"]',
    );
    singleValueInput?.labels?.[0]?.setAttribute(
      "data-video-target",
      "mapping-single-value",
    );
    root.current
      ?.querySelector(
        '[data-video-target="mapping-dataset-controls"] input:not([type="checkbox"]):not([type="radio"]):not([type="hidden"])',
      )
      ?.setAttribute("data-video-target", "mapping-value-rule");
    root.current
      ?.querySelectorAll('[data-video-target="mapping-add-manual"]')
      .forEach((button) => {
        return button.removeAttribute("data-video-target");
      });
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
