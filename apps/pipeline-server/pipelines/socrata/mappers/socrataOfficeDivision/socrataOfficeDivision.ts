import { readSocrataDomainMetadataValue } from "@pipelines/socrata/mappers/readSocrataDomainMetadataValue/readSocrataDomainMetadataValue";

/**
 * Mapper script for the office or division inside a NY State department,
 * which health.data.ny.gov records in its custom metadata rather than in
 * `resource.attribution` (that names the department itself).
 */
export default function socrataOfficeDivision(record: unknown): unknown {
  return readSocrataDomainMetadataValue(record, [
    "Dataset-Summary_Office/Division",
  ]);
}
