import { GooglePickerAPI } from "./google-picker";
import "react";

declare global {
  /**
   * Adding JSX.Element to our global namespace just to make return
   * types for React functional components easier so we can just type
   * `JSX.Element` rather than `React.JSX.Element` every time.
   */
  namespace JSX {
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    interface Element extends React.JSX.Element {}
  }

  interface Window {
    /**
     * Google API's for different services. This is optional because
     * it is loaded asynchronously on-demand, so it is not always available
     * in the window.
     *
     * Libraries here are loaded with `gapi.load`. You can use `useGoogleAPI`
     * to load libraries here.
     */
    google?: {
      picker?: GooglePickerAPI;
    };
  }
}
