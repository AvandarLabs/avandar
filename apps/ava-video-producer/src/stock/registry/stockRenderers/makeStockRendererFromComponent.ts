import { createElement } from "react";
import { parseStockInput } from "../../contracts/parseStockInput/parseStockInput";
import type {
  StockInputByPreset,
  StockPresetId,
} from "../../contracts/StockContract.types";
import type { GraphicProps } from "../../graphics-common";
import type { ComponentType } from "react";

/** Retains each preset and renderer input relationship at registration. */
export function makeStockRendererFromComponent<Id extends StockPresetId>({
  preset,
  Renderer,
}: Readonly<{
  preset: Id;
  Renderer: ComponentType<GraphicProps & { input: StockInputByPreset[Id] }>;
}>): (props: GraphicProps, rawInput?: unknown) => React.JSX.Element {
  return (props, rawInput) =>
    createElement(Renderer, {
      ...props,
      input: parseStockInput({ preset: preset, rawInput: rawInput }),
    });
}
