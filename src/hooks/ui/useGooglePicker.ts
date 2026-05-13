import { useQuery } from "@hooks";
import { isNonEmptyArray, MIMEType, noop } from "@utils";
import { useEffect, useMemo, useState } from "react";
import { APIClient } from "@/clients/APIClient";
import { useCurrentUserProfile } from "@/hooks/users/useCurrentUserProfile";
import { useGooglePickerAPI } from "@/lib/hooks/useGooglePickerAPI";
import type { GoogleToken } from "@/lib/hooks/useGooglePickerAPI";
import type {
  GooglePickerAPI,
  GPicker,
  GPickerDocumentObject,
  GPickerResponseObject,
} from "@/lib/types/google-picker";

function _getGooglePickerAPIKey(): string {
  const key = import.meta.env.VITE_GOOGLE_PICKER_API_KEY;
  if (!key) {
    throw new Error("Google Picker API key is not defined");
  }
  return key;
}

type UseGooglePickerOptions = {
  onGoogleSheetPicked?: (params: {
    document: GPickerDocumentObject;
    googleAccount: GoogleToken;
  }) => void;
};

export function useGooglePicker({
  onGoogleSheetPicked = noop,
}: UseGooglePickerOptions): {
  isGoogleAuthenticated: boolean;
  picker: GPicker | undefined;
  googlePickerAPI: GooglePickerAPI | undefined;
  isLoadingAPI: boolean;
  isLoadingGoogleAuthState: boolean;
  selectedGoogleAccount: GoogleToken | undefined;
} {
  const [selectedAccount, setSelectedAccount] = useState<
    GoogleToken | undefined
  >();
  const [user, isLoadingUser] = useCurrentUserProfile();
  const [tokens, isLoadingTokens] = useQuery({
    queryKey: ["getGoogleTokens"],
    queryFn: async () => {
      // TODO(jpsyx): you could actually have multiple!!!
      // A user can connect multiple google accounts to their account.
      const { tokens: activeTokens } = await APIClient.get({
        route: "google-auth/tokens",
      });
      return activeTokens;
    },
    enabled: !!user,
  });
  const [pickerAPI, isLoadingPickerAPI] = useGooglePickerAPI();

  // for now we use the first token, but the user should be able to select one
  // TODO(jpsyx): this should soon be removed and instead a
  // `selectGoogleAccount` function should be added to this hook
  useEffect(() => {
    if (tokens) {
      setSelectedAccount(tokens[0]);
    }
  }, [tokens]);

  const accessToken = selectedAccount?.access_token;
  const picker = useMemo(() => {
    if (pickerAPI && accessToken) {
      const sheetsView = new pickerAPI.DocsView(pickerAPI.ViewId.SPREADSHEETS)
        .setMode(pickerAPI.DocsViewMode.LIST)
        .setMimeTypes(MIMEType.APPLICATION_GOOGLE_SPREADSHEET)
        .setIncludeFolders(true);

      return new pickerAPI.PickerBuilder()
        .addView(sheetsView)
        .setOAuthToken(accessToken) // get the accessToken
        .setDeveloperKey(_getGooglePickerAPIKey()) // get my developer key
        .setMaxItems(1)
        .setSelectableMimeTypes(MIMEType.APPLICATION_GOOGLE_SPREADSHEET)
        .setCallback((response: GPickerResponseObject) => {
          if (
            response.action === pickerAPI.Action.PICKED &&
            response.viewToken?.[0] === pickerAPI.ViewId.SPREADSHEETS &&
            isNonEmptyArray(response.docs)
          ) {
            onGoogleSheetPicked({
              document: response.docs[0],
              googleAccount: selectedAccount,
            });
          }
        })
        .build();
    }
    return undefined;
  }, [pickerAPI, accessToken, onGoogleSheetPicked, selectedAccount]);

  const isLoadingGoogleAuthState = isLoadingUser || isLoadingTokens;
  const isLoadingAPI = isLoadingGoogleAuthState || isLoadingPickerAPI;

  return {
    picker,
    googlePickerAPI: pickerAPI,
    isLoadingAPI,
    isLoadingGoogleAuthState,
    isGoogleAuthenticated: !!tokens && tokens.length > 0,
    selectedGoogleAccount: selectedAccount,
  };
}
