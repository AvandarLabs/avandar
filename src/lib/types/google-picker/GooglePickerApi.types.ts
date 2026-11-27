import type { GPickerBuilder } from "./GooglePickerBuilder.types";
import type {
  GPickerDocumentObject,
  GPickerResponseObject,
} from "./GooglePickerDocuments.types";
import type {
  GPickerAction,
  GPickerAudience,
  GPickerDocsViewMode,
  GPickerDocument,
  GPickerFeature,
  GPickerResponse,
  GPickerServiceId,
  GPickerThumbnail,
  GPickerType,
  GPickerViewId,
  GPickerViewToken,
} from "./GooglePickerEnums";

/* oxlint-disable typescript/no-misused-new */
/**
 * The TypeScript types were transcribed from the API documentation
 * available here:
 * https://developers.google.com/workspace/drive/picker/reference/picker
 */
export interface GooglePickerAPI {
  // classes
  DocsUploadView: GPickerDocsUploadView;
  DocsView: GPickerDocsView;
  ResourceId: GPickerResourceId;
  PickerBuilder: GPickerBuilder;
  Picker: GPicker;
  View: GPickerView;
  ViewGroup: GPickerViewGroup;

  // enums
  Action: typeof GPickerAction;
  Audience: typeof GPickerAudience;
  DocsViewMode: typeof GPickerDocsViewMode;
  Document: typeof GPickerDocument;
  Feature: typeof GPickerFeature;
  Response: typeof GPickerResponse;
  ServiceId: typeof GPickerServiceId;
  Thumbnail: typeof GPickerThumbnail;
  Type: typeof GPickerType;
  ViewId: typeof GPickerViewId;
  ViewToken: typeof GPickerViewToken;
}

/**
 * Use DocsUploadView to upload files to Google Drive.
 *
 * API documentation here:
 * https://developers.google.com/workspace/drive/picker/reference/picker.docsuploadview
 */
export interface GPickerDocsUploadView {
  new (): GPickerBuilder;

  /**
   * Allows the user to select a folder in Google Drive to upload to.
   * @param included If true, folders can be selected for upload.
   * @returns The DocsUploadView instance (for chaining).
   */
  setIncludeFolders(included: boolean): GPickerDocsUploadView;

  /**
   * Sets the upload destination to the specified folder. This overrides
   * setIncludeFolders to false.
   * @param parentId The ID of the parent folder.
   * @returns The DocsUploadView instance (for chaining).
   */
  setParent(parentId: string): GPickerDocsUploadView;
}

/**
 * Use DocsView to select files from Google Drive.
 *
 * API documentation here:
 * https://developers.google.com/workspace/drive/picker/reference/picker.docsview
 */
export interface GPickerDocsView {
  new (): GPickerBuilder;

  /**
   * Constructs a new instance of the DocsView export interface.
   * @param viewId The ViewId for the view.
   */
  new (viewId: GPickerViewId): GPickerDocsView;

  /** Returns the ViewId of the view. */
  getId(): GPickerViewId;

  /**
   * Shows shared drives and the files they contain. Before enabling, refer to
   * [GoogleDrive API documentation for enabling shared drives.](https://developers.google.com/workspace/drive/api/guides/enable-shareddrives)
   * @param enabled If true, shared drives are shown.
   * @returns The DocsView instance (for chaining).
   */
  setEnableDrives(enabled: boolean): GPickerDocsView;

  /**
   * Sets the file IDs included in the view.
   * @param fileIds Comma-separated file IDs.
   * @returns The DocsView instance (for chaining).
   */
  setFileIds(fileIds: string): GPickerDocsView;

  /**
   * Show folders in the view items.
   * @param included If true, folders are shown.
   * @returns The DocsView instance (for chaining).
   */
  setIncludeFolders(included: boolean): GPickerDocsView;

  /**
   * Sets the text of the view's navigation tab, overriding the label Google
   * derives from the view's own options. Also becomes
   * `ResponseObject.viewToken[GPickerViewToken.LABEL]`.
   *
   * Inherited from `View` rather than declared on `DocsView`, and typed here as
   * returning a `GPickerDocsView` (the real method returns `this`) so it can
   * sit anywhere in a `DocsView` chain.
   *
   * @param label The tab label.
   * @returns The DocsView instance (for chaining).
   */
  setLabel(label: string): GPickerDocsView;

  /**
   * Sets the MIME types included in the view. Use commas to separate types.
   * If not set, all MIME types are displayed.
   * @param mimeTypes Comma-separated MIME types.
   * @returns The DocsView instance (for chaining).
   */
  setMimeTypes(mimeTypes: string): GPickerDocsView;

  /**
   * Selects which mode the view will use to display the documents.
   * @param mode The DocsViewMode to use.
   * @returns The DocsView instance (for chaining).
   */
  setMode(mode: GPickerDocsViewMode): GPickerDocsView;

