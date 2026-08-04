import { useAui } from "@assistant-ui/react";
import { useLingui } from "@lingui/react/macro";
import { Button, Combobox, Group, Text, useCombobox } from "@mantine/core";
import { IconCheck } from "@tabler/icons-react";
import { Tooltip } from "@ui";
import { propEq } from "@utils";
import { useEffect, useMemo, useState } from "react";
import { ChatModelStorage } from "@/components/ChatPanel/ChatModelStorage/ChatModelStorage";
import { useChatModelCatalog } from "@/components/ChatPanel/useChatModelCatalog";
import { LocalChatModelStore } from "@/clients/LocalChatModel/LocalChatModelStore/LocalChatModelStore";
import { OfflineChatPickerModels } from "@/components/ChatPanel/offline-chat-helpers/OfflineChatPickerModels/OfflineChatPickerModels";
import css from "./ChatModelPicker.module.css";

type Props = {
  disabled?: boolean;
};

/**
 * Compact model picker for the chat composer. Shows a small "Model" control;
 * the active model name appears in a tooltip. Clicking opens a searchable,
 * grouped catalog.
 */
export function ChatModelPicker({
  disabled = false,
}: Props): JSX.Element | null {
  const { groups, models, isLoading, isError, hasDownloadedOfflineModels } =
    useChatModelCatalog();
  const [selectedModelId, setSelectedModelId] = useState<string | undefined>(
    () => {
      return ChatModelStorage.readStoredChatModelId();
    },
  );
  const [search, setSearch] = useState("");
  const { t } = useLingui();
  const assistantClient = useAui();

  const combobox = useCombobox({
    onDropdownClose: () => {
      combobox.resetSelectedOption();
      setSearch("");
    },
    onDropdownOpen: () => {
      combobox.selectFirstOption();
      combobox.focusSearchInput();
    },
  });

  const resolvedModelId = useMemo(() => {
    if (models.length === 0) {
      return selectedModelId;
    }
    const storedMissingFromCatalog =
      selectedModelId !== undefined &&
      !models.some(propEq("id", selectedModelId));
    return ChatModelStorage.resolveChatModelId({
      availableModels: models,
      selectedModelId,
      honorStoredWhenMissing: isLoading && storedMissingFromCatalog,
    });
  }, [models, selectedModelId, isLoading]);

  useEffect(
    function persistSelectedOfflineModel() {
      if (!resolvedModelId) {
        return;
      }
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
      if (!resolvedModelId) {
        return;
      }
      const storedModelId = ChatModelStorage.readStoredChatModelId();
      if (
        isLoading &&
        storedModelId &&
        !models.some(propEq("id", storedModelId))
      ) {
        return;
      }
      if (storedModelId === resolvedModelId) {
        return;
      }
      ChatModelStorage.writeStoredChatModelId(resolvedModelId);
    },
    [resolvedModelId, models, isLoading],
  );

  // Register the resolved model id with assistant-ui's ModelContext so the
  // chat adapter can read `context.config.modelName` on each run.
  useEffect(
    function registerResolvedModelIdWithAssistantUi() {
      if (resolvedModelId) {
        assistantClient.modelContext().register({
          getModelContext: () => {
            return {
              config: {
                modelName: resolvedModelId,
              },
            };
          },
        });
      }
    },
    [assistantClient, resolvedModelId],
  );

  const selectedModel =
    resolvedModelId ? models.find(propEq("id", resolvedModelId)) : undefined;

  const filteredGroups = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) {
      return groups;
    }
    return groups
      .map((entry) => {
        const groupMatches = entry.group.toLowerCase().includes(query);
        const matchingModels = entry.models.filter((model) => {
          if (groupMatches) {
            return true;
          }
          return (
            model.name.toLowerCase().includes(query) ||
            model.id.toLowerCase().includes(query)
          );
        });
        return { ...entry, models: matchingModels };
      })
      .filter((entry) => {
        return entry.models.length > 0;
      });
  }, [groups, search]);

  const tooltipLabel =
    isLoading ? t`Loading models...`
    : selectedModel ? t`Using ${selectedModel.name}`
    : t`Choose a model`;

  const isTriggerDisabled =
    disabled || (isLoading && !hasDownloadedOfflineModels) || !resolvedModelId;

  if (isError && !hasDownloadedOfflineModels) {
    return null;
  }

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
        <Combobox.Target>
          <Button
            type="button"
            variant="light"
            color="neutral"
            size="compact-sm"
            className={css.trigger}
            disabled={isTriggerDisabled}
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
          <Combobox.Search
            value={search}
            onChange={(event) => {
              setSearch(event.currentTarget.value);
              combobox.updateSelectedOptionIndex();
            }}
            placeholder={t`Search models`}
            aria-label={t`Search models`}
          />
          <Combobox.Options className={css.options}>
            {filteredGroups.length > 0 ?
              filteredGroups.map((entry) => {
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
              })
            : <Combobox.Empty>{t`No models match your search`}</Combobox.Empty>}
          </Combobox.Options>
        </Combobox.Dropdown>
      : null}
    </Combobox>
  );
}
