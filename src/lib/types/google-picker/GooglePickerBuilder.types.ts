/* oxlint-disable typescript/no-misused-new -- External constructor. */
import type {
  GPicker,
  GPickerDocsUploadView,
  GPickerDocsView,
  GPickerViewGroup,
} from "./GooglePickerApi.types";
import type {
  GPickerLocales,
  GPickerResponseObject,
} from "./GooglePickerDocuments.types";
import type {
  GPickerDocument,
  GPickerFeature,
  GPickerViewId,
} from "./GooglePickerEnums";

/**
 * PickerBuilder is used to create Picker objects. Except where
 * noted otherwise, the return type of methods below is of type
 * PickerBuilder, allowing you to chain one call after another.
 *
 * API documentation here:
 * https://developers.google.com/workspace/drive/picker/reference/picker.picker
 */
export interface GPickerBuilder {
  new (): GPickerBuilder;

  /** Add a view to the navigation pane. */
  addView(
    viewOrViewId: GPickerDocsView | GPickerDocsUploadView | GPickerViewId,
  ): GPickerBuilder;

  /** Add a ViewGroup to the top-level navigation pane. */
  addViewGroup(viewGroup: GPickerViewGroup): GPickerBuilder;

  /** Construct the Picker object. */
  build(): GPicker;

  /** Disable a picker feature. */
  disableFeature(feature: GPickerFeature): GPickerBuilder;

  /** Enable a picker feature. */
  enableFeature(feature: GPickerFeature): GPickerBuilder;

  /**
   * Get the relay URL, used for gadgets.rpc.
   * @returns The relay URL string.
   */
  getRelayUrl(): string;

  /**
   * Get the dialog title.
   * @returns The dialog title string.
   */
  getTitle(): string;

  /**
   * Disable the title bar from being shown. To re-enable, call `setTitle`
   * with a non-empty title or `undefined`.
   * @returns The PickerBuilder instance (for chaining).
   */
  hideTitleBar(): GPickerBuilder;

  /**
   * Check if a picker `Feature` is enabled.
   * @param feature The feature to check.
   * @returns True if enabled, false otherwise.
   */
  isFeatureEnabled(feature: GPickerFeature): boolean;

  /**
   * Sets the Id of the application needing to access the user's files via
   * the Drive API.
   * @param appId The Cloud Project number.
   * @returns The PickerBuilder instance (for chaining).
   */
  setAppId(appId: string): GPickerBuilder;

  /**
   * Sets the callback method. This method is called when the user selects
   * items or cancels.
   * The callback method receives a single callback object. The structure
   * of the callback object is described in the [JSON Guide](https://developers.google.com/workspace/drive/picker/reference/picker.responseobject).
   * @param method The callback function.
   * @returns The PickerBuilder instance (for chaining).
   */
  setCallback(method: (result: GPickerResponseObject) => void): GPickerBuilder;

  /**
   * Sets the Browser API key obtained from Google Developers Console.
   * See the Developer's Guide for details on how to obtain the Browser
   * API key.
   * @param key The API key.
   * @returns The PickerBuilder instance (for chaining).
   */
  setDeveloperKey(key: string): GPickerBuilder;

  /**
   * Set the document.
   * @param document The document to set.
   * @returns The PickerBuilder instance (for chaining).
   */
  setDocument(document: GPickerDocument): GPickerBuilder;

  /**
   * Set the locale for the picker. The locale is an ISO 639 language code.
   * If the language is not supported, en-US is used.
   * @param locale The locale code.
   * @returns The PickerBuilder instance (for chaining).
   */
  setLocale(locale: GPickerLocales): GPickerBuilder;

  /**
   * Sets the maximum number of items a user can pick.
   * @param max The maximum number of items.
   * @returns The PickerBuilder instance (for chaining).
   */
  setMaxItems(max: number): GPickerBuilder;

  /**
   * Sets an OAuth token to use for authenticating the current user.
   * @param token The OAuth 2.0 token.
   * @returns The PickerBuilder instance (for chaining).
   */
  setOAuthToken(token: string): GPickerBuilder;

  /**
   * Sets the origin of picker dialog. The origin should be set to the
   * window.location.protocol + '//' + window.location.host of
   * the top-most page, if your application is running in an iframe.
   * @param origin The origin string.
   * @returns The PickerBuilder instance (for chaining).
   */
  setOrigin(origin: string): GPickerBuilder;

  /**
   * Set the relay URL, used for gadgets.rpc.
   * @param url The relay URL.
   * @returns The PickerBuilder instance (for chaining).
   */
  setRelayUrl(url: string): GPickerBuilder;

  /**
   * Set the list of MIME types which will be selectable. Use commas to
   * separate MIME types if more than one is required. If you don't set MIME
   * types, files of all MIME types are displayed in the view.
   * @param type The MIME types string.
   * @returns The PickerBuilder instance (for chaining).
   */
  setSelectableMimeTypes(type: string): GPickerBuilder;

  /**
   * Set the preferred dialog size. The dialog will be auto-centered.
   * It has a minimum size of (566,350) and a maximum size of (1051,650).
   * @param width The width in pixels.
   * @param height The height in pixels.
   * @returns The PickerBuilder instance (for chaining).
   */
  setSize(width: number, height: number): GPickerBuilder;

  /**
   * Set the dialog title.
   * @param title The title string.
   * @returns The PickerBuilder instance (for chaining).
   */
  setTitle(title: string): GPickerBuilder;

  /**
   * Returns the URI generated by this builder.
   * @returns The URI string.
   */
  toUri(): string;
}
