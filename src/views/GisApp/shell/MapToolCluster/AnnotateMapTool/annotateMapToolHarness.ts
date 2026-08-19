/**
 * Shared map-tool fakes and pointer helpers for AnnotateMapTool tests.
 */
import { fireEvent, screen } from "@/test-utils";

export {
  createFakeMap,
  emitTargetPointer,
  emitWindowPointer,
} from "@/views/GisApp/shell/MapToolCluster/createFakeMap";

export async function openAnnotateSubCluster(): Promise<void> {
  fireEvent.click(screen.getByRole("button", { name: "Annotate the map" }));
  await screen.findByRole("button", { name: "Place text" });
}
