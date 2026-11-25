import type { FetchRowsResult } from "@avandar/plugin-sdk";

/**
 * What reading the plugin's `cases` data slot produced, as kept by
 * `useCaseSlotRows` and shown by `CaseEpicurveModal`.
 *
 * - `loading`: the cases are being read.
 * - `notBound`: no one has chosen the case records the slot reads yet.
 * - `broken`: the chosen case records no longer fit the slot.
 * - `failed`: the cases could not be read, with the translated reason.
 * - `loaded`: each case's `onsetDate` and `district`. `isTruncated` is true
 *   when the slot holds more cases than were read.
 */
export type CaseSlotState =
  | Readonly<{ kind: "loading" }>
  | Readonly<{ kind: "notBound" }>
  | Readonly<{ kind: "broken" }>
  | Readonly<{ kind: "failed"; message: string }>
  | Readonly<{
      kind: "loaded";
      rows: FetchRowsResult["rows"];
      isTruncated: boolean;
    }>;
