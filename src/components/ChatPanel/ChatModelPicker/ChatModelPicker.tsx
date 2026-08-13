import { useAui } from "@assistant-ui/react";
import { Tooltip } from "@avandar/ui";
import { propEq } from "@avandar/utils";
import { useLingui } from "@lingui/react/macro";
import { Button, Combobox, Group, Text, useCombobox } from "@mantine/core";
import { IconCheck } from "@tabler/icons-react";
import { useEffect, useMemo, useState } from "react";
import { ChatModelStorage } from "@/components/ChatPanel/ChatModelStorage/ChatModelStorage";
import { OfflineChatPickerModels } from "@/components/ChatPanel/offlineChatHelpers/OfflineChatPickerModels/OfflineChatPickerModels";
import { useChatModelCatalog } from "@/components/ChatPanel/useChatModelCatalog";
import { LocalChatModelStore } from "@/stores/LocalChatModelStore/LocalChatModelStore";
import css from "./ChatModelPicker.module.css";

type Props = {
  disabled?: boolean;
};

/**
 * Compact model picker for the chat composer. Shows a small "Model" control;
 * the active model name appears in a tooltip. Clicking opens the grouped
 * catalog.
 *
 * The catalog is a synchronous six-model constant, so there is no loading
 * state, no error state, and no search field.
 */
export function ChatModelPicker({ disabled = false }: Props): JSX.Element {
  const { groups, models } = useChatModelCatalog();
  const [selectedModelId, setSelectedModelId] = useState<string | undefined>(
    () => {
      return ChatModelStorage.readStoredChatModelId();
    },
  );
  const { t } = useLingui();
  const assistantClient = useAui();

  const combobox = useCombobox({
    onDropdownClose: () => {
      combobox.resetSelectedOption();
    },
    onDropdownOpen: () => {
      // `onDropdownOpen` fires synchronously inside `openDropdown`, before
      // React re-renders, and the dropdown below is rendered conditionally.
      // Selecting here without deferring finds no `[data-combobox-option]`
      // elements and silently does nothing, leaving the list unhighlighted.
      requestAnimationFrame(() => {
        combobox.selectActiveOption();
      });
    },
  });

  const resolvedModelId = useMemo(() => {
    return ChatModelStorage.resolveChatModelId({
      availableModels: models,
      selectedModelId,
    });
  }, [models, selectedModelId]);

  useEffect(
    function persistSelectedOfflineModel() {
      const localModelId =
        OfflineChatPickerModels.parseModelId(resolvedModelId);
      if (localModelId) {
        LocalChatModelStore.writeSelectedId(localModelId);
      }
    },
    [resolvedModelId],
  );

  useEffect(
    function writeResolvedModelIdToStorage() {
      if (ChatModelStorage.readStoredChatModelId() === resolvedModelId) {
        return;
      }
      ChatModelStorage.writeStoredChatModelId(resolvedModelId);
    },
    [resolvedModelId],
  );

  // Register the resolved model id with assistant-ui's ModelContext so the
  // chat adapter can read `context.config.modelName` on each run.
  useEffect(
    function registerResolvedModelIdWithAssistantUi() {
      // `register` returns an unsubscribe; returning it as the effect cleanup
      // is what assistant-ui's own `makeAssistantVisible` does. Without it,
      // every model switch and every remount permanently appends a provider
      // to the registry. Behavior stays correct (the last registration wins)
      // but the list grows without bound.
      return assistantClient.modelContext().register({
        getModelContext: () => {
          return {
            config: {
              modelName: resolvedModelId,
            },
          };
        },
      });
    },
    [assistantClient, resolvedModelId],
  );

  const selectedModel = models.find(propEq("id", resolvedModelId));

  const tooltipLabel =
    selectedModel ? t`Using ${selectedModel.name}` : t`Choose a model`;

  return (
    <Combobox
      store={combobox}
      width={300}
      position="top-start"
      withinPortal
      preventPositionChangeWhenVisible
      onOptionSubmit={(modelId) => {
        setSelectedModelId(modelId);
        combobox.closeDropdown();
      }}
    >
      <Tooltip label={tooltipLabel} disabled={combobox.dropdownOpened}>
        {/*
          `targetType="button"` matters now that the search input is gone and
          the trigger is the focused element. Mantine's default `"input"`
          gives the button `aria-activedescendant` without `role="combobox"`
          or `aria-expanded`, which screen readers do not announce, and it
          skips the Space/Enter handling that a button target expects.
        */}
        <Combobox.Target targetType="button" withExpandedAttribute>
          <Button
            type="button"
            variant="light"
            color="neutral"
            size="compact-sm"
            className={css.trigger}
            disabled={disabled}
            aria-label={t`Choose chat model`}
            onClick={() => {
              combobox.toggleDropdown();
            }}
          >
            {selectedModel?.nameWithoutProvider ?? t`Model`}
          </Button>
        </Combobox.Target>
      </Tooltip>

      {combobox.dropdownOpened ?
        <Combobox.Dropdown className={css.dropdown}>
          <Combobox.Options className={css.options}>
            {groups.map((entry) => {
              return (
                <Combobox.Group label={entry.group} key={entry.group}>
                  {entry.models.map((model) => {
                    const isSelected = model.id === resolvedModelId;
                    return (
                      <Combobox.Option
                        value={model.id}
                        key={model.id}
                        active={isSelected}
                      >
                        <Group gap="xs" wrap="nowrap" justify="space-between">
                          <Text size="sm" className={css.optionLabel}>
                            {model.name}
                          </Text>
                          {isSelected ?
                            <IconCheck
                              size={14}
                              className={css.selectedIcon}
                              aria-hidden
                            />
                          : null}
                        </Group>
                      </Combobox.Option>
                    );
                  })}
                </Combobox.Group>
              );
            })}
          </Combobox.Options>
        </Combobox.Dropdown>
      : null}
    </Combobox>
  );
}
