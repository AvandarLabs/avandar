import { useQuery } from "@avandar/query-hooks";
import { isNonEmptyArray, MIMEType, noop } from "@avandar/utils";
import { msg } from "@lingui/core/macro";
import { useLingui } from "@lingui/react/macro";
import { useEffect, useMemo, useState } from "react";
import { APIClient } from "@/clients/APIClient";
import { useCurrentUserProfile } from "@/hooks/users/useCurrentUserProfile";
import { useGooglePickerAPI } from "@/lib/hooks/useGooglePickerAPI";
import type { GoogleToken } from "@/lib/hooks/useGooglePickerAPI";
import type {
  GooglePickerAPI,
  GPicker,
  GPickerDocsView,
  GPickerDocumentObject,
  GPickerResponseObject,
  GPickerViewId,
} from "@/lib/types/google-picker";
import type { I18n } from "@lingui/core";

function _getGooglePickerAPIKey(): string {
  const key = import.meta.env.VITE_GOOGLE_PICKER_API_KEY;
  if (!key) {
    throw new Error("Google Picker API key is not defined");
  }
  return key;
}

/**
 * The Cloud project number the Picker reports as the picking app.
 *
 * This is what ties a pick to the OAuth client whose per-file `drive.file`
 * grant Google records, so a Picker built without it hands back a file id the
 * app has no grant for, and the subsequent Drive export answers 404 as though
 * the file did not exist. It must be the same Cloud project as
 * `GOOGLE_CLIENT_ID`, and it is that value's numeric prefix.
 *
 * Throws rather than returning `undefined` so a missing deployment variable
 * fails where it can be diagnosed, instead of downstream on an export.
 */
function _getGooglePickerAppId(): string {
  const appId = import.meta.env.VITE_GOOGLE_PICKER_APP_ID;
  if (!appId) {
    throw new Error("Google Picker app id is not defined");
  }
  return appId;
}

/**
 * The navigation tab labels.
 *
 * `msg` descriptors resolved by the caller's `i18n` rather than `` t`…` ``,
 * because these are consumed by a plain function outside any macro scope and
 * `docs/rules/i18n.md` requires the extractable macro to stay at its own call
 * site.
 */
const VIEW_LABELS = {
  myDrive: msg`My Drive`,
  sharedWithMe: msg`Shared with me`,
  sharedDrives: msg`Shared drives`,
};

/**
 * The Picker's navigation, as one Sheets-only DocsView per tab.
 *
 * Three views rather than one, because a DocsView's scope is a property of the
 * whole view: `setEnableDrives(true)` does not *add* shared drives to a view,
 * it re-roots that view at the shared drives list, so a single view that
 * reaches a shared drive is a view that cannot reach My Drive at all.
 * Splitting the scopes across views is what the Picker's tabs are for,
 * and it beats a single flat listing on legibility anyway: each tab browses as
 * a folder hierarchy, and search still spans all of them regardless of which
 * tab is open.
 *
 * Labels are set explicitly instead of left to Google, which derives a tab name
 * from the view's options and would give two of these three the same one.
 *
 * The first view is deliberately left unfiltered rather than given
 * `setOwnedByMe(true)`: it browses the My Drive hierarchy, and files someone
 * else owns but has placed in your folders belong in that tree.
 *
 * Prefers DocsViews so LIST mode can be set: GRID needs thumbnail access that
 * `drive.file` does not grant. Falls back to the bare `ViewId.SPREADSHEETS`
 * when DocsView is not a constructor, which is still a valid `addView`
 * argument, but is necessarily a single unlabelled tab with no way to set any
 * of this.
 */
function _spreadsheetViews(
  options: Readonly<{ pickerAPI: GooglePickerAPI; i18n: I18n }>,
): Array<GPickerDocsView | GPickerViewId> {
  const { pickerAPI, i18n } = options;
  if (typeof pickerAPI.DocsView !== "function") {
    return [pickerAPI.ViewId.SPREADSHEETS];
  }
  const makeSheetsView = () => {
    return new pickerAPI.DocsView(pickerAPI.ViewId.SPREADSHEETS)
      .setMode(pickerAPI.DocsViewMode.LIST)
      .setMimeTypes(MIMEType.APPLICATION_GOOGLE_SPREADSHEET)
      .setIncludeFolders(true);
  };
  return [
    makeSheetsView().setLabel(i18n._(VIEW_LABELS.myDrive)),
    makeSheetsView()
      .setOwnedByMe(false)
      .setLabel(i18n._(VIEW_LABELS.sharedWithMe)),
    makeSheetsView()
      .setEnableDrives(true)
      .setLabel(i18n._(VIEW_LABELS.sharedDrives)),
  ];
}

type UseGooglePickerOptions = {
  onGoogleSheetPicked?: (params: {
    document: GPickerDocumentObject;
    googleAccount: GoogleToken;
  }) => void;

  /**
   * Called when the user dismisses the Picker. A dismissal is a decision, not a
   * failure, so this exists only so the caller can clear whatever pending state
   * it set before opening the Picker and leave no orphaned spinner.
   */
  onCancel?: () => void;

  /**
   * Called when the Picker itself fails. Worth surfacing loudly: the most
   * likely cause is an app id that does not match the OAuth client's Cloud
   * project, and swallowing it makes that misconfiguration look like a scope
   * problem on the export instead.
   */
  onError?: (response: GPickerResponseObject) => void;
};

export function useGooglePicker({
  onGoogleSheetPicked = noop,
  onCancel = noop,
  onError = noop,
}: UseGooglePickerOptions): {
  isGoogleAuthenticated: boolean;
  picker: GPicker | undefined;
  googlePickerAPI: GooglePickerAPI | undefined;
  isLoadingAPI: boolean;
  isLoadingGoogleAuthState: boolean;
  selectedGoogleAccount: GoogleToken | undefined;
} {
  const { i18n } = useLingui();
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
    if (
      !pickerAPI ||
      !accessToken ||
      !selectedAccount ||
      typeof pickerAPI.PickerBuilder !== "function"
    ) {
      return undefined;
    }
    const builder = new pickerAPI.PickerBuilder();
    // Added in a loop because the tab order is the `addView` order, and a
    // fluent chain cannot vary in length.
    _spreadsheetViews({ pickerAPI, i18n }).forEach((view) => {
      builder.addView(view);
    });

    return (
      builder
        .setOAuthToken(accessToken)
        .setDeveloperKey(_getGooglePickerAPIKey())
        .setAppId(_getGooglePickerAppId())
        // Parents the iframe on this page. Without it Google uses the last
        // loaded resource (often `/favicon.ico`) and the dialog never appears.
        .setOrigin(window.location.origin)
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
            return;
          }
          if (response.action === pickerAPI.Action.CANCEL) {
            onCancel();
            return;
          }
          if (response.action === pickerAPI.Action.ERROR) {
            onError(response);
          }
        })
        .build()
    );
  }, [
    pickerAPI,
    accessToken,
    onGoogleSheetPicked,
    onCancel,
    onError,
    selectedAccount,
    i18n,
  ]);

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
