import { registerRoot } from "remotion";
import { StockCompositions } from "./stock/StockCompositions";

// Stock samples need no product assets, theme, or network-loaded fonts.
registerRoot(StockCompositions);
