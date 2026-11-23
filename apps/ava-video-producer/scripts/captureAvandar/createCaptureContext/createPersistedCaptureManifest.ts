import type { CaptureManifest } from "../captureAvandar.types";

function _getPersistedRecord({
  record,
  fields,
}: Readonly<{
  record: Readonly<Record<string, unknown>>;
  fields: readonly string[];
}>): Record<string, unknown> {
  return {
    ...record,
    ...Object.fromEntries(
      fields
        .filter((field) => {
          return Object.hasOwn(record, field);
        })
        .map((field) => {
          return [field, record[field] ?? null];
        }),
    ),
  };
}
function _getPersistedNetworkPolicy(
  manifest: Readonly<CaptureManifest>,
): Record<string, unknown> {
  const { networkPolicy } = manifest;
  return {
    ...networkPolicy,
    blockedRequests: networkPolicy.blockedRequests.map((record) => {
      return _getPersistedRecord({ record, fields: ["videoAtMs"] });
    }),
    suppressedRequests: networkPolicy.suppressedRequests.map((record) => {
      return _getPersistedRecord({ record, fields: ["videoAtMs"] });
    }),
  };
}
/**
 * Preserves version-one wire nulls while owned capture state uses undefined.
 */
export function createPersistedCaptureManifest(
  manifest: Readonly<CaptureManifest>,
): Record<string, unknown> {
  return {
    ...manifest,
    browser: _getPersistedRecord({
      record: manifest.browser,
      fields: ["version"],
    }),
    networkPolicy: _getPersistedNetworkPolicy(manifest),
    features: manifest.features.map((record) => {
      return _getPersistedRecord({
        record,
        fields: ["videoStartedAtMs", "videoEndedAtMs"],
      });
    }),
    actions: manifest.actions.map((record) => {
      return _getPersistedRecord({
        record,
        fields: ["videoStartedAtMs", "videoEndedAtMs"],
      });
    }),
    checkpoints: manifest.checkpoints.map((record) => {
      return _getPersistedRecord({ record, fields: ["videoAtMs"] });
    }),
    video: _getPersistedRecord({ record: manifest.video, fields: ["rawPath"] }),
  };
}
