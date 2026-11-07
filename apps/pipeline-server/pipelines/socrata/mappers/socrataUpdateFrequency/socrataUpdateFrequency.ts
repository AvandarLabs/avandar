import { readSocrataDomainMetadataValue } from "@pipelines/socrata/mappers/readSocrataDomainMetadataValue/readSocrataDomainMetadataValue";

/** NYC's key, then the NY State portals'. */
const UPDATE_FREQUENCY_KEYS = [
  "Update_Update-Frequency",
  "Dataset-Summary_Posting-Frequency",
];

/** Mapper script for `update_frequency`, such as `Daily` or `Monthly`. */
export default function socrataUpdateFrequency(record: unknown): unknown {
  return readSocrataDomainMetadataValue(record, UPDATE_FREQUENCY_KEYS);
}
