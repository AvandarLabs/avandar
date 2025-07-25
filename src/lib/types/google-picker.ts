/* eslint-disable @typescript-eslint/no-misused-new */
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
 * PickerBuilder is used to create Picker objects. Except where
 * noted otherwise, the return type of methods below is of type
 * PickerBuilder, allowing you to chain one call after another.
 *
 * API documentation here:
 * https://developers.google.com/workspace/drive/picker/reference/picker.picker
 */
export interface GPickerBuilder {
  new (): GPickerBuilder;

  /**
   * Add a view to the navigation pane.
   */
  addView(
    viewOrViewId: GPickerDocsView | GPickerDocsUploadView | GPickerViewId,
  ): GPickerBuilder;

  /**
   * Add a ViewGroup to the top-level navigation pane.
   */
  addViewGroup(viewGroup: GPickerViewGroup): GPickerBuilder;

  /**
   * Construct the Picker object.
   */
  build(): GPicker;

  /**
   * Disable a picker feature.
   */
  disableFeature(feature: GPickerFeature): GPickerBuilder;

  /**
   * Enable a picker feature.
   */
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

/**
 * The action type for the ResponseObject.
 *
 * API documentation here:
 * https://developers.google.com/workspace/drive/picker/reference/picker.action
 */
export enum GPickerAction {
  /** User canceled the Google Picker dialog.  */
  CANCEL = "cancel",
  /** User has chosen at least one item. */
  PICKED = "picked",
  /** The Google Picker dialog has encountered an error. */
  ERROR = "error",
}

/**
 * Audience is an export enumerated type used to describe the audience of the
 * DocumentObject.
 *
 * API documentation here:
 * https://developers.google.com/workspace/drive/picker/reference/picker.audience
 */
export enum GPickerAudience {
  LIMITED = "limited",
  DOMAIN_PUBLIC = "domainPublic",
  PUBLIC = "public",
  OWNER_ONLY = "ownerOnly",
}

/**
 * DocsViewMode is an export enumerated type for displaying data within a
 * DocsView.
 * Use these values in calls to DocsView.setMode.
 * If using a scope other than https://www.googleapis.com/auth/drive
 * or https://www.googleapis.com/auth/drive.readonly, it is recommended
 * to use DocsViewMode.LIST as the user has not granted access to
 * thumbnails.
 *
 * API documentation here:
 * https://developers.google.com/workspace/drive/picker/reference/picker.docsviewmode
 */
export enum GPickerDocsViewMode {
  /** Display documents in a thumbnail grid. */
  GRID = "grid",
  /** Display documents in a detailed list. */
  LIST = "list",
}

/**
 * Document is an export enumerated type used to describe the fields of a
 * DocumentObject.
 *
 * API documentation here:
 * https://developers.google.com/workspace/drive/picker/reference/picker.document
 */
export enum GPickerDocument {
  ADDRESS_LINES = "addressLines",
  AUDIENCE = "audience",
  DESCRIPTION = "description",
  DURATION = "duration",
  EMBEDDABLE_URL = "embedUrl",
  ICON_URL = "iconUrl",
  ID = "id",
  IS_NEW = "isNew",
  LAST_EDITED_UTC = "lastEditedUtc",
  LATITUDE = "latitude",
  LONGITUDE = "longitude",
  MIME_TYPE = "mimeType",
  NAME = "name",
  NUM_CHILDREN = "numChildren",
  PARENT_ID = "parentId",
  PHONE_NUMBERS = "phonexport enumbers",
  READ_ONLY = "readOnly",
  SERVICE_ID = "serviceId",
  THUMBNAILS = "thumbnails",
  TYPE = "type",
  URL = "url",
  VERSION = "version",
}

/**
 * Feature is an export enumerated type, for turning on/off features for various
 * views. Use these values in calls to PickerBuilder.enableFeature and
 * PickerBuilder.disableFeature.
 *
 * API documentation here:
 * https://developers.google.com/workspace/drive/picker/reference/picker.feature
 */
export enum GPickerFeature {
  /**
   * Show only documents owned by the user when showing items from Google
   * Drive.
   */
  MINE_ONLY = "mineOnly",

  /**
   * Allow user to choose more than one item.
   */
  MULTISELECT_ENABLED = "multiselectEnabled",

  /**
   * Hide the navigation pane. If the navigation pane is hidden, users can
   * only select from the first view chosen.
   */
  NAV_HIDDEN = "navHidden",

