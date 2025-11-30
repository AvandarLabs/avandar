export type UUID<B extends string = never> =
  [B] extends [never] ? Brand<string, "UUID"> : Brand<string, `${B}UUID`>;

export type UnknownObject = Record<PropertyKey, unknown>;

/**
 * Raw Cell Values are *always* strings. This represents the type of
 * data you'd find in a plaintext file where only strings are allowed.
 * This is the type of value you'd find in a CSV.
 *
 * Empty values are represented as empty strings, not null or undefined.
 */
export type RawCellValue = string;

/**
 * The standard representation of a row of raw data. It is a
 * record of strings (representing the fields) to RawCellValue.
 *
 * This is the most convenient and common way of representing raw
 * data, such as a parsed CSV row. However, it is not very memory
 * efficient, because each row contains the field names as keys.
 */
export type RawDataRow = Record<string, RawCellValue>;

/**
 * A row of data represented as an array of RawCellValue.
 * This is a less convenient but more memory-efficient representation of data,
 * rather than using records. It does not contain information about the
 * field names, it only contains the cell values.
 *
 * The Google Sheets API, for example, returns data rows in this format.
 */
export type RawDataArrayRow = RawCellValue[];

export type JSONLiteral = string | number | boolean | null;

/** A dataframe with unknown data in row format. */
export type UnknownDataFrame = Array<Record<string, unknown>>;

/**
 * Matches any valid JSON value
 */
export type JSONValue =
  | JSONLiteral
  | { [key: string]: JSONValue }
  | JSONValue[];

/**
 * Enum of supported MIME types.
 */
export enum MIMEType {
  // Text
  TEXT_PLAIN = "text/plain",
  TEXT_HTML = "text/html",
  TEXT_CSS = "text/css",
  TEXT_JAVASCRIPT = "text/javascript",
  TEXT_CSV = "text/csv",
  TEXT_XML = "text/xml",
  TEXT_MARKDOWN = "text/markdown",

  // Application
  APPLICATION_JSON = "application/json",
  APPLICATION_XML = "application/xml",
  APPLICATION_JAVASCRIPT = "application/javascript",
  APPLICATION_ECMASCRIPT = "application/ecmascript",
  APPLICATION_X_WWW_FORM_URLENCODED = "application/x-www-form-urlencoded",
  APPLICATION_PDF = "application/pdf",
  APPLICATION_ZIP = "application/zip",
  APPLICATION_X_7Z_COMPRESSED = "application/x-7z-compressed",
  APPLICATION_GZIP = "application/gzip",
  APPLICATION_VND_RAR = "application/vnd.rar",
  APPLICATION_PARQUET = "application/vnd.apache.parquet",

  // MS Office
  APPLICATION_MS_WORD = "application/msword",
  APPLICATION_MS_EXCEL = "application/vnd.ms-excel",
  APPLICATION_MS_POWERPOINT = "application/vnd.ms-powerpoint",
  APPLICATION_OPENXML_WORD = "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  APPLICATION_OPENXML_EXCEL = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  APPLICATION_OPENXML_POWERPOINT = "application/vnd.openxmlformats-officedocument.presentationml.presentation",

  // Open Office / LibreOffice
  APPLICATION_OASIS_ODT = "application/vnd.oasis.opendocument.text",
  APPLICATION_OASIS_ODS = "application/vnd.oasis.opendocument.spreadsheet",
  APPLICATION_OASIS_ODP = "application/vnd.oasis.opendocument.presentation",

  // Google Sheets
  APPLICATION_GOOGLE_AUDIO = "application/vnd.google-apps.audio",
  APPLICATION_GOOGLE_DOCUMENT = "application/vnd.google-apps.document",
  APPLICATION_GOOGLE_DRIVE_SDK = "application/vnd.google-apps.drive-sdk",
  APPLICATION_GOOGLE_DRAWING = "application/vnd.google-apps.drawing",
  APPLICATION_GOOGLE_FILE = "application/vnd.google-apps.file",
  APPLICATION_GOOGLE_FOLDER = "application/vnd.google-apps.folder",
  APPLICATION_GOOGLE_FORM = "application/vnd.google-apps.form",
  APPLICATION_GOOGLE_FUSIONTABLE = "application/vnd.google-apps.fusiontable",
  APPLICATION_GOOGLE_JAM = "application/vnd.google-apps.jam",
  APPLICATION_GOOGLE_MAIL_LAYOUT = "application/vnd.google-apps.mail-layout",
  APPLICATION_GOOGLE_MAP = "application/vnd.google-apps.map",
  APPLICATION_GOOGLE_PHOTO = "application/vnd.google-apps.photo",
  APPLICATION_GOOGLE_PRESENTATION = "application/vnd.google-apps.presentation",
  APPLICATION_GOOGLE_SCRIPT = "application/vnd.google-apps.script",
  APPLICATION_GOOGLE_SHORTCUT = "application/vnd.google-apps.shortcut",
  APPLICATION_GOOGLE_SITE = "application/vnd.google-apps.site",
  APPLICATION_GOOGLE_SPREADSHEET = "application/vnd.google-apps.spreadsheet",
  APPLICATION_GOOGLE_UNKNOWN = "application/vnd.google-apps.unknown",
  APPLICATION_GOOGLE_VID = "application/vnd.google-apps.vid",
  APPLICATION_GOOGLE_VIDEO = "application/vnd.google-apps.video",

  // Images
  IMAGE_JPEG = "image/jpeg",
  IMAGE_PNG = "image/png",
  IMAGE_GIF = "image/gif",
  IMAGE_WEBP = "image/webp",
  IMAGE_SVG_XML = "image/svg+xml",
  IMAGE_BMP = "image/bmp",
  IMAGE_TIFF = "image/tiff",

  // Audio
  AUDIO_MPEG = "audio/mpeg",
  AUDIO_OGG = "audio/ogg",
  AUDIO_WAV = "audio/wav",
  AUDIO_WEBM = "audio/webm",

  // Video
  VIDEO_MP4 = "video/mp4",
  VIDEO_WEBM = "video/webm",
  VIDEO_OGG = "video/ogg",
  VIDEO_X_MSVIDEO = "video/x-msvideo",

  // Fonts
  FONT_TTF = "font/ttf",
  FONT_OTF = "font/otf",
  FONT_WOFF = "font/woff",
  FONT_WOFF2 = "font/woff2",
} /**
 * A type that can be used to create a branded type.
 */

export type Brand<T, B extends string> = T & { __brand: B };
