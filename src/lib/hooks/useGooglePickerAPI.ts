import { t } from "@lingui/core/macro";
import { useEffect, useState } from "react";
import { Logger } from "@/utils/Logger";
import { notifyError } from "@/utils/notifications/notify";
import type { GooglePickerAPI } from "@/lib/types/google-picker";
import type { APIReturnType } from "@/types/http-api.types";

const GOOGLE_API_JS_URL = "https://apis.google.com/js/api.js";
const SCRIPT_SELECTOR = `script[src="${GOOGLE_API_JS_URL}"]`;
const PICKER_LOAD_POLL_MS = 50;
const PICKER_LOAD_TIMEOUT_MS = 10_000;

export type GoogleToken = APIReturnType<
  "google-auth/tokens",
  "GET"
>["tokens"][number];

type PickerAPIState = {
  api: GooglePickerAPI | undefined;
  isLoading: boolean;
};

function notifyErrorLoadingGoogleAPI() {
  notifyError(
    t`There was an error loading Google services.`,
    t`Please refresh and try again. If it still does not work, please contact support`,
  );
}

/**
 * The picker namespace, but only once it is usable.
 *
 * `PickerBuilder` is the gate rather than the namespace itself because a
 * namespace can exist without its constructors: `JSON.parse(JSON.stringify())`
 * of this namespace keeps every enum (`ViewId`, `Action`, ...) and drops every
 * constructor, so a round-tripped copy passes a truthiness check and then
 * fails at `new PickerBuilder()`.
 */
function _getLoadedPickerAPI(): GooglePickerAPI | undefined {
  const pickerAPI = window.google?.picker;
  return typeof pickerAPI?.PickerBuilder === "function" ? pickerAPI : undefined;
}

/**
 * Polls until `PickerBuilder` shows up, for the case where gapi reports the
 * module as loaded a tick before it finishes installing the namespace.
 */
function _waitForPickerBuilder(): Promise<GooglePickerAPI> {
  return new Promise((resolve, reject) => {
    const deadline = Date.now() + PICKER_LOAD_TIMEOUT_MS;
    const poll = () => {
      const pickerAPI = _getLoadedPickerAPI();
      if (pickerAPI) {
        resolve(pickerAPI);
        return;
      }
      if (Date.now() >= deadline) {
        reject(
          new Error(
            "Google Picker API failed to load even though gapi was available",
          ),
        );
        return;
      }
      window.setTimeout(poll, PICKER_LOAD_POLL_MS);
    };
    poll();
  });
}

/**
 * Loads `api.js`, which is what defines `gapi.load`.
 *
 * The script tag is deliberately never removed: `window.gapi` outlives the
 * element, so a later mount that found the global but no tag would have no way
 * to tell a half-loaded gapi from a ready one.
 */
function _loadGAPIScript(): Promise<void> {
  if (window.gapi) {
    return Promise.resolve();
  }
  return new Promise((resolve, reject) => {
    const onLoad = () => {
      resolve();
    };
    const onError = () => {
      reject(new Error(`Failed to load ${GOOGLE_API_JS_URL}`));
    };
    const existingScript = document.querySelector(SCRIPT_SELECTOR);
    if (existingScript) {
      existingScript.addEventListener("load", onLoad);
      existingScript.addEventListener("error", onError);
      return;
    }
    const script = document.createElement("script");
    script.src = GOOGLE_API_JS_URL;
    script.async = true;
    script.addEventListener("load", onLoad);
    script.addEventListener("error", onError);
    document.body.appendChild(script);
  });
}

/** Loads the `picker` module, which gapi installs at `window.google.picker`. */
function _loadPickerModule(): Promise<GooglePickerAPI> {
  return new Promise((resolve, reject) => {
    gapi.load("picker", {
      callback: () => {
        void _waitForPickerBuilder().then(resolve, reject);
      },

      // `onerror` and `ontimeout` matter because gapi's happy-path callback is
      // the only signal it gives by default: without them a module fetch that
      // never lands leaves this promise pending forever, and the UI waits on a
      // spinner with nothing behind it.
      onerror: () => {
        reject(new Error("gapi could not load the Google Picker module"));
      },
      timeout: PICKER_LOAD_TIMEOUT_MS,
      ontimeout: () => {
        reject(new Error("gapi timed out loading the Google Picker module"));
      },
    });
  });
}

/**
 * The in-flight (or settled) picker load, shared by every caller of the hook so
 * the script and the module are each fetched once per page load.
 *
 * This is module state and not a React Query entry on purpose. The value is the
 * live `google.picker` namespace, and every successful query in this app is
 * dehydrated to IndexedDB as JSON (see `AvandarQueryClientProvider`). That
 * round trip strips the namespace's constructors, so the next boot rehydrated a
 * `PickerBuilder`-less object as fresh success data, `staleTime: Infinity` kept
 * the query from ever running again, and the Picker stayed unopenable until the
 * user cleared IndexedDB. A per-page-load global cannot be cached across page
 * loads, so it must not live in a cache that is.
 */
let _pickerAPILoad: Promise<GooglePickerAPI> | undefined;

function _loadPickerAPI(): Promise<GooglePickerAPI> {
  const loadedAPI = _getLoadedPickerAPI();
  if (loadedAPI) {
    return Promise.resolve(loadedAPI);
  }
  if (!_pickerAPILoad) {
    _pickerAPILoad = _loadGAPIScript()
      .then(_loadPickerModule)
      .catch((error: unknown) => {
        // Forget the failure so a later mount can retry. Holding onto the
        // rejected promise would make one bad load (an offline moment, say)
        // permanent for the rest of the session.
        _pickerAPILoad = undefined;
        throw error;
      });
  }
  return _pickerAPILoad;
}

/**
 * Loads the Google Picker library (`window.google.picker`).
 *
 * Returns the namespace only once `PickerBuilder` is callable on it, so a
 * caller holding an API is always holding one it can build a Picker with.
 */
export function useGooglePickerAPI(): [
  api: GooglePickerAPI | undefined,
  isLoading: boolean,
] {
  const [{ api, isLoading }, setPickerAPIState] = useState<PickerAPIState>(
    () => {
      const loadedAPI = _getLoadedPickerAPI();
      return { api: loadedAPI, isLoading: !loadedAPI };
    },
  );

  useEffect(() => {
    let isMounted = true;
    void _loadPickerAPI().then(
      (loadedAPI) => {
        if (isMounted) {
          setPickerAPIState({ api: loadedAPI, isLoading: false });
        }
      },
      (error: unknown) => {
        Logger.error(error);
        if (isMounted) {
          setPickerAPIState({ api: undefined, isLoading: false });
          notifyErrorLoadingGoogleAPI();
        }
      },
    );
    return () => {
      isMounted = false;
    };
  }, []);

  return [api, isLoading];
}
