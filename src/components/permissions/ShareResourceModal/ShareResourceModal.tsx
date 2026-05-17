import { isShareModalV2Enabled } from "@/utils/featureFlags";
import { ShareResourceModalV1 } from "./ShareResourceModalV1";
import { ShareResourceModalV2 } from "./ShareResourceModalV2";
import type { ResourceType } from "@/clients/permissions/ResourceShareClient";

type Props = {
  resourceName: string;
  resourceType: ResourceType;
  resourceId: string;
  onClose: () => void;
};

/**
 * Drive-style sharing dialog for one dashboard or dataset. When the
 * `SHARE_MODAL_V2` feature flag is OFF, this is a thin pass-through to
 * the legacy four-mechanism modal preserved at `ShareResourceModalV1`.
 * When the flag is ON, it renders the new Drive-style layout from
 * `ShareResourceModalV2`.
 */
export function ShareResourceModal(props: Props): JSX.Element {
  if (!isShareModalV2Enabled()) {
    return <ShareResourceModalV1 {...props} />;
  }
  return <ShareResourceModalV2 {...props} />;
}
