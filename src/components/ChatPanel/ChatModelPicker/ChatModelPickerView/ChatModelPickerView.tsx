import { Tooltip } from "@avandar/ui";
import { Button, Combobox, Group, Text } from "@mantine/core";
import { IconCheck } from "@tabler/icons-react";
import css from "./ChatModelPickerView.module.css";
import type { ComboboxStore } from "@mantine/core";
import type { ChatModelOption } from "$/models/chat/ChatModelOption/ChatModelOption";
import type { ReactNode } from "react";

type Props = {
  buttonLabel: string;
  combobox: ComboboxStore;
  disabled: boolean;
  groups: ChatModelOption.OptionGroup[];
  onModelSelect: (modelId: string) => void;
  resolvedModelId: string;
  selectedModel?: ChatModelOption.T;
  tooltipLabel: string;
  triggerAriaLabel: string;
};

function _renderModelGroups(
  options: Pick<Props, "groups" | "resolvedModelId">,
): ReactNode[] {
  return options.groups.map((entry) => {
    return (
      <Combobox.Group label={entry.group} key={entry.group}>
        {entry.models.map((model) => {
          const isSelected = model.id === options.resolvedModelId;
          return (
            <Combobox.Option
              value={model.id}
              key={model.id}
              active={isSelected}
            >
              <Group gap="xs" wrap="nowrap" justify="space-between">
                <Text size="sm" className={css.chatModelPickerViewOptionLabel}>
                  {model.name}
                </Text>
                {isSelected ?
                  <IconCheck
                    size={14}
                    className={css.chatModelPickerViewSelectedIcon}
                    aria-hidden
                  />
                : null}
              </Group>
            </Combobox.Option>
          );
        })}
      </Combobox.Group>
    );
  });
}

function _renderTrigger(
  options: Pick<
    Props,
    | "buttonLabel"
    | "combobox"
    | "disabled"
    | "selectedModel"
    | "tooltipLabel"
    | "triggerAriaLabel"
  >,
): ReactNode {
  return (
    <Tooltip
      label={options.tooltipLabel}
      disabled={options.combobox.dropdownOpened}
    >
      <Combobox.Target targetType="button" withExpandedAttribute>
        <Button
          type="button"
          variant="light"
          color="neutral"
          size="compact-sm"
          className={css.chatModelPickerViewTrigger}
          disabled={options.disabled}
          aria-label={options.triggerAriaLabel}
          onClick={() => {
            options.combobox.toggleDropdown();
          }}
        >
          {options.selectedModel?.pickerLabel ?? options.buttonLabel}
        </Button>
      </Combobox.Target>
    </Tooltip>
  );
}

function _renderDropdown(
  options: Pick<Props, "combobox" | "groups" | "resolvedModelId">,
): ReactNode {
  return options.combobox.dropdownOpened ?
      <Combobox.Dropdown className={css.chatModelPickerViewDropdown}>
        <Combobox.Options className={css.chatModelPickerViewOptions}>
          {_renderModelGroups(options)}
        </Combobox.Options>
      </Combobox.Dropdown>
    : null;
}

/** Renders the accessible trigger and grouped options for the model picker. */
export function ChatModelPickerView({
  buttonLabel,
  combobox,
  disabled,
  groups,
  onModelSelect,
  resolvedModelId,
  selectedModel,
  tooltipLabel,
  triggerAriaLabel,
}: Readonly<Props>): ReactNode {
  // The button target needs combobox semantics and keyboard handling because
  // there is no search input to serve as the focused target.
  return (
    <Combobox
      store={combobox}
      width={300}
      position="top-start"
      withinPortal
      preventPositionChangeWhenVisible
      onOptionSubmit={(modelId) => {
        onModelSelect(modelId);
        combobox.closeDropdown();
      }}
    >
      {_renderTrigger({
        buttonLabel,
        combobox,
        disabled,
        selectedModel,
        tooltipLabel,
        triggerAriaLabel,
      })}
      {_renderDropdown({ combobox, groups, resolvedModelId })}
    </Combobox>
  );
}
