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

  /** Allow user to choose more than one item. */
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
