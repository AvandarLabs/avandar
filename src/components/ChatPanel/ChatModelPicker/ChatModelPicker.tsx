import { makeSelectOptions, Select } from "@ui";
import { useEffect, useMemo, useState } from "react";
import {
  readStoredChatModelId,
  resolveChatModelId,
  writeStoredChatModelId,
} from "@/components/ChatPanel/chatModelStorage/chatModelStorage";
import { useChatModels } from "@/components/ChatPanel/useChatModels";
import { useRegisterChatModelContext } from "@/components/ChatPanel/useRegisterChatModelContext";
import css from "./ChatModelPicker.module.css";
import type { SelectData } from "@ui";

type Props = {
  disabled?: boolean;
};

/**
 * Model picker for the chat panel. Loads models from OpenRouter, registers
 * the selection with assistant-ui ModelContext, and persists the choice in
 * localStorage.
 */
export function ChatModelPicker({
  disabled = false,
}: Props): JSX.Element | null {
  const { groups, models, isLoading, isError } = useChatModels();
  const [selectedModelId, setSelectedModelId] = useState<string | undefined>();

  const resolvedModelId = useMemo(() => {
    if (models.length === 0) {
      return selectedModelId;
    }
    return resolveChatModelId({
      availableModels: models,
      storedModelId: selectedModelId ?? readStoredChatModelId(),
    });
  }, [models, selectedModelId]);

  useEffect(() => {
    if (!resolvedModelId) {
      return;
    }
    writeStoredChatModelId(resolvedModelId);
  }, [resolvedModelId]);

  useRegisterChatModelContext(resolvedModelId);

  const selectData = useMemo((): SelectData<string> => {
    return groups.map((entry) => {
      return {
        group: entry.group,
        items: makeSelectOptions(entry.models, {
          valueKey: "id",
          labelKey: "name",
        }),
      };
    });
  }, [groups]);

  if (isError) {
    return null;
  }

  return (
    <div className={css.root}>
      <Select
        className={css.select}
        size="xs"
        searchable
        disabled={disabled || isLoading || !resolvedModelId}
        data={selectData}
        value={resolvedModelId ?? null}
        placeholder={isLoading ? "Loading models catalog..." : "Select a model"}
        onChange={(modelId) => {
          if (modelId) {
            setSelectedModelId(modelId);
          }
        }}
        comboboxProps={{ withinPortal: true }}
        aria-label="Chat model"
      />
    </div>
  );
}
