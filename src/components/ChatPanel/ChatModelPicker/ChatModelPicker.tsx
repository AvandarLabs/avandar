import { useAui } from "@assistant-ui/react";
import { propEq } from "@avandar/utils";
import { useLingui } from "@lingui/react/macro";
import { useState } from "react";
import { ChatModelPickerView } from "@/components/ChatPanel/ChatModelPicker/ChatModelPickerView/ChatModelPickerView";
import { useChatModelCombobox } from "@/components/ChatPanel/ChatModelPicker/useChatModelCombobox";
import { usePersistSelectedOfflineModel } from "@/components/ChatPanel/ChatModelPicker/usePersistSelectedOfflineModel";
import { useRegisterResolvedModelId } from "@/components/ChatPanel/ChatModelPicker/useRegisterResolvedModelId";
import { useWriteResolvedModelIdToStorage } from "@/components/ChatPanel/ChatModelPicker/useWriteResolvedModelIdToStorage";
import { ChatModelStorage } from "@/components/ChatPanel/ChatModelStorage/ChatModelStorage";
import { useChatModelCatalog } from "@/components/ChatPanel/useChatModelCatalog/useChatModelCatalog";
import type { ReactNode } from "react";

type Props = {
  disabled?: boolean;
};

/** Renders the compact chat-composer control for choosing a model. */
export function ChatModelPicker({
  disabled = false,
}: Readonly<Props>): ReactNode {
  const { groups, models } = useChatModelCatalog();
  const [selectedModelId, setSelectedModelId] = useState<string | undefined>(
    ChatModelStorage.readStoredChatModelId,
  );
  const { t } = useLingui();
  const assistantClient = useAui();
  const combobox = useChatModelCombobox();
  const resolvedModelId = ChatModelStorage.resolveChatModelId({
    availableModels: models,
    selectedModelId,
  });

  usePersistSelectedOfflineModel(resolvedModelId);
  useWriteResolvedModelIdToStorage(resolvedModelId);
  useRegisterResolvedModelId({ assistantClient, resolvedModelId });

  const selectedModel = models.find(propEq("id", resolvedModelId));
  const tooltipLabel = selectedModel
    ? t`Using ${selectedModel.name}`
    : t`Choose a model`;

  return (
    <ChatModelPickerView
      buttonLabel={t`Model`}
      combobox={combobox}
      disabled={disabled}
      groups={groups}
      onModelSelect={setSelectedModelId}
      resolvedModelId={resolvedModelId}
      selectedModel={selectedModel}
      tooltipLabel={tooltipLabel}
      triggerAriaLabel={t`Choose chat model`}
    />
  );
}
