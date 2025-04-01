export type MIMEType =
  // Text
  | "text/plain"
  | "text/html"
  | "text/css"
  | "text/javascript"
  | "text/csv"
  | "text/xml"
  | "text/markdown"

  // Application
  | "application/json"
  | "application/xml"
  | "application/javascript"
  | "application/ecmascript"
  | "application/x-www-form-urlencoded"
  | "application/pdf"
  | "application/zip"
  | "application/x-7z-compressed"
  | "application/gzip"
  | "application/vnd.rar"

  // MS Office
  | "application/msword"
  | "application/vnd.ms-excel"
  | "application/vnd.ms-powerpoint"
  | "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  | "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  | "application/vnd.openxmlformats-officedocument.presentationml.presentation"

  // Open Office / LibreOffice
  | "application/vnd.oasis.opendocument.text"
  | "application/vnd.oasis.opendocument.spreadsheet"
  | "application/vnd.oasis.opendocument.presentation"

  // Images
  | "image/jpeg"
  | "image/png"
  | "image/gif"
  | "image/webp"
  | "image/svg+xml"
  | "image/bmp"
  | "image/tiff"

  // Audio
  | "audio/mpeg"
  | "audio/ogg"
  | "audio/wav"
  | "audio/webm"

  // Video
  | "video/mp4"
  | "video/webm"
  | "video/ogg"
  | "video/x-msvideo"

  // Fonts
  | "font/ttf"
  | "font/otf"
  | "font/woff"
  | "font/woff2";
