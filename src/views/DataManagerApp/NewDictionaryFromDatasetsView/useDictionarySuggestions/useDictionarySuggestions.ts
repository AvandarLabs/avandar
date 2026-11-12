import { APIClient } from "@/clients/APIClient";
import { useIsOfflineBundleDownloaded } from "@/hooks/localChatModels/useIsOfflineBundleDownloaded";
import { useIsOfflineModeOn } from "@/hooks/localChatModels/useIsOfflineModeOn";
import { useCurrentUserProfile } from "@/hooks/users/useCurrentUserProfile";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import { DictionarySuggestions } from "@/lib/dataDictionaries/DictionarySuggestions/DictionarySuggestions";
import { useIsOnline } from "@/lib/hooks/browser/useIsOnline/useIsOnline";
import { OfflineChatEngineStore } from "@/stores/OfflineChatEngineStore/OfflineChatEngineStore";
import type { DictionarySuggestionsRequest } from "$/agent/dictionarySuggestions/dictionarySuggestionsPrompt";
import type { Workspace } from "$/models/Workspace/Workspace";
import type { DictionarySuggestionModel } from "@/lib/dataDictionaries/DictionarySuggestions/DictionarySuggestions";
import type { SuggestionConsent } from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/newDictionaryReducer/newDictionaryReducer";

/**
 * Who answers dictionary suggestions in this flow: one of the models, or
 * nobody because the user said no to sending them online.
 */
export type DictionarySuggestionAvailability =
  | DictionarySuggestionModel
  | "declined";

/**
 * Asks for one suggestion. Resolves to undefined when the user did not let
 * this request go online.
 */
export type RequestSuggestionReply = (
  request: DictionarySuggestionsRequest,
) => Promise<string | undefined>;

type ConsentOptions = {
  consent: SuggestionConsent;
  onConsentDecided: (isApproved: boolean) => void;
};

async function _requestOnline(
  options: Readonly<
    ConsentOptions & {
      request: DictionarySuggestionsRequest;
      workspaceId: Workspace.Id;
      userId: string;
    }
  >,
): Promise<string | undefined> {
  const { consent, request, workspaceId } = options;
  if (consent === "declined") {
    return undefined;
  }
  const ackToken = await DictionarySuggestions.approveRequest({
    request,
    workspaceId,
    userId: options.userId,
    isConsentConfirmed: consent === "approved",
  });
  if (consent === "not_asked") {
    options.onConsentDecided(ackToken !== undefined);
  }
  if (ackToken === undefined) {
    return undefined;
  }
  return await DictionarySuggestions.requestReply({
    model: "online",
    ackToken,
    workspaceId,
    request,
    post: APIClient.post,
    completeOnDevice: OfflineChatEngineStore.complete,
  });
}

/**
 * Which model answers dictionary suggestions right now, kept current as the
 * connection or offline mode changes, and a function that asks it. Online
 * sends go through the chat's consent gate, and the user's first answer is
 * kept for the flow. Used by the create flow's Review and Label values
 * steps.
 */
export function useDictionarySuggestions(options: Readonly<ConsentOptions>): {
  availability: DictionarySuggestionAvailability;
  /** The model a request is cut to fit, whatever the user's consent. */
  model: DictionarySuggestionModel;
  requestReply: RequestSuggestionReply;
} {
  const workspace = useCurrentWorkspace();
  const [userProfile] = useCurrentUserProfile();
  const isOnline = useIsOnline();
  const isOfflineModeOn = useIsOfflineModeOn();
  const isBundleDownloaded = useIsOfflineBundleDownloaded();
  const model = DictionarySuggestions.getModelFromRuntimeState({
    navigatorOnLine: isOnline,
    isOfflineModeOn,
    isBundleDownloaded,
  });
  const isDeclined = model === "online" && options.consent === "declined";
  return {
    availability: isDeclined ? "declined" : model,
    model,
    requestReply: (request) => {
      if (model === "on_device") {
        return DictionarySuggestions.requestReply({
          model,
          workspaceId: workspace.id,
          request,
          post: APIClient.post,
          completeOnDevice: OfflineChatEngineStore.complete,
        });
      }
      if (model === "unavailable" || !userProfile) {
        return Promise.reject(new Error("No model can answer suggestions"));
      }
      return _requestOnline({
        ...options,
        request,
        workspaceId: workspace.id,
        userId: userProfile.userId,
      });
    },
  };
}