  /**
   * Filters the documents based on whether they are owned by the user.
   * @param me If true, only files owned by the user are shown.
   * @returns The DocsView instance (for chaining).
   */
  setOwnedByMe(me: boolean): GPickerDocsView;

  /**
   * Sets the initial parent folder to display.
   * @param parentId The ID of the parent folder.
   * @returns The View instance (for chaining).
   */
  setParent(parentId: string): GPickerView;

  /**
   * For views involving searches, prepopulate the search query with these
   * terms.
   * @param query The search query string.
   * @returns The View instance (for chaining).
   */
  setQuery(query: string): GPickerView;

  /**
   * Allows the user to select a folder in Google Drive.
   * @param enabled If true, folders can be selected.
   * @returns The DocsView instance (for chaining).
   */
  setSelectFolderEnabled(enabled: boolean): GPickerDocsView;

  /**
   * Filters the documents based on whether they are starred by the user.
   * @param starred If true, only starred files are shown.
   * @returns The DocsView instance (for chaining).
   */
  setStarred(starred: boolean): GPickerDocsView;
}

/**
 * ResourceId is a utility export interface for generating resource IDs
 * for documents.
 *
 * API documentation here:
 * https://developers.google.com/workspace/drive/picker/reference/picker.resourceid
 */
export interface GPickerResourceId {
  new (): GPickerBuilder;

  /**
   * Generate a resource ID for a document.
   * @param document The document to generate a resource ID for.
   */
  generate(document: GPickerDocumentObject): string;
}

/**
 * Picker is the top level object representing the UI action with the user.
 * These objects are not created directly, but instead use the PickerBuilder
 * export interface.
 *
 * API documentation here:
 * https://developers.google.com/workspace/drive/picker/reference/picker.picker
 */
export interface GPicker {
  new (): GPickerBuilder;

  /**
   * Disposes the Picker object.
   * Use this to clean up resources when the Picker is no longer needed.
   */
  dispose(): void;

  /**
   * Get a boolean indicating the current Picker visibility.
   * @returns True if the Picker is visible, false otherwise.
   */
  isVisible(): boolean;

  /**
   * Specify the callback method called whenever the user has selected
   * an item or canceled. The callback receives a ResponseObject.
   * @param method The callback function.
   * @returns The Picker instance (for chaining).
   */
  setCallback(method: (response: GPickerResponseObject) => void): GPicker;

  /**
   * Specify a relay URL to circumvent cross-domain issues.
   * @param url The relay URL.
   * @returns The Picker instance (for chaining).
   */
  setRelayUrl(url: string): GPicker;

  /**
   * Control the visibility of the Picker object.
   * @param visible If true, show the Picker; if false, hide it.
   * @returns The Picker instance (for chaining).
   */
  setVisible(visible: boolean): GPicker;
}

/**
 * An abstract export interface for all views.
 *
 * API documentation here:
 * https://developers.google.com/workspace/drive/picker/reference/picker.view
 */
export interface GPickerView {
  new (): GPickerBuilder;

  /**
   * Returns the ViewId of the view.
   * @returns The ViewId of the view.
   */
  getId(): GPickerViewId;

  /**
   * Sets the MIME types included in the view. Use commas to separate
   * MIME types if more than one is required. If not set, all MIME types
   * are displayed.
   * @param mimeTypes Comma-separated MIME types.
   * @returns The DocsView instance (for chaining).
   */
  setMimeTypes(mimeTypes: string): GPickerDocsView;

  /**
   * For views involving searches, prepopulate the search query with these
   * terms.
   * @param query The search query string.
   * @returns The View instance (for chaining).
   */
  setQuery(query: string): GPickerView;
}

/**
 * A ViewGroup is a visual grouping of views in the navigation pane.
 *
 * API documentation here:
 * https://developers.google.com/workspace/drive/picker/reference/picker.viewgroup
 */
export interface GPickerViewGroup {
  new (): GPickerBuilder;

  /**
   * Constructs a new instance of the ViewGroup export interface
   * @param viewOrId The root item of the ViewGroup itself must be view.
   * @returns The ViewGroup instance.
   */
  new (viewOrId: GPickerDocsView | GPickerViewId): GPickerViewGroup;

  /**
   * Add a label to this ViewGroup.
   * @param label The label string.
   * @returns The ViewGroup instance (for chaining).
   */
  addLabel(label: string): GPickerViewGroup;

  /**
   * Add a view to the ViewGroup. The view can be a view-derived object
   * or a ViewId.
   * @param viewOrId The view or ViewId to add.
   * @returns The ViewGroup instance (for chaining).
   */
  addView(viewOrId: GPickerDocsView | GPickerViewId): GPickerViewGroup;

  /**
   * Nest a ViewGroup within the current ViewGroup.
   * @param viewGroup The ViewGroup to nest.
   * @returns The ViewGroup instance (for chaining).
   */
  addViewGroup(viewGroup: GPickerViewGroup): GPickerViewGroup;
}

export type { GPickerBuilder } from "./GooglePickerBuilder.types";
