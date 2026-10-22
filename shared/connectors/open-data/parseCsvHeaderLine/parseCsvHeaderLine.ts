/**
 * Parses the first record of CSV text, following RFC 4180 quoting: a quoted
 * field may hold commas, line breaks, and doubled quotes.
 *
 * @param text - CSV text, of which only the first record is read.
 * @returns The first record's fields.
 */
export function parseCsvHeaderLine(text: string): string[] {
  const fields: string[] = [];
  let field = "";
  let isQuoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (isQuoted) {
      if (character === '"' && text[index + 1] === '"') {
        field += '"';
        index += 1;
      } else if (character === '"') {
        isQuoted = false;
      } else {
        field += character;
      }
    } else if (character === '"') {
      isQuoted = true;
    } else if (character === ",") {
      fields.push(field);
      field = "";
    } else if (character === "\n" || character === "\r") {
      break;
    } else {
      field += character;
    }
  }
  fields.push(field);
  return fields;
}
