import type { GraphicProps } from "../../../graphics-common/graphicCommon.types";
import type { Input } from "../CellNormalization.schema";
/** Complete cleanup props. The shared renderer owns the loop envelope. */
export type Props = GraphicProps & { input: Input };
