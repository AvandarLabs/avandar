import { SketchedShape } from "../../../primitives/SketchedShape";
import type { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { Input } from "../ExpertiseRoleExchange.schema";
import type { ReactNode } from "react";

type ParentProps = {
  input: Input;
  frame: number;
  accent: string;
  toolX: number;
};

type Props = {
  accent: Readonly<ParentProps>["accent"];
  toolX: Readonly<ParentProps>["toolX"];
  tokens: ReturnType<typeof GraphicThemeHooks.useGraphicTokens>;
  toolWidth: number;
  topic: Readonly<ParentProps>["input"]["topics"][number];
  demonstration: number;
};

/** Renders the demonstration tool in authored paint order. */
export function DemonstrationTool(options: Readonly<Props>): ReactNode {
  return (
    <>
      {options.topic.demonstration === "fold-guide" ? (
        <SketchedShape
          shape={{
            kind: "path",
            d: `M${options.toolX} 325 l${45 * options.demonstration} -24 h45 l${-45 * options.demonstration} 24`,
          }}
          profile={options.tokens.sketch.shape}
          fill={options.tokens.color.surface}
          stroke={options.accent}
          strokeWidth={options.toolWidth}
        />
      ) : (
        <SketchedShape
          shape={{
            kind: "path",
            d: `M${options.toolX + 6} 317 h78 M${options.toolX + 12} 317 v8 M${options.toolX + 30} 317 v8 M${options.toolX + 48} 317 v8 M${options.toolX + 66} 317 v8`,
          }}
          profile={options.tokens.sketch.shape}
          stroke={options.accent}
          fill="none"
          strokeWidth={options.toolWidth}
        />
      )}
    </>
  );
}
