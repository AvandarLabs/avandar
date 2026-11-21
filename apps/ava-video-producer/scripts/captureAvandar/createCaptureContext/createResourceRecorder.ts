import { CaptureSanitization } from "../../captureLib/CaptureSanitization";
import { CaptureUrlSafety } from "../../captureLib/CaptureUrlSafety/CaptureUrlSafety";
import type {
  CaptureContext,
  CaptureRecorderState,
} from "./createCaptureContext.types";
/**
 * Creates the recorder behind `CaptureContext.recordResource`: it validates
 * and redacts a product resource a flow created, then records it in the
 * manifest. `createCaptureContext` builds one per run.
 */
export function createResourceRecorder(
  run: CaptureRecorderState,
): CaptureContext["recordResource"] {
  return async (flowId, { kind, id, name = "" }) => {
    CaptureUrlSafety.validateId({
      value: kind,
      name: "resource kind",
    });
    if (typeof id !== "string" || !/^[a-zA-Z0-9_-]{1,128}$/.test(id)) {
      throw new Error("Resource id must be a plain identifier");
    }
    const resource = {
      flowId,
      kind,
      id,
      name: CaptureSanitization.makeRedactedTextFromValue({
        value: name,
        secrets: run.secrets,
        limit: 160,
      }),
    };
    CaptureSanitization.assertSafeManifest({
      value: resource,
      secrets: run.secrets,
    });
    run.manifest.resources.push(resource);
    await run.persist();
    return resource;
  };
}