  /**
   * For photo uploads, controls whether per-photo DocumentObject (as
   * opposed to per-album) DocumentObject is enabled.
   */
  SIMPLE_UPLOAD_ENABLED = "simpleUploadEnabled",
}

/**
 * Response is an export enumerated type used to describe the fields of
 * a ResponseObject.
 *
 * API documentation here:
 * https://developers.google.com/workspace/drive/picker/reference/picker.response
 */
export enum GPickerResponse {
  ACTION = "action",
  DOCUMENTS = "docs",
  PARENTS = "parents",
  VIEW = "viewToken",
}

/**
 * ServiceId is an export enumerated type used to describe the service the
 * item was selected from.
 *
 * API documentation here:
 * https://developers.google.com/workspace/drive/picker/reference/picker.serviceid
 */
export enum GPickerServiceId {
  DOCS = "docs",
}

/**
 * Thumbnail is an export enumerated type used to describe the fields of
 * a ThumbnailObject.
 *
 * API documentation here:
 * https://developers.google.com/workspace/drive/picker/reference/picker.thumbnail
 */
export enum GPickerThumbnail {
  TYPE = "type",
  URL = "url",
  HEIGHT = "height",
  WIDTH = "width",
}

/**
 * The type of the selected item.
 *
 * API documentation here:
 * https://developers.google.com/workspace/drive/picker/reference/picker.type
 */
export enum GPickerType {
  DOCUMENT = "document",
  PHOTO = "photo",
  VIDEO = "video",
}

/**
 * ViewId is an export enumerated type for the various views available in
 * the Picker. Use these values in calls to DocsView and PickerBuilder.
 *
 * API documentation here:
 * https://developers.google.com/workspace/drive/picker/reference/picker.viewid
 */
export enum GPickerViewId {
  /** All Google Drive document types. */
  DOCS = "all",
  /** Google Drive photos. */
  DOCS_IMAGES = "docs-images",
  /** Google Drive photos and videos. */
  DOCS_IMAGES_AND_VIDEOS = "docs-images-and-videos",
  /** Google Drive videos. */
  DOCS_VIDEOS = "docs-videos",
  /** Google Drive Documents. */
  DOCUMENTS = "documents",
  /** Google Drive Drawings. */
  DRAWINGS = "drawings",
  /** Google Drive Folders. */
  FOLDERS = "folders",
  /** Google Drive Forms. */
  FORMS = "forms",
  /** PDF files stored in Google Drive. */
  PDFS = "pdfs",
  /** Google Drive Presentations. */
  PRESENTATIONS = "presentations",
  /** Google Drive Spreadsheets. */
  SPREADSHEETS = "spreadsheets",
}

/**
 * ViewToken is an export enumerated type used to describe the elements of
 * a ResponseObject.viewToken.
 *
 * API documentation here:
 * https://developers.google.com/workspace/drive/picker/reference/picker.viewtoken
 */
export enum GPickerViewToken {
  VIEW_ID = 0,
  LABEL = 1,
  VIEW_OPTIONS = 2,
}

/**
 * DocumentObject is an interface describing the attributes of a selected
 * item.
 *
 * API documentation here:
 * https://developers.google.com/workspace/drive/picker/reference/picker.documentobject
 */
export interface GPickerDocumentObject {
  /** A user-contributed description of the selected item. */
  [GPickerDocument.DESCRIPTION]?: string;

  /** A URL to download this item. */
  downloadUrl?: string;

  /**
   * The error code for the request to pre-open the document
   * in Google Drive.
   */
  driveError?: string;

  /**
   * Whether the request to pre-open the document in Google Drive
   * was successful.
   */
  driveSuccess?: boolean;

  /** The duration of a selected video. */
  [GPickerDocument.DURATION]?: number;

  /** A URL for this item suitable for embedding in a web page. */
  [GPickerDocument.EMBEDDABLE_URL]?: string;

  /** A URL to an icon for this item. */
  [GPickerDocument.ICON_URL]?: string;

  /** The ID for the selected item. */
  id: string;

  /** Returns true if the selected item was just uploaded. */
  [GPickerDocument.IS_NEW]?: boolean;

  /** Whether the item is shared. */
  isShared?: boolean;

  /** The timestamp describing when this item was last edited. */
  [GPickerDocument.LAST_EDITED_UTC]?: number;

  /** The latitude of the selected item. */
  [GPickerDocument.LATITUDE]?: number;

