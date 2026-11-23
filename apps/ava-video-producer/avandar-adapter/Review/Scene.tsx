import { useCurrentFrame } from "remotion";
import { AvandarStage } from "../../src/avandar/generated/product";
import type { ProductFeature } from "../../src/avandar/generated/product";
import type { ReactNode } from "react";

type Props = { feature: ProductFeature };

/** One product feature, rendered at the player's current frame. */
export function Scene({ feature }: Readonly<Props>): ReactNode {
  return (
    <AvandarStage
      feature={feature}
      frame={useCurrentFrame()}
      width={1600}
      height={840}
    />
  );
}
