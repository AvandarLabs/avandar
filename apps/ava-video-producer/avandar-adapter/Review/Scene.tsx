import { useCurrentFrame } from "remotion";
import { AvandarStage } from "../../src/avandar/generated/product.js";
import type { ProductFeature } from "../../src/avandar/generated/product.js";
import type { ReactNode } from "react";

/** One product feature, rendered at the player's current frame. */
export function Scene({ feature }: { feature: ProductFeature }): ReactNode {
  return (
    <AvandarStage
      feature={feature}
      frame={useCurrentFrame()}
      width={1600}
      height={840}
    />
  );
}
