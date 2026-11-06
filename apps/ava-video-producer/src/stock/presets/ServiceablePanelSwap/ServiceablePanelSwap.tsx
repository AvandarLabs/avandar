import { type GraphicProps } from "../../graphics-common";
import { getServiceSceneFromFrame } from "./getServiceSceneFromFrame";
import { ServiceCaptions } from "./ServiceCaptions";
import { ServiceEnclosure } from "./ServiceEnclosure";
import { ServiceModule } from "./ServiceModule";
import { ServiceWorker } from "./ServiceWorker";
import type { Input } from "./ServiceablePanelSwap.schema";
import type { ReactNode } from "react";
/** Inputs for ServiceablePanelSwap. */
type Props = GraphicProps & { input: Input };

/** A worker services one opening without moving any unaffected module. */
export function ServiceablePanelSwap({
  frame,
  input,
  accent,
}: Readonly<Props>): ReactNode {
  const scene = getServiceSceneFromFrame({ frame, input });
  return (
    <g>
      <ServiceCaptions input={input} frame={frame} />
      <ServiceEnclosure input={input} scene={scene} />
      {input.modules.map((module, index) => (
        <ServiceModule
          key={module.id}
          module={module}
          x={index === scene.targetIndex ? scene.original.x : 180 + index * 170}
          y={index === scene.targetIndex ? scene.original.y : 235}
          isRemoved={index === scene.targetIndex && frame >= 94}
          accent={accent}
        />
      ))}
      <ServiceModule
        module={input.replacement}
        x={scene.replacement.x}
        y={scene.replacement.y}
        isReplacement
        accent={accent}
      />
      <ServiceWorker hand={scene.hand} />
    </g>
  );
}