  /** The longitude of the selected item. */
  [GPickerDocument.LONGITUDE]?: number;

  /** The MIME type of this item. */
  [GPickerDocument.MIME_TYPE]?: string;

  /** The name of this item. */
  [GPickerDocument.NAME]?: string;

  /** Display name for the owning organization. */
  organizationDisplayName?: string;

  /**
   * The parent ID of this item. For example, the folder containing
   * this file.
   */
  [GPickerDocument.PARENT_ID]?: string;

  /** The phone numbers of the selected item. */
  [GPickerDocument.PHONE_NUMBERS]?: Array<{ type: string; number: string }>;

  /** The resource key for the item, if present. Empty string otherwise */
  resourceKey?: string;

  /**	An id describing the service this item was selected from. */
  [GPickerDocument.SERVICE_ID]?: string;

  /**
   * Size of the picked item in bytes. The value is not returned when the
   * item is uploaded during the Picker session.
   */
  sizeBytes?: number;

  /**
   * An array of Thumbnails which describe the attributes of a
   * photo or video. Thumbnails aren't returned if the selected items
   * belong to Google Drive.
   */
  [GPickerDocument.THUMBNAILS]?: GPickerThumbnailObject[];

  /** The type of the selected item. */
  [GPickerDocument.TYPE]?: string;

  /** The item order in the upload session. */
  uploadId?: string;

  /** The state of the upload. */
  uploadState?: string;

  /** 	A URL to this item. */
  [GPickerDocument.URL]?: string;
}

/**
 * The response object passed to the callback method.
 *
 * API documentation here:
 * https://developers.google.com/workspace/drive/picker/reference/picker.responseobject
 */
export interface GPickerResponseObject {
  /**
   * A type representing the action taken by the user to dismiss the dialog.
   */
  action: GPickerAction | string;

  /** An array of DocumentObjects selected by the user. */
  [GPickerResponse.DOCUMENTS]?: GPickerDocumentObject[];

  /** The parent folders for the selected items. */
  [GPickerResponse.PARENTS]?: GPickerParentDocumentObject[];

  /** The view the user selected these items from. */
  [GPickerResponse.VIEW]?: [
    viewId: string,
    label: string | null,
    viewOptions: unknown,
  ];
}

/**
 * ThumbnailObject is an interface describing the attributes of a photo
 * or video.
 *
 * API documentation here:
 * https://developers.google.com/workspace/drive/picker/reference/picker.thumbnailobject
 */
export interface GPickerThumbnailObject {
  height: number;
  type: string;
  url: string;
  width: number;
}

/**
 * The supported ISO 639 language codes for PickerBuilder.setLocale.
 */
export type GPickerLocales =
  | "af"
  | "am"
  | "ar"
  | "bg"
  | "bn"
  | "ca"
  | "cs"
  | "da"
  | "de"
  | "el"
  | "en"
  | "en-GB"
  | "es"
  | "es-419"
  | "et"
  | "eu"
  | "fa"
  | "fi"
  | "fil"
  | "fr"
  | "fr-CA"
  | "gl"
  | "gu"
  | "hi"
  | "hr"
  | "hu"
  | "id"
  | "is"
  | "it"
  | "iw"
  | "ja"
  | "kn"
  | "ko"
  | "lt"
  | "lv"
  | "ml"
  | "mr"
  | "ms"
  | "nl"
  | "no"
  | "pl"
  | "pt-BR"
  | "pt-PT"
  | "ro"
  | "ru"
  | "sk"
  | "sl"
  | "sr"
  | "sv"
  | "sw"
  | "ta"
  | "te"
  | "th"
  | "tr"
  | "uk"
  | "ur"
  | "vi"
  | "zh-CN"
  | "zh-HK"
  | "zh-TW"
  | "zu";

/**
 * ParentDocumentObject is an interface describing the attributes of a
 * parent folder for a selected item.
 */
export type GPickerParentDocumentObject = Pick<
  GPickerDocumentObject,
  | GPickerDocument.DESCRIPTION
  | GPickerDocument.LAST_EDITED_UTC
  | GPickerDocument.MIME_TYPE
  | GPickerDocument.NAME
  | GPickerDocument.ICON_URL
  | GPickerDocument.ID
  | GPickerDocument.IS_NEW
  | GPickerDocument.SERVICE_ID
  | GPickerDocument.THUMBNAILS
  | GPickerDocument.TYPE
  | GPickerDocument.URL
>;
