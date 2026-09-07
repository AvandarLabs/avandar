import type { Page } from "@playwright/test";

/**
 * Installs a stand-in `window.google.picker` so a spec can drive a pick.
 *
 * The Picker cannot be automated: it renders inside a `docs.google.com` iframe
 * that requires a live Google **browser session** (its own, separate from
 * the OAuth token), and refuses to load without one. So the picker is the one
 * part of this flow a spec has to stub, and everything downstream of the pick
 * (the token lookup, the Drive export, the parse, the dataset) stays real.
 *
 * Installed via `addInitScript`, which is what makes this work without any
 * production seam: `useGooglePickerAPI` gates on `window.google.picker
 * .PickerBuilder` already being a function, so a namespace present before the
 * app's first render is taken as loaded and Google's `api.js` is never fetched.
 * There is no e2e flag in the app and no test-only branch in the hook.
 *
 * The stub fires its callback synchronously from `setVisible(true)`, so a
 * click on "Pick google sheet" *is* the pick.
 *
 * @param page The page to install into, before it navigates.
 * @param sheet The document the fake Picker hands back.
 */
export async function installFakeGooglePicker(
  page: Page,
  sheet: Readonly<{ id: string; name: string }>,
): Promise<void> {
  await page.addInitScript(
    (pickedSheet: { id: string; name: string }) => {
      type PickerResponse = {
        action: string;
        viewToken: [string];
        docs: Array<{ id: string; name: string }>;
      };
      let onPicked: ((response: PickerResponse) => void) | undefined;

      // Every DocsView setter returns `this`, matching the real fluent view, so
      // a setter the hook calls but this stub forgot fails loudly here rather
      // than silently skipping a view option.
      const makeDocsView = () => {
        const view = {
          setMode: () => {
            return view;
          },
          setMimeTypes: () => {
            return view;
          },
          setIncludeFolders: () => {
            return view;
          },
          setOwnedByMe: () => {
            return view;
          },
          setEnableDrives: () => {
            return view;
          },
          setLabel: () => {
            return view;
          },
        };
        return view;
      };

      const makeBuilder = () => {
        const builder = {
          addView: () => {
            return builder;
          },
          setOAuthToken: () => {
            return builder;
          },
          setDeveloperKey: () => {
            return builder;
          },
          setAppId: () => {
            return builder;
          },
          setOrigin: () => {
            return builder;
          },
          setMaxItems: () => {
            return builder;
          },
          setSelectableMimeTypes: () => {
            return builder;
          },
          setCallback: (callback: (response: PickerResponse) => void) => {
            onPicked = callback;
            return builder;
          },
          build: () => {
            return {
              setVisible: (visible: boolean) => {
                if (!visible || !onPicked) {
                  return;
                }
                onPicked({
                  action: "picked",
                  // The hook checks this against `ViewId.SPREADSHEETS` before
                  // accepting the pick, so it has to be the real view id.
                  viewToken: ["spreadsheets"],
                  docs: [pickedSheet],
                });
              },
            };
          },
        };
        return builder;
      };

      const existingGoogle = (window as unknown as { google?: object }).google;
      (window as unknown as { google: object }).google = {
        ...existingGoogle,
        picker: {
          PickerBuilder: function PickerBuilderStub() {
            return makeBuilder();
          },
          DocsView: function DocsViewStub() {
            return makeDocsView();
          },
          DocsViewMode: { LIST: "list", GRID: "grid" },
          ViewId: { SPREADSHEETS: "spreadsheets" },
          Action: { PICKED: "picked", CANCEL: "cancel", ERROR: "error" },
        },
      };
    },
    { id: sheet.id, name: sheet.name },
  );
}
