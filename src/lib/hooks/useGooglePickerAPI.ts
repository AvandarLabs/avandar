import { useEffect } from "react";
import { useQuery, UseQueryResult } from "@/lib/hooks/query/useQuery";
import { APIReturnType } from "@/types/http-api.types";
import { Logger } from "../Logger";
import { GooglePickerAPI } from "../types/google-picker";
import { notifyError } from "../ui/notifications/notifyError";
import { useBoolean } from "./state/useBoolean";

const GOOGLE_API_JS_URL = "https://apis.google.com/js/api.js";
const scriptSelector = `script[src="${GOOGLE_API_JS_URL}"]`;

export type GoogleToken = APIReturnType<"google-auth/tokens">["tokens"][number];

function notifyErrorLoadingGoogleAPI() {
  notifyError(
    "There was an error loading Google services.",
    "Please refresh and try again. If it still does not work, please contact support",
  );
}

/**
 * Checks if the Google API is available. This is the API used to load other
 * libraries.
 * @returns True if the Google API is available, false otherwise.
 */
function isGAPIAvailable(): boolean {
  return !!window.gapi;
}

/**
 * This hooks loads the Google Picker API.
 */
export function useGooglePickerAPI(): [
  api: GooglePickerAPI | undefined,
  isLoading: boolean,
  queryResult: UseQueryResult<GooglePickerAPI>,
] {
  const [isGAPILoaded, setGAPILoadedTrue] = useBoolean(false);

  const [
    googlePickerAPI,
    isLoadingGooglePickerAPI,
    googlePickerLoadQueryResult,
  ] = useQuery({
    queryKey: ["loadGoogleAPI", "picker"],

    // query to load the Google Picker API
    queryFn: async () => {
      if (isGAPIAvailable()) {
        const loadLibraryPromise = new Promise<GooglePickerAPI>((resolve) => {
          gapi.load("picker", () => {
            if (window.google?.picker) {
              resolve(window.google.picker);
            } else {
              const errorMessage =
                "Google Picker API failed to load even though gapi was available";
              notifyErrorLoadingGoogleAPI();
              Logger.error(errorMessage);
              throw new Error(errorMessage);
            }
          });
        });
        return await loadLibraryPromise;
      } else {
        notifyErrorLoadingGoogleAPI();
        const errorMessage =
          "Attempted loading Google Picker API but gapi was not available";
        Logger.error(errorMessage);
        throw new Error(errorMessage);
      }
    },
    enabled: isGAPILoaded,
    staleTime: Infinity,
  });

  /*
            const pickerAPI = window.google?.picker;
            if (pickerAPI) {
            }
            */

  // Load the gapi object which lets us load other Google APIs
  useEffect(() => {
    if (window.gapi) {
      // The gapi object exists on the window object so let's not
      // load it again
      return;
    }

    const existingScript = document.querySelector(scriptSelector);
    if (existingScript) {
      // the script tag is present already, so let's not add it again
      return;
    }

    const script = document.createElement("script");
    script.src = GOOGLE_API_JS_URL;
    script.async = true;
    script.onload = setGAPILoadedTrue;
    document.body.appendChild(script);
    return () => {
      document.body.removeChild(script);
    };
  }, [setGAPILoadedTrue]);

  return [
    googlePickerAPI,
    !window.gapi || isLoadingGooglePickerAPI,
    googlePickerLoadQueryResult,
  ] as const;
}

/*
function openPicker(accessToken) {
  gapi.load('picker', {
    callback: function() {
      const picker = new google.picker.PickerBuilder()
        .addView(google.picker.ViewId.SPREADSHEETS) // Only show Sheets
        .setOAuthToken(accessToken)
        .setDeveloperKey(YOUR_API_KEY)
        .setCallback(pickerCallback)
        .build();
      picker.setVisible(true);
    }
  });
}

function pickerCallback(data) {
  if (data.action === google.picker.Action.PICKED) {
    const file = data.docs[0];
    console.log('User picked:', file);
    // Save file.id, file.name, etc.
  }
}
*/
