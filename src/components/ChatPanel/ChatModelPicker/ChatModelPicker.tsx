import { useLingui } from "@lingui/react/macro";
import { Button, Combobox, Group, Text, useCombobox } from "@mantine/core";
import { IconCheck } from "@tabler/icons-react";
import { Tooltip } from "@ui";
import { propEq } from "@utils";
import { useEffect, useMemo, useState } from "react";
import {
  readStoredChatModelId,
  resolveChatModelId,
  writeStoredChatModelId,
} from "@/components/ChatPanel/chatModelStorage/chatModelStorage";
import { useChatModelCatalog } from "@/components/ChatPanel/useChatModelCatalog";
import { useRegisterChatModelContext } from "@/components/ChatPanel/useRegisterChatModelContext";
import { writeStoredLocalChatModelId } from "@/lib/offlineChat/localChatModelStore";
import { parseOfflineChatPickerModelId } from "@/lib/offlineChat/offlineChatPickerModels";
import css from "./ChatModelPicker.module.css";
import type { ChatModelOption } from "$/types/chat.types";

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
      return readStoredChatModelId();
    },
  );
  const [search, setSearch] = useState("");
  const { t } = useLingui();

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
    const storedModelId = selectedModelId;
    const storedMissingFromCatalog =
      storedModelId !== undefined && !models.some(propEq("id", storedModelId));
    return resolveChatModelId({
      availableModels: models,
      storedModelId,
      honorStoredWhenMissing: isLoading && storedMissingFromCatalog,
    });
  }, [models, selectedModelId, isLoading]);

  useEffect(() => {
    if (!resolvedModelId) {
      return;
    }
    const localModelId = parseOfflineChatPickerModelId(resolvedModelId);
    if (localModelId) {
      writeStoredLocalChatModelId(localModelId);
    }
  }, [resolvedModelId]);

  const selectedModel = useMemo((): ChatModelOption | undefined => {
    if (!resolvedModelId) {
      return undefined;
    }
    return models.find(propEq("id", resolvedModelId));
  }, [models, resolvedModelId]);

  useEffect(() => {
    if (!resolvedModelId) {
      return;
    }
    const storedModelId = readStoredChatModelId();
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
    writeStoredChatModelId(resolvedModelId);
  }, [resolvedModelId, models, isLoading]);

  useRegisterChatModelContext(resolvedModelId);

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
