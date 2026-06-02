import { useAui } from "@assistant-ui/react";
import { Button, Combobox, Group, Text, useCombobox } from "@mantine/core";
import { IconCheck } from "@tabler/icons-react";
import { Tooltip } from "@ui";
import { propEq } from "@utils";
import { useEffect, useMemo, useState } from "react";
import { ChatModelStorage } from "@/components/ChatPanel/ChatModelStorage/ChatModelStorage";
import { useChatModelCatalog } from "@/components/ChatPanel/useChatModelCatalog";
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
  const { groups, models, isLoading, isError } = useChatModelCatalog();
  const [selectedModelId, setSelectedModelId] = useState<string | undefined>();
  const [search, setSearch] = useState("");
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

  const resolvedModelId =
    models.length === 0 ?
      selectedModelId
    : ChatModelStorage.resolveChatModelId({
        availableModels: models,
        selectedModelId,
      });

  const selectedModel =
    resolvedModelId ? models.find(propEq("id", resolvedModelId)) : undefined;

  useEffect(
    function writeResolvedModelIdToStorage() {
      if (resolvedModelId) {
        ChatModelStorage.writeStoredChatModelId(resolvedModelId);
      }
    },
    [resolvedModelId],
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
    isLoading ? "Loading models..."
    : selectedModel ? `Using ${selectedModel.name}`
    : "Choose a model";

  const isTriggerDisabled = disabled || isLoading || !resolvedModelId;

  if (isError) {
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
            aria-label="Choose chat model"
            onClick={() => {
              combobox.toggleDropdown();
            }}
          >
            {selectedModel?.nameWithoutProvider ?? "Model"}
          </Button>
        </Combobox.Target>
      </Tooltip>

      <Combobox.Dropdown className={css.dropdown}>
        <Combobox.Search
          value={search}
          onChange={(event) => {
            setSearch(event.currentTarget.value);
            combobox.updateSelectedOptionIndex();
          }}
          placeholder="Search models"
          aria-label="Search models"
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
          : <Combobox.Empty>No models match your search</Combobox.Empty>}
        </Combobox.Options>
      </Combobox.Dropdown>
    </Combobox>
  );
}
