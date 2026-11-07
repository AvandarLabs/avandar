import { readSocrataDomainMetadataValue } from "@pipelines/socrata/mappers/readSocrataDomainMetadataValue/readSocrataDomainMetadataValue";

const _DEPARTMENT_NAMES: ReadonlySet<string> = new Set([
  "department of health",
  "new york state department of health",
]);

function _isDepartmentName(value: unknown): boolean {
  return (
    typeof value === "string" &&
    _DEPARTMENT_NAMES.has(value.trim().toLowerCase())
  );
}

/**
 * Mapper script for the office or division inside a NY State department,
 * which health.data.ny.gov records in its custom metadata rather than in
 * `resource.attribution` (that names the department itself).
 *
 * Newer datasets list the office under `Dataset-Summary_Office/Division`.
 * Older ones list it under `Dataset-Summary_Organization` instead. The
 * office or division wins when both are present. An organization that names
 * the department itself ("New York State Department of Health") is not an
 * office, so it maps to nothing.
 */
export default function socrataOfficeDivision(record: unknown): unknown {
  const officeDivision = readSocrataDomainMetadataValue(record, [
    "Dataset-Summary_Office/Division",
  ]);
  if (officeDivision !== undefined) {
    return officeDivision;
  }
  const organization = readSocrataDomainMetadataValue(record, [
    "Dataset-Summary_Organization",
  ]);
  return _isDepartmentName(organization) ? undefined : organization;
}
