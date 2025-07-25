import { useEffect, useMemo, useState } from "react";
import { APIClient } from "@/clients/APIClient";
import { useQuery } from "@/lib/hooks/query/useQuery";
import {
  GoogleToken,
  useGooglePickerAPI,
} from "@/lib/hooks/useGooglePickerAPI";
import {
  GooglePickerAPI,
  GPicker,
  GPickerDocumentObject,
  GPickerResponseObject,
} from "@/lib/types/google-picker";
import { isNonEmptyArray } from "@/lib/utils/guards";
import { noop } from "@/lib/utils/misc";
import { useCurrentUserProfile } from "../users/useCurrentUserProfile";

const GOOGLE_PICKER_API_KEY = import.meta.env.VITE_GOOGLE_PICKER_API_KEY!;
if (!GOOGLE_PICKER_API_KEY) {
  throw new Error("Google Picker API key is not defined");
}

type UseGooglePickerOptions = {
  onGoogleSheetPicked?: (document: GPickerDocumentObject) => void;
};

const GOOGLE_SPREADSHEET_MIME_TYPE = "application/vnd.google-apps.spreadsheet";

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
      const { tokens: activeTokens } =
        await APIClient.get("google-auth/tokens");
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
        .setMimeTypes(GOOGLE_SPREADSHEET_MIME_TYPE)
        .setIncludeFolders(true);

      return new pickerAPI.PickerBuilder()
        .addView(sheetsView)
        .setOAuthToken(accessToken) // get the accessToken
        .setDeveloperKey(GOOGLE_PICKER_API_KEY) // get my developer key
        .setMaxItems(1)
        .setSelectableMimeTypes(GOOGLE_SPREADSHEET_MIME_TYPE)
        .setCallback((response: GPickerResponseObject) => {
          if (
            response.action === pickerAPI.Action.PICKED &&
            response.viewToken?.[0] === pickerAPI.ViewId.SPREADSHEETS &&
            isNonEmptyArray(response.docs)
          ) {
            onGoogleSheetPicked(response.docs[0]);
          }
        })
        .build();
    }
    return undefined;
  }, [pickerAPI, accessToken, onGoogleSheetPicked]);

  const isLoadingGoogleAuthState = isLoadingUser || isLoadingTokens;
  const isLoadingAPI = isLoadingGoogleAuthState || isLoadingPickerAPI;

  return {
    picker,
    googlePickerAPI: pickerAPI,
    isLoadingAPI,
    isLoadingGoogleAuthState,
    isGoogleAuthenticated: !!tokens,
    selectedGoogleAccount: selectedAccount,
  };
}
