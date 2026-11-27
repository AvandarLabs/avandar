import type {
  GPickerAction,
  GPickerDocument,
  GPickerResponse,
} from "./GooglePickerEnums";

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
  /** A type representing the action taken by the user to dismiss the dialog. */
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

/** The supported ISO 639 language codes for PickerBuilder.setLocale. */
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
